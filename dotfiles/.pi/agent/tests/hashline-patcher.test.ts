import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import hashlineInit from "../extensions/hashline/index.ts";
import { computeFileHash } from "../extensions/hashline/hash.ts";
import { parseHashlineInput, applyPatch } from "../extensions/hashline/patcher.ts";
import { createSnapshotStore } from "../extensions/hashline/snapshot-store.ts";

function makeHashlineSection(filePath: string, tag: string, search: string, replace: string): string {
  return `¶${filePath}#${tag}\n<<<<<<< SEARCH\n${search}\n=======\n${replace}\n>>>>>>> REPLACE`;
}

function createEditToolHarness() {
  let sessionStartHandler: ((event: any, ctx: any) => void) | null = null;
  let sessionShutdownHandler: ((event: any, ctx: any) => void) | null = null;
  let editTool: { execute: (...args: any[]) => Promise<any> } | null = null;

  const mockPi = {
    on(event: string, handler: any) {
      if (event === "session_start") {
        sessionStartHandler = handler;
      }
      if (event === "session_shutdown") {
        sessionShutdownHandler = handler;
      }
    },
    registerTool(tool: { name: string; execute: (...args: any[]) => Promise<any> }) {
      if (tool.name === "edit") {
        editTool = tool;
      }
    },
    getActiveTools() {
      return ["read", "write", "edit"];
    },
    setActiveTools() {
      return undefined;
    },
  };

  hashlineInit(mockPi as any);

  return {
    getEditTool() {
      return editTool;
    },
    startSession(ctx: any) {
      sessionStartHandler?.({}, ctx);
    },
    endSession(ctx: any) {
      sessionShutdownHandler?.({}, ctx);
    },
  };
}

describe("hashline patcher", () => {
  it("parseHashlineInput parses a single section correctly", () => {
    const cwd = "/tmp/project";
    const input = makeHashlineSection("src/example.ts", "ABCD", "old line", "new line");

    const result = parseHashlineInput(input, cwd);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([
      {
        path: path.resolve(cwd, "src/example.ts"),
        tag: "ABCD",
        search: "old line",
        replace: "new line",
      },
    ]);
  });

  it("parseHashlineInput parses multiple sections", () => {
    const cwd = "/tmp/project";
    const input = [
      makeHashlineSection("src/one.ts", "AAAA", "one", "ONE"),
      makeHashlineSection("src/two.ts", "BBBB", "two", "TWO"),
    ].join("\n");

    const result = parseHashlineInput(input, cwd);

    expect(result).toEqual([
      {
        path: path.resolve(cwd, "src/one.ts"),
        tag: "AAAA",
        search: "one",
        replace: "ONE",
      },
      {
        path: path.resolve(cwd, "src/two.ts"),
        tag: "BBBB",
        search: "two",
        replace: "TWO",
      },
    ]);
  });

  it("parseHashlineInput returns error for missing ¶ header", () => {
    const result = parseHashlineInput(
      "<<<<<<< SEARCH\nold\n=======\nnew\n>>>>>>> REPLACE",
      "/tmp/project",
    );

    expect(result).toEqual({ error: expect.stringContaining("¶") });
  });

  describe("applyPatch", () => {
    let tempDir: string;

    afterEach(() => {
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("succeeds when tag matches and search is found", async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-patcher-"));
      const filePath = path.join(tempDir, "notes.txt");
      fs.writeFileSync(filePath, "alpha\nbeta\nomega\n", "utf8");

      const store = createSnapshotStore();
      const result = await applyPatch(
        {
          path: filePath,
          tag: computeFileHash("alpha\nbeta\nomega\n"),
          search: "beta",
          replace: "gamma",
        },
        store,
      );

      expect(result).toEqual({
        path: filePath,
        diff: "- beta\n+ gamma",
      });
      expect(fs.readFileSync(filePath, "utf8")).toBe("alpha\ngamma\nomega\n");
    });

    it("returns mismatch error when tag is stale", async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-patcher-"));
      const filePath = path.join(tempDir, "notes.txt");
      fs.writeFileSync(filePath, "current\ncontent\n", "utf8");

      const result = await applyPatch(
        {
          path: filePath,
          tag: "DEAD",
          search: "current",
          replace: "updated",
        },
        createSnapshotStore(),
      );

      expect(result).toEqual({
        type: "mismatch",
        path: filePath,
        message: expect.stringContaining("Tag mismatch for"),
      });
    });

    it("rejects an empty SEARCH block", async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-patcher-"));
      const filePath = path.join(tempDir, "notes.txt");
      fs.writeFileSync(filePath, "alpha\nbeta\n", "utf8");

      const result = await applyPatch(
        {
          path: filePath,
          tag: computeFileHash("alpha\nbeta\n"),
          search: "  \n\t",
          replace: "gamma",
        },
        createSnapshotStore(),
      );

      expect(result).toEqual({
        type: "parse_error",
        message: "SEARCH block cannot be empty.",
      });
    });

    it("returns not_found error when search block is absent", async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-patcher-"));
      const filePath = path.join(tempDir, "notes.txt");
      fs.writeFileSync(filePath, "alpha\nbeta\n", "utf8");

      const result = await applyPatch(
        {
          path: filePath,
          tag: computeFileHash("alpha\nbeta\n"),
          search: "missing",
          replace: "gamma",
        },
        createSnapshotStore(),
      );

      expect(result).toEqual({
        type: "not_found",
        path: filePath,
        message: "Search block not found in file. Please re-read the file.",
      });
    });

    it("updates the snapshot store on success", async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-patcher-"));
      const filePath = path.join(tempDir, "notes.txt");
      fs.writeFileSync(filePath, "alpha\nbeta\n", "utf8");

      const store = createSnapshotStore();
      await applyPatch(
        {
          path: filePath,
          tag: computeFileHash("alpha\nbeta\n"),
          search: "beta",
          replace: "gamma",
        },
        store,
      );

      expect(store.get(filePath)).toBe(computeFileHash("alpha\ngamma\n"));
    });

    it("diff output shows removed and added lines correctly", async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-patcher-"));
      const filePath = path.join(tempDir, "notes.txt");
      fs.writeFileSync(filePath, "alpha\nbeta\nomega\n", "utf8");

      const result = await applyPatch(
        {
          path: filePath,
          tag: computeFileHash("alpha\nbeta\nomega\n"),
          search: "beta",
          replace: "gamma\ndelta",
        },
        createSnapshotStore(),
      );

      expect(result).toEqual({
        path: filePath,
        diff: "- beta\n+ gamma\n+ delta",
      });
    });

    it("adds a warning when search text matches multiple occurrences", async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-patcher-"));
      const filePath = path.join(tempDir, "notes.txt");
      fs.writeFileSync(filePath, "beta\nalpha\nbeta\n", "utf8");

      const result = await applyPatch(
        {
          path: filePath,
          tag: computeFileHash("beta\nalpha\nbeta\n"),
          search: "beta",
          replace: "gamma",
        },
        createSnapshotStore(),
      );

      expect(result).toEqual({
        path: filePath,
        diff: "- beta\n+ gamma\n⚠ Search text matched 2 occurrences — only the first was replaced.",
      });
      expect(fs.readFileSync(filePath, "utf8")).toBe("gamma\nalpha\nbeta\n");
    });
  });
});

