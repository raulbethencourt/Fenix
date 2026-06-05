import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import hashlineInit, { getStore } from "../extensions/hashline/index.ts";
import { computeFileHash, SNAPSHOT_MAX_BYTES } from "../extensions/hashline/hash.ts";
import { extractPathsFromEditInput } from "../extensions/hashline/path-utils.ts";

let sessionStartHandler: ((event: any, ctx: any) => void) | null = null;
let sessionShutdownHandler: ((event: any, ctx: any) => void) | null = null;
let toolResultHandler: ((event: any, ctx: any) => Promise<any>) | null = null;

const mockPi = {
  on(event: string, handler: any) {
    if (event === "session_start") sessionStartHandler = handler;
    if (event === "session_shutdown") sessionShutdownHandler = handler;
    if (event === "tool_result") toolResultHandler = handler;
  },
};

hashlineInit(mockPi as any);

function createCtx(cwd: string, sessionId = "retag-session") {
  return { cwd, sessionId };
}

describe("hashline write/edit retagging", () => {
  let tempDir: string;
  let ctx: ReturnType<typeof createCtx>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-write-retagging-"));
    ctx = createCtx(tempDir, `retag-${Date.now()}-${Math.random()}`);
    sessionStartHandler?.({}, ctx);
  });

  afterEach(() => {
    sessionShutdownHandler?.({}, ctx);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("updates the snapshot store after a successful write", async () => {
    const filePath = path.join(tempDir, "notes.txt");
    fs.writeFileSync(filePath, "alpha\n", "utf8");

    const store = getStore(ctx.sessionId);
    expect(store).toBeDefined();
    store!.set(filePath, "alpha\n");

    fs.writeFileSync(filePath, "beta\r\ngamma\n", "utf8");

    await toolResultHandler?.(
      {
        toolName: "write",
        input: { path: "notes.txt" },
        isError: false,
      },
      ctx,
    );

    expect(store!.get(filePath)).toBe(computeFileHash("beta\r\ngamma\n"));
  });

  it("invalidates the snapshot store after a failed write", async () => {
    const filePath = path.join(tempDir, "notes.txt");
    fs.writeFileSync(filePath, "alpha\n", "utf8");

    const store = getStore(ctx.sessionId);
    expect(store).toBeDefined();
    store!.set(filePath, "alpha\n");

    await toolResultHandler?.(
      {
        toolName: "write",
        input: { path: "notes.txt" },
        isError: true,
      },
      ctx,
    );

    expect(store!.get(filePath)).toBeUndefined();
  });

  it("skips refreshing snapshots for files over SNAPSHOT_MAX_BYTES", async () => {
    const filePath = path.join(tempDir, "notes.txt");
    fs.writeFileSync(filePath, "alpha\n", "utf8");

    const store = getStore(ctx.sessionId);
    expect(store).toBeDefined();
    store!.set(filePath, "alpha\n");

    fs.writeFileSync(filePath, "a".repeat(SNAPSHOT_MAX_BYTES + 1), "utf8");

    await toolResultHandler?.(
      {
        toolName: "write",
        input: { path: "notes.txt" },
        isError: false,
      },
      ctx,
    );

    expect(store!.get(filePath)).toBeUndefined();
  });

  it("updates all referenced snapshots after a successful edit", async () => {
    const firstPath = path.join(tempDir, "one.txt");
    const secondPath = path.join(tempDir, "two.txt");
    fs.writeFileSync(firstPath, "one\n", "utf8");
    fs.writeFileSync(secondPath, "two\n", "utf8");

    const store = getStore(ctx.sessionId);
    expect(store).toBeDefined();
    store!.set(firstPath, "one\n");
    store!.set(secondPath, "two\n");

    fs.writeFileSync(firstPath, "one updated\r\n", "utf8");
    fs.writeFileSync(secondPath, "two updated\n", "utf8");

    await toolResultHandler?.(
      {
        toolName: "edit",
        input: "¶one.txt#AAAA\n<<<<<<< SEARCH\none\n=======\none updated\n>>>>>>> REPLACE\n¶two.txt#BBBB\n<<<<<<< SEARCH\ntwo\n=======\ntwo updated\n>>>>>>> REPLACE",
        isError: false,
      },
      ctx,
    );

    expect(store!.get(firstPath)).toBe(computeFileHash("one updated\r\n"));
    expect(store!.get(secondPath)).toBe(computeFileHash("two updated\n"));
  });

  it("skips redundant refresh after a successful custom hashline edit", async () => {
    const filePath = path.join(tempDir, "notes.txt");
    fs.writeFileSync(filePath, "beta\n", "utf8");

    const store = getStore(ctx.sessionId);
    expect(store).toBeDefined();
    store!.set(filePath, "beta\n");

    fs.writeFileSync(filePath, "gamma\n", "utf8");

    await toolResultHandler?.(
      {
        toolName: "edit",
        input: "¶notes.txt#AAAA\n<<<<<<< SEARCH\nalpha\n=======\nbeta\n>>>>>>> REPLACE",
        isError: false,
        result: {
          details: {
            hashlineCustomEdit: true,
          },
        },
      },
      ctx,
    );

    expect(store!.get(filePath)).toBe(computeFileHash("beta\n"));
  });

  it("invalidates all referenced snapshots after a failed edit", async () => {
    const firstPath = path.join(tempDir, "one.txt");
    const secondPath = path.join(tempDir, "two.txt");
    fs.writeFileSync(firstPath, "one\n", "utf8");
    fs.writeFileSync(secondPath, "two\n", "utf8");

    const store = getStore(ctx.sessionId);
    expect(store).toBeDefined();
    store!.set(firstPath, "one\n");
    store!.set(secondPath, "two\n");

    await toolResultHandler?.(
      {
        toolName: "edit",
        input: "¶one.txt#AAAA\n<<<<<<< SEARCH\none\n=======\none updated\n>>>>>>> REPLACE\n¶two.txt#BBBB\n<<<<<<< SEARCH\ntwo\n=======\ntwo updated\n>>>>>>> REPLACE",
        isError: true,
      },
      ctx,
    );

    expect(store!.get(firstPath)).toBeUndefined();
    expect(store!.get(secondPath)).toBeUndefined();
  });
});

