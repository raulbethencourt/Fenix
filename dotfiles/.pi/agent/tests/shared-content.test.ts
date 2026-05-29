import { describe, it, expect } from "vitest";
import { extractTextContent, extractAssistantText } from "../extensions/shared/content.ts";

describe("extractTextContent", () => {
  it("returns empty for falsy", () => {
    expect(extractTextContent(null)).toBe("");
    expect(extractTextContent(undefined)).toBe("");
    expect(extractTextContent("")).toBe("");
  });
  it("returns trimmed string content", () => {
    expect(extractTextContent("  hello  ")).toBe("hello");
  });
  it("extracts text from array of parts", () => {
    const content = [
      { type: "text", text: "hello" },
      { type: "image", url: "x" },
      { type: "text", text: "world" },
    ];
    expect(extractTextContent(content)).toBe("hello\nworld");
  });
  it("returns empty for non-string non-array", () => {
    expect(extractTextContent(42)).toBe("");
    expect(extractTextContent({})).toBe("");
  });
  it("filters out non-text parts", () => {
    const content = [{ type: "image" }, { type: "tool_use" }];
    expect(extractTextContent(content)).toBe("");
  });
  it("handles parts with missing fields", () => {
    const content = [null, undefined, { type: "text", text: "ok" }];
    expect(extractTextContent(content)).toBe("ok");
  });
});

describe("extractAssistantText", () => {
  it("extracts text from assistant message", () => {
    const msg = { role: "assistant", content: [{ type: "text", text: "response" }] };
    expect(extractAssistantText(msg)).toBe("response");
  });
  it("returns empty for user messages", () => {
    const msg = { role: "user", content: [{ type: "text", text: "question" }] };
    expect(extractAssistantText(msg)).toBe("");
  });
  it("returns empty for null/undefined", () => {
    expect(extractAssistantText(null)).toBe("");
    expect(extractAssistantText(undefined)).toBe("");
  });
  it("returns empty for non-object", () => {
    expect(extractAssistantText("string")).toBe("");
    expect(extractAssistantText(42)).toBe("");
  });
  it("returns empty when content is not array", () => {
    expect(extractAssistantText({ role: "assistant", content: "string" })).toBe("");
  });
  it("joins multiple text parts", () => {
    const msg = {
      role: "assistant",
      content: [{ type: "text", text: "line1" }, { type: "text", text: "line2" }],
    };
    expect(extractAssistantText(msg)).toBe("line1\nline2");
  });
});
