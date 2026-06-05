import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { Type } from "typebox";
import { SNAPSHOT_MAX_BYTES, normalizeToLF } from "./hash.ts";
import { parseHashlineInput, applyPatch, validatePatch } from "./patcher.ts";
import { createSnapshotStore, type SnapshotStore } from "./snapshot-store.ts";
import { extractPathsFromEditInput, resolveAbsolutePath, stripSelector } from "./path-utils.ts";

const MAX_SESSIONS = 50;
const HASHLINE_CUSTOM_EDIT_FLAG = "hashlineCustomEdit";
const stores = new Map<string, SnapshotStore>();

export const HASHLINE_SYSTEM_PROMPT_BLOCK = `## Edit Tool: Hashline Mode

When reading files, output will include a snapshot header on the first line:
  ¶path/to/file#XXXX

This header encodes the file path and a 4-character content hash (the "tag").

When editing files, you MUST:
1. Read the file first to obtain its current tag
2. Include the exact ¶path#tag header at the top of your edit input
3. Never fabricate or guess a tag — always use the tag from the most recent read

The edit tool will reject edits if the tag does not match the current file state,
protecting against stale edits on files that changed since you last read them.

Format for edit input:
¶path/to/file#XXXX
<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE`;

function resolveSessionId(ctx: any): string | undefined {
  const candidates: Array<[string, unknown]> = [
    ["ctx.sessionId", ctx?.sessionId],
    ["ctx.session.sessionId", ctx?.session?.sessionId],
    ["ctx.agentSession.sessionId", ctx?.agentSession?.sessionId],
    ["ctx.sessionManager.sessionId", ctx?.sessionManager?.sessionId],
    ["ctx.sessionManager.getSessionId()", ctx?.sessionManager?.getSessionId?.()],
    ["ctx.sessionManager.getSessionFile()", ctx?.sessionManager?.getSessionFile?.()],
    ["ctx.cwd", typeof ctx?.cwd === "string" ? `ephemeral:${ctx.cwd}` : undefined],
  ];

  for (const [_source, candidate] of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return undefined;
}

export function getStore(sessionId: string): SnapshotStore | undefined {
  return stores.get(sessionId);
}

async function refreshSnapshot(store: SnapshotStore, absolutePath: string): Promise<void> {
  const fileStat = await stat(absolutePath);
  if (fileStat.size > SNAPSHOT_MAX_BYTES) {
    store.invalidate(absolutePath);
    return;
  }

  const normalized = normalizeToLF(await readFile(absolutePath, "utf8"));
  store.set(absolutePath, normalized);
}

function getStoreForContext(ctx: any): SnapshotStore | undefined {
  const sessionId = resolveSessionId(ctx);
  if (!sessionId) {
    return undefined;
  }

  return getStore(sessionId);
}

function setStore(sessionId: string, store: SnapshotStore): void {
  if (stores.has(sessionId)) {
    stores.delete(sessionId);
  }
  stores.set(sessionId, store);

  while (stores.size > MAX_SESSIONS) {
    const oldestSessionId = stores.keys().next().value;
    if (typeof oldestSessionId !== "string") {
      break;
    }
    stores.delete(oldestSessionId);
  }
}

async function activateCustomEditTool(pi: ExtensionAPI): Promise<void> {
  if (typeof pi.getActiveTools !== "function" || typeof pi.setActiveTools !== "function") {
    return;
  }

  const nextActiveTools = pi.getActiveTools().filter((toolName) => toolName !== "edit");
  nextActiveTools.push("edit");
  await pi.setActiveTools(nextActiveTools);
}

function wasHandledByHashlineEditTool(event: any): boolean {
  return event?.[HASHLINE_CUSTOM_EDIT_FLAG] === true
    || event?.details?.[HASHLINE_CUSTOM_EDIT_FLAG] === true
    || event?.result?.[HASHLINE_CUSTOM_EDIT_FLAG] === true
    || event?.result?.details?.[HASHLINE_CUSTOM_EDIT_FLAG] === true;
}

function createEditTool() {
  return {
    name: "edit",
    label: "Edit",
    description: "Edit a file using hashline format. Requires ¶path#tag header from a recent read.",
    parameters: Type.Object({
      input: Type.String({ description: "The full hashline-formatted edit text." }),
    }),
    async execute(_toolCallId: string, params: { input: string }, _signal: AbortSignal | undefined, _onUpdate: unknown, ctx: any) {
      const cwd = ctx?.cwd ?? process.cwd();
      const parsed = parseHashlineInput(params.input, cwd);
      if (!Array.isArray(parsed)) {
        throw new Error(parsed.error);
      }

      const store = getStoreForContext(ctx) ?? createSnapshotStore();

      // Pre-flight all hash checks before the first write so stale tags fail without
      // touching any files. Disk-write atomicity is still not guaranteed if a later
      // write or post-validation patch step fails.
      for (const section of parsed) {
        const validationError = await validatePatch(section);
        if (validationError) {
          throw new Error(validationError.message);
        }
      }

      const results = [];
      for (const section of parsed) {
        const result = await applyPatch(section, store);
        if ("type" in result) {
          throw new Error(result.message);
        }
        results.push(result);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: results
              .map((result) => {
                const relativePath = path.relative(cwd, result.path) || result.path;
                return result.diff
                  ? `Updated ${relativePath}\n${result.diff}`
                  : `Updated ${relativePath}`;
              })
              .join("\n\n"),
          },
        ],
        [HASHLINE_CUSTOM_EDIT_FLAG]: true,
        details: {
          results,
          [HASHLINE_CUSTOM_EDIT_FLAG]: true,
        },
      };
    },
  };
}