describe("hashline session store lifecycle", () => {
  it("caps the module-level store map at 50 sessions", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-session-cap-"));
    const sessionIds = Array.from({ length: 51 }, (_, index) => `session-cap-${Date.now()}-${index}`);

    try {
      for (const sessionId of sessionIds) {
        sessionStartHandler?.({}, createCtx(tempDir, sessionId));
      }

      expect(getStore(sessionIds[0])).toBeUndefined();
      expect(getStore(sessionIds[1])).toBeDefined();
      expect(getStore(sessionIds[50])).toBeDefined();
    } finally {
      for (const sessionId of sessionIds) {
        sessionShutdownHandler?.({}, createCtx(tempDir, sessionId));
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("extractPathsFromEditInput", () => {
  const cwd = "/tmp/project";

  it("parses single and multiple hashline headers", () => {
    expect(extractPathsFromEditInput("¶src/one.ts#AAAA", cwd)).toEqual([
      path.resolve(cwd, "src/one.ts"),
    ]);

    expect(
      extractPathsFromEditInput("¶src/one.ts#AAAA\ntext\n¶src/two.ts#BBBB\n¶src/one.ts#CCCC", cwd),
    ).toEqual([
      path.resolve(cwd, "src/one.ts"),
      path.resolve(cwd, "src/two.ts"),
    ]);
  });

  it("ignores non-hashline lines", () => {
    expect(
      extractPathsFromEditInput("src/one.ts#AAAA\n<<<<<<< SEARCH\none updated\nplain text", cwd),
    ).toEqual([]);
  });
});