describe("hashline custom edit tool registration", () => {
  it("registers a custom edit tool and keeps edit active on session start", () => {
    let sessionStartHandler: ((event: any, ctx: any) => void) | null = null;
    const registeredTools: Array<{ name: string; description: string }> = [];
    const activeToolSets: string[][] = [];

    const mockPi = {
      on(event: string, handler: any) {
        if (event === "session_start") {
          sessionStartHandler = handler;
        }
      },
      registerTool(tool: { name: string; description: string }) {
        registeredTools.push({ name: tool.name, description: tool.description });
      },
      getActiveTools() {
        return ["read", "write", "edit"];
      },
      setActiveTools(toolNames: string[]) {
        activeToolSets.push(toolNames);
      },
    };

    hashlineInit(mockPi as any);
    sessionStartHandler?.({}, { cwd: "/tmp/project", sessionId: "session-1" });

    expect(registeredTools).toContainEqual({
      name: "edit",
      description: "Edit a file using hashline format. Requires ¶path#tag header from a recent read.",
    });
    expect(activeToolSets).toContainEqual(["read", "write", "edit"]);
  });

  it("pre-flights all sections before writing so stale later tags do not partially apply", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-preflight-"));
    const ctx = { cwd: tempDir, sessionId: `session-${Date.now()}-stale` };
    const firstPath = path.join(tempDir, "one.txt");
    const secondPath = path.join(tempDir, "two.txt");
    const harness = createEditToolHarness();

    try {
      fs.writeFileSync(firstPath, "one\n", "utf8");
      fs.writeFileSync(secondPath, "two\n", "utf8");
      harness.startSession(ctx);

      const editTool = harness.getEditTool();
      expect(editTool).toBeTruthy();

      const input = [
        makeHashlineSection("one.txt", computeFileHash("one\n"), "one", "ONE"),
        makeHashlineSection("two.txt", "DEAD", "two", "TWO"),
      ].join("\n");

      await expect(editTool!.execute("tool-call", { input }, undefined, undefined, ctx)).rejects.toThrow(
        "Tag mismatch for",
      );

      expect(fs.readFileSync(firstPath, "utf8")).toBe("one\n");
      expect(fs.readFileSync(secondPath, "utf8")).toBe("two\n");
    } finally {
      harness.endSession(ctx);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes all files after pre-flight succeeds for every section", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-preflight-"));
    const ctx = { cwd: tempDir, sessionId: `session-${Date.now()}-valid` };
    const firstPath = path.join(tempDir, "one.txt");
    const secondPath = path.join(tempDir, "two.txt");
    const harness = createEditToolHarness();

    try {
      fs.writeFileSync(firstPath, "one\n", "utf8");
      fs.writeFileSync(secondPath, "two\n", "utf8");
      harness.startSession(ctx);

      const editTool = harness.getEditTool();
      expect(editTool).toBeTruthy();

      const input = [
        makeHashlineSection("one.txt", computeFileHash("one\n"), "one", "ONE"),
        makeHashlineSection("two.txt", computeFileHash("two\n"), "two", "TWO"),
      ].join("\n");

      const result = await editTool!.execute("tool-call", { input }, undefined, undefined, ctx);

      expect(fs.readFileSync(firstPath, "utf8")).toBe("ONE\n");
      expect(fs.readFileSync(secondPath, "utf8")).toBe("TWO\n");
      expect(result.content[0].text).toContain("Updated one.txt");
      expect(result.content[0].text).toContain("Updated two.txt");
    } finally {
      harness.endSession(ctx);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
