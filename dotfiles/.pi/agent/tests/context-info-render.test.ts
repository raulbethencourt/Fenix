import { describe, expect, it } from "vitest";
import { computeTokenBreakdown, renderContextUsage } from "../extensions/context-info/index.ts";

const plainTheme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
};

describe("renderContextUsage", () => {
  it("renders the visual grid with legend details", () => {
    const breakdown = computeTokenBreakdown({
      model: { provider: "openai", id: "gpt-4.1", name: "GPT-4.1", contextWindow: 5000 },
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

    const output = renderContextUsage(breakdown, plainTheme);

    expect(output).toContain("⛁");
    expect(output).toContain("⛃");
    expect(output).toContain("⛶");
    expect(output).toContain("⛝");
    expect(output).toContain("GPT-4.1");
    expect(output).toContain("System prompt:");
    expect(output).toContain("System tools:");
    expect(output).toContain("Skills:");
    expect(output).toContain("Messages:");
    expect(output).toContain("Free:");
    expect(output).toContain("Buffer:");
    expect(output.split("\n").length).toBeGreaterThanOrEqual(10);
  });

  it("returns the oh-my-pi style breakdown shape", () => {
    const breakdown = computeTokenBreakdown({
      model: { provider: "anthropic", id: "claude-sonnet-4", contextWindow: 2000 },
      contextWindow: 2000,
      systemPrompt: "System prompt text",
      tools: [],
      skills: [],
      branchEntries: [
        { type: "message", message: { role: "user", content: "abcd" } },
        { type: "message", message: { role: "assistant", content: [{ type: "text", text: "abcdefgh" }] } },
      ],
      compaction: { enabled: false, reserveTokens: 512 },
    });

    expect(breakdown.model?.provider).toBe("anthropic");
    expect(breakdown.contextWindow).toBe(2000);
    expect(breakdown.autoCompactBufferTokens).toBe(0);
    expect(breakdown.categories).toEqual([
      expect.objectContaining({ id: "systemPrompt", label: "System prompt", color: "accent", glyph: "⛁" }),
      expect.objectContaining({ id: "systemTools", label: "System tools", color: "warning", glyph: "⛁" }),
      expect.objectContaining({ id: "skills", label: "Skills", color: "success", glyph: "⛁" }),
      expect.objectContaining({ id: "messages", label: "Messages", color: "userMessageText", glyph: "⛃" }),
    ]);
  });
});
