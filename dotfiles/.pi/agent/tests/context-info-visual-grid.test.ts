import { describe, expect, it } from "vitest";
import { computeTokenBreakdown, renderContextUsage } from "../extensions/context-info/index.ts";

describe("context info visual grid", () => {
  it("returns the visual category set for /context", () => {
    const breakdown = computeTokenBreakdown({
      model: { provider: "openai", id: "gpt-4.1", contextWindow: 5000 },
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
      includeVisualCategories: true,
    });

    expect(breakdown.categories).toEqual([
      expect.objectContaining({ id: "systemPrompt", label: "System prompt", color: "accent", glyph: "⛁" }),
      expect.objectContaining({ id: "systemTools", label: "System tools", color: "warning", glyph: "⛁" }),
      expect.objectContaining({ id: "skills", label: "Skills", color: "success", glyph: "⛁" }),
      expect.objectContaining({ id: "messages", label: "Messages", color: "text", glyph: "⛃" }),
      expect.objectContaining({ id: "buffer", label: "Buffer", color: "warning", glyph: "⛝" }),
      expect.objectContaining({ id: "free", label: "Free", color: "dim", glyph: "⛶" }),
    ]);
  });

  it("renders message, free, and buffer cells with the visual colors", () => {
    const calls: Array<{ color: string; text: string }> = [];
    const theme = {
      fg: (color: string, text: string) => {
        calls.push({ color, text });
        return text;
      },
      bold: (text: string) => text,
    };

    const breakdown = computeTokenBreakdown({
      model: { provider: "openai", id: "gpt-4.1", contextWindow: 5000 },
      contextWindow: 5000,
      usedTokens: 1000,
      systemPrompt: "You are a helpful coding assistant with strong defaults.",
      tools: [],
      skills: [],
      compaction: { enabled: true, reserveTokens: 512 },
    });

    renderContextUsage(breakdown, theme);

    expect(calls.some((call) => call.color === "text" && call.text === "⛃")).toBe(true);
    expect(calls.some((call) => call.color === "warning" && call.text === "⛝")).toBe(true);
    expect(calls.some((call) => call.color === "dim" && call.text === "⛶")).toBe(true);
  });
});
