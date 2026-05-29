import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  scoreComplexity,
  resolveModel,
  loadRouting,
} from "../extensions/subagents/routing.ts";

describe("scoreComplexity", () => {
  it("returns 'simple' for trivial tasks", () => {
    expect(scoreComplexity("fix a typo in README")).toBe("simple");
    expect(scoreComplexity("update version number")).toBe("simple");
  });

  it("returns 'complex' for risk keywords", () => {
    expect(scoreComplexity("update auth middleware")).toBe("complex");
    expect(scoreComplexity("fix security vulnerability in login")).toBe("complex");
    expect(scoreComplexity("add payment processing")).toBe("complex");
    expect(scoreComplexity("fix encryption key rotation")).toBe("complex");
    expect(scoreComplexity("database migration for users table")).toBe("complex");
  });

  it("returns 'complex' for multi-file tasks", () => {
    expect(
      scoreComplexity("edit src/a.ts src/b.ts src/c.ts src/d.ts src/e.ts src/f.ts to add logging"),
    ).toBe("complex");
  });

  it("returns 'complex' for complexity keywords", () => {
    expect(scoreComplexity("complex refactoring of the module system")).toBe("complex");
    expect(scoreComplexity("architectural redesign of the API layer")).toBe("complex");
    expect(scoreComplexity("non-trivial migration from v2 to v3")).toBe("complex");
  });

  it("returns 'standard' for moderate tasks", () => {
    expect(scoreComplexity("add error handling to the parser")).toBe("standard");
    expect(scoreComplexity("create a new utility function for date formatting")).toBe("standard");
  });
});

describe("resolveModel", () => {
  const routing = {
    worker: { simple: "github-copilot/gpt-5.4-mini", complex: "github-copilot/gpt-5.5" },
    scout: { complex: "github-copilot/gpt-5.4" },
  };

  it("returns override model for simple tier when routing exists", () => {
    const result = resolveModel("github-copilot/gpt-5.4", "worker", "fix typo in README", routing);
    expect(result.model).toBe("github-copilot/gpt-5.4-mini");
    expect(result.tier).toBe("simple");
  });

  it("returns override model for complex tier when routing exists", () => {
    const result = resolveModel(
      "github-copilot/gpt-5.4",
      "worker",
      "migrate auth across 8 files with breaking changes",
      routing,
    );
    expect(result.model).toBe("github-copilot/gpt-5.5");
    expect(result.tier).toBe("complex");
  });

  it("returns default model for standard tier", () => {
    const result = resolveModel("github-copilot/gpt-5.4", "worker", "add error handling to parser", routing);
    expect(result.model).toBe("github-copilot/gpt-5.4");
    expect(result.tier).toBe("standard");
  });

  it("returns default model when agent has no routing config", () => {
    const result = resolveModel(
      "github-copilot/claude-opus-4.7",
      "planner",
      "design new API architecture",
      routing,
    );
    expect(result.model).toBe("github-copilot/claude-opus-4.7");
    expect(result.tier).toBe("complex"); // still scores complexity, just no override
  });

  it("returns default model when routing is empty", () => {
    const result = resolveModel("github-copilot/gpt-5.4", "worker", "fix typo", {});
    expect(result.model).toBe("github-copilot/gpt-5.4");
  });

  it("uses default when tier exists but no override for that tier", () => {
    // scout only has complex override, not simple
    const result = resolveModel("github-copilot/gpt-5.4-mini", "scout", "fix typo", routing);
    expect(result.model).toBe("github-copilot/gpt-5.4-mini");
    expect(result.tier).toBe("simple");
  });
});

describe("loadRouting", () => {
  it("returns empty object when routing.json does not exist", () => {
    const result = loadRouting("/nonexistent/path");
    expect(result).toEqual({});
  });

  it("loads valid routing config", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "routing-test-"));
    const config = { worker: { simple: "model-a", complex: "model-b" } };

    try {
      fs.writeFileSync(path.join(tmpDir, "routing.json"), JSON.stringify(config));
      const result = loadRouting(tmpDir);
      expect(result).toEqual(config);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
