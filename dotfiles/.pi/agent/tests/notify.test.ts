import { describe, it, expect } from "vitest";
import { isTextPart, extractLastAssistantText, formatNotification } from "../extensions/notify.ts";

describe("isTextPart", () => {
  it("returns true for text parts", () => {
    expect(isTextPart({ type: "text", text: "hello" })).toBe(true);
  });
  it("returns false for non-text parts", () => {
    expect(isTextPart({ type: "image", url: "x" })).toBe(false);
  });
  it("returns false for null", () => {
    expect(isTextPart(null)).toBe(false);
  });
  it("returns false for undefined", () => {
    expect(isTextPart(undefined)).toBe(false);
  });
  it("returns false for strings", () => {
    expect(isTextPart("hello")).toBe(false);
  });
  it("returns false for objects without type", () => {
    expect(isTextPart({ text: "hello" })).toBe(false);
  });
});

describe("extractLastAssistantText", () => {
  it("extracts text from last assistant message with string content", () => {
    const messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello there" },
    ];
    expect(extractLastAssistantText(messages)).toBe("hello there");
  });
  it("extracts text from last assistant message with array content", () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "part1" }, { type: "text", text: "part2" }] },
    ];
    expect(extractLastAssistantText(messages)).toBe("part1\npart2");
  });
  it("returns null when no assistant messages", () => {
    const messages = [{ role: "user", content: "hi" }];
    expect(extractLastAssistantText(messages)).toBeNull();
  });
  it("returns null for empty messages", () => {
    expect(extractLastAssistantText([])).toBeNull();
  });
  it("skips non-text parts in array content", () => {
    const messages = [
      { role: "assistant", content: [{ type: "image" }, { type: "text", text: "hello" }] },
    ];
    expect(extractLastAssistantText(messages)).toBe("hello");
  });
  it("returns last assistant, not first", () => {
    const messages = [
      { role: "assistant", content: "first" },
      { role: "user", content: "question" },
      { role: "assistant", content: "second" },
    ];
    expect(extractLastAssistantText(messages)).toBe("second");
  });
  it("returns null for empty string content", () => {
    const messages = [{ role: "assistant", content: "   " }];
    expect(extractLastAssistantText(messages)).toBeNull();
  });
});

describe("formatNotification", () => {
  it("returns default title for null text", () => {
    const result = formatNotification(null);
    expect(result.title).toBe("Ready for input");
    expect(result.body).toBe("");
  });
  it("returns default for empty text", () => {
    const result = formatNotification("");
    expect(result.title).toBe("Ready for input");
  });
  it("truncates long text to 200 chars", () => {
    const long = "a".repeat(300);
    const result = formatNotification(long);
    expect(result.body.length).toBeLessThanOrEqual(200);
    expect(result.body.endsWith("…")).toBe(true);
  });
  it("sets title to π for non-empty text", () => {
    const result = formatNotification("hello world");
    expect(result.title).toBe("π");
  });
});
