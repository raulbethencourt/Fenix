import { describe, it, expect } from "vitest";
import { computeTokenBreakdown } from "../extensions/context-info/index.ts";

describe("computeTokenBreakdown", () => {
  it("anchors message tokens to reported usage when available", () => {
    const result = computeTokenBreakdown({
      contextWindow: 5000,
      usedTokens: 1000,
      systemPrompt: "You are a helpful coding assistant with strong defaults.",
      tools: [
        {
          name: "read",
          description: "Read a file from disk",
          parameters: { type: "object", properties: { path: { type: "string" } } },
        },
      ],
      skills: [{ name: "browser", description: "Use the browser when needed" }],
      compaction: { enabled: true, reserveTokens: 512 },
      branchEntries: [
        { type: "message", message: { role: "user", content: "hello" } },
        { type: "message", message: { role: "assistant", content: [{ type: "text", text: "world" }] } },
      ],
    });

    expect(result.usedTokens).toBe(1000);
    expect(result.bufferTokens).toBe(512);
    expect(result.freeTokens).toBe(3488);
    expect(result.messageTokens).toBe(
      result.usedTokens - result.systemPromptTokens - result.systemToolTokens - result.skillTokens,
    );
    expect(result.messageTokens).toBeGreaterThanOrEqual(0);
  });

  it("falls back to branch estimation when usage is unavailable", () => {
    const result = computeTokenBreakdown({
      contextWindow: 2000,
      systemPrompt: "System prompt text",
      tools: [],
      skills: [],
      compaction: { enabled: false, reserveTokens: 512 },
      branchEntries: [
        { type: "message", message: { role: "user", content: "abcd" } },
        {
          type: "message",
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "abcdefgh" },
              { type: "thinking", thinking: "abcd" },
            ],
          },
        },
      ],
    });

    expect(result.messageTokens).toBe(4);
    expect(result.usedTokens).toBe(result.systemPromptTokens + result.messageTokens);
    expect(result.bufferTokens).toBe(0);
    expect(result.freeTokens).toBe(2000 - result.usedTokens);
  });
});
