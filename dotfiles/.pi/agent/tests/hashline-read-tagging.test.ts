import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import hashlineInit from "../extensions/hashline/index.ts";
import { computeFileHash } from "../extensions/hashline/hash.ts";
import { resolveAbsolutePath, stripSelector } from "../extensions/hashline/path-utils.ts";

let beforeAgentStartHandler: ((event: any, ctx: any) => Promise<any>) | null = null;
let sessionStartHandler: ((event: any, ctx: any) => void) | null = null;
let sessionShutdownHandler: ((event: any, ctx: any) => void) | null = null;
let toolResultHandler: ((event: any, ctx: any) => Promise<any>) | null = null;

const mockPi = {
  on(event: string, handler: any) {
    if (event === "before_agent_start") beforeAgentStartHandler = handler;
    if (event === "session_start") sessionStartHandler = handler;
    if (event === "session_shutdown") sessionShutdownHandler = handler;
    if (event === "tool_result") toolResultHandler = handler;
  },
};

hashlineInit(mockPi as any);

function createCtx(cwd: string, sessionId = "session-1") {
  return { cwd, sessionId };
}

describe("hashline path helpers", () => {
  it("stripSelector strips :N-M, :raw, and :conflicts", () => {
    expect(stripSelector("src/foo.ts:50-100")).toBe("src/foo.ts");
    expect(stripSelector("src/foo.ts:raw")).toBe("src/foo.ts");
    expect(stripSelector("src/foo.ts:conflicts")).toBe("src/foo.ts");
  });

  it("resolveAbsolutePath returns null for URLs and pi paths", () => {
    expect(resolveAbsolutePath("https://example.com/file.txt", "/tmp")).toBeNull();
    expect(resolveAbsolutePath("http://example.com/file.txt", "/tmp")).toBeNull();
    expect(resolveAbsolutePath("pi://session/file.txt", "/tmp")).toBeNull();
    expect(resolveAbsolutePath("", "/tmp")).toBeNull();
  });

  it("resolveAbsolutePath resolves relative paths correctly", () => {
    expect(resolveAbsolutePath("src/foo.ts", "/tmp/project")).toBe(path.resolve("/tmp/project", "src/foo.ts"));
  });

  it("resolveAbsolutePath expands ~", () => {
    expect(resolveAbsolutePath("~/test-file.txt", "/tmp/project")).toBe(path.join(os.homedir(), "test-file.txt"));
  });
});

describe("hashline read tagging", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-read-tagging-"));
    sessionStartHandler?.({}, createCtx(tempDir));
  });

  afterEach(() => {
    sessionShutdownHandler?.({}, createCtx(tempDir));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("prepends a ¶path#tag header to read results", async () => {
    const filePath = path.join(tempDir, "notes.txt");
    fs.writeFileSync(filePath, "alpha\r\nbeta\n", "utf8");

    const result = await toolResultHandler?.(
      {
        toolName: "read",
        input: { path: "notes.txt:1-20" },
        content: [{ type: "text", text: "alpha\nbeta\n" }],
        isError: false,
      },
      createCtx(tempDir),
    );

    const expectedTag = computeFileHash("alpha\r\nbeta\n");
    expect(result?.content?.[0]?.text).toBe(`¶notes.txt#${expectedTag}\nalpha\nbeta\n`);
  });

  it("does not tag files over 4MB", async () => {
    const filePath = path.join(tempDir, "large.txt");
    fs.writeFileSync(filePath, "a".repeat(4 * 1024 * 1024 + 1), "utf8");

    const result = await toolResultHandler?.(
      {
        toolName: "read",
        input: { path: "large.txt" },
        content: [{ type: "text", text: "placeholder" }],
        isError: false,
      },
      createCtx(tempDir),
    );

    expect(result).toBeUndefined();
  });

  it("does not tag errored read results", async () => {
    const filePath = path.join(tempDir, "notes.txt");
    fs.writeFileSync(filePath, "alpha\n", "utf8");

    const result = await toolResultHandler?.(
      {
        toolName: "read",
        input: { path: "notes.txt" },
        content: [{ type: "text", text: "alpha\n" }],
        isError: true,
      },
      createCtx(tempDir),
    );

    expect(result).toBeUndefined();
  });

  it("uses a header tag that matches computeFileHash", async () => {
    const filePath = path.join(tempDir, "nested", "file.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "one\rtwo\r\nthree\n", "utf8");

    const result = await toolResultHandler?.(
      {
        toolName: "read",
        input: { path: "nested/file.ts:raw" },
        content: [{ type: "text", text: "one\ntwo\nthree\n" }],
        isError: false,
      },
      createCtx(tempDir),
    );

    const header = result?.content?.[0]?.text?.split("\n", 1)[0];
    expect(header).toBe(`¶nested/file.ts#${computeFileHash("one\rtwo\r\nthree\n")}`);
  });

  it("appends the hashline grammar to the system prompt", async () => {
    const result = await beforeAgentStartHandler?.(
      {
        systemPrompt: ["base system prompt"],
      },
      createCtx(tempDir),
    );

    expect(result.systemPrompt).toHaveLength(2);
    expect(result.systemPrompt[1]).toContain("## Edit Tool: Hashline Mode");
    expect(result.systemPrompt[1]).toContain("¶path/to/file#XXXX");
  });
});
