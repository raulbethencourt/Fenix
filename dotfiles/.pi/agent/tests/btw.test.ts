import { describe, it, expect } from "vitest";
import {
  stripDynamicSystemPromptFooter,
  extractText,
  extractEventAssistantText,
  formatThread,
} from "../extensions/btw.ts";

describe("stripDynamicSystemPromptFooter", () => {
  it("removes date and cwd footer", () => {
    const prompt = "You are helpful.\nCurrent date and time: 2025-01-01\nCurrent working directory: /tmp";
    expect(stripDynamicSystemPromptFooter(prompt)).toBe("You are helpful.");
  });
  it("removes only date footer", () => {
    const prompt = "System prompt.\nCurrent date and time: 2025-01-01";
    expect(stripDynamicSystemPromptFooter(prompt)).toBe("System prompt.");
  });
  it("leaves prompt unchanged without footer", () => {
    const prompt = "You are helpful.";
    expect(stripDynamicSystemPromptFooter(prompt)).toBe("You are helpful.");
  });
});

describe("extractText", () => {
  it("extracts text from content parts", () => {
    const parts = [
      { type: "text", text: "hello" },
      { type: "image" },
      { type: "text", text: "world" },
    ] as any;
    expect(extractText(parts)).toBe("hello\nworld");
  });
  it("returns empty for no text parts", () => {
    expect(extractText([{ type: "image" }] as any)).toBe("");
  });
  it("returns empty for empty array", () => {
    expect(extractText([] as any)).toBe("");
  });
});

describe("extractEventAssistantText", () => {
  it("extracts text from assistant message", () => {
    const msg = { role: "assistant", content: [{ type: "text", text: "response" }] };
    expect(extractEventAssistantText(msg)).toBe("response");
  });
  it("returns empty for user messages", () => {
    const msg = { role: "user", content: [{ type: "text", text: "question" }] };
    expect(extractEventAssistantText(msg)).toBe("");
  });
  it("returns empty for null", () => {
    expect(extractEventAssistantText(null)).toBe("");
  });
  it("returns empty for non-array content", () => {
    expect(extractEventAssistantText({ role: "assistant", content: "string" })).toBe("");
  });
});

describe("formatThread", () => {
  it("formats thread items", () => {
    const thread = [
      { question: "What is X?", answer: "X is Y.", timestamp: 0, provider: "p", model: "m", thinkingLevel: "off" as const },
    ];
    const result = formatThread(thread);
    expect(result).toContain("User: What is X?");
    expect(result).toContain("Assistant: X is Y.");
  });
  it("separates multiple items with ---", () => {
    const thread = [
      { question: "Q1", answer: "A1", timestamp: 0, provider: "p", model: "m", thinkingLevel: "off" as const },
      { question: "Q2", answer: "A2", timestamp: 0, provider: "p", model: "m", thinkingLevel: "off" as const },
    ];
    const result = formatThread(thread);
    expect(result).toContain("---");
  });
});