export default function hashline(pi: ExtensionAPI) {
  pi.registerTool(createEditTool());

  pi.on("session_start", async (_event, ctx) => {
    const sessionId = resolveSessionId(ctx);
    if (sessionId) {
      setStore(sessionId, createSnapshotStore());
    }

    await activateCustomEditTool(pi);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    const sessionId = resolveSessionId(ctx);
    if (!sessionId) {
      return;
    }
    stores.delete(sessionId);
  });

  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt: `${event.systemPrompt}\n\n${HASHLINE_SYSTEM_PROMPT_BLOCK}`,
    };
  });

  pi.on("tool_result", async (event, ctx) => {
    const cwd = ctx?.cwd ?? process.cwd();
    const store = getStoreForContext(ctx);
    if (!store) {
      return undefined;
    }

    if (event.toolName === "write") {
      const rawPath = typeof event.input?.path === "string" ? event.input.path : "";
      const absolutePath = resolveAbsolutePath(stripSelector(rawPath), cwd);
      if (!absolutePath) {
        return undefined;
      }

      if (event.isError) {
        store.invalidate(absolutePath);
        return undefined;
      }

      try {
        await refreshSnapshot(store, absolutePath);
      } catch {
        return undefined;
      }

      return undefined;
    }

    if (event.toolName === "edit") {
      const editInput = typeof event.input === "string"
        ? event.input
        : typeof event.input?.input === "string"
          ? event.input.input
          : "";
      const absolutePaths = extractPathsFromEditInput(editInput, cwd);
      if (absolutePaths.length === 0) {
        return undefined;
      }

      if (event.isError) {
        for (const absolutePath of absolutePaths) {
          store.invalidate(absolutePath);
        }
        return undefined;
      }

      if (wasHandledByHashlineEditTool(event)) {
        return undefined;
      }

      await Promise.all(absolutePaths.map(async (absolutePath) => {
        try {
          await refreshSnapshot(store, absolutePath);
        } catch {
          return undefined;
        }
      }));
      return undefined;
    }

    if (event.toolName !== "read" || event.isError) {
      return undefined;
    }

    const rawPath = typeof event.input?.path === "string" ? event.input.path : "";
    const absolutePath = resolveAbsolutePath(stripSelector(rawPath), cwd);
    if (!absolutePath) {
      return undefined;
    }

    if (event.content.length === 0 || event.content[0]?.type !== "text") {
      return undefined;
    }

    try {
      const fileStat = await stat(absolutePath);
      if (fileStat.size > SNAPSHOT_MAX_BYTES) {
        return undefined;
      }

      const normalized = normalizeToLF(await readFile(absolutePath, "utf8"));
      const tag = store.set(absolutePath, normalized);
      const relativePath = path.relative(cwd, absolutePath);
      const [first, ...rest] = event.content;

      return {
        content: [
          {
            ...first,
            text: `¶${relativePath}#${tag}\n${first.text}`,
          },
          ...rest,
        ],
      };
    } catch {
      return undefined;
    }
  });
}
