import { describe, it, expect } from "vitest";
import { isBorderLine } from "../extensions/powerline.ts";

describe("isBorderLine", () => {
  it("returns true for plain border", () => {
    expect(isBorderLine("────────────")).toBe(true);
  });
  it("returns true for ANSI-styled border", () => {
    expect(isBorderLine("\x1b[36m────────\x1b[0m")).toBe(true);
  });
  it("returns false for text", () => {
    expect(isBorderLine("hello world")).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(isBorderLine("")).toBe(false);
  });
  it("returns false for mixed content", () => {
    expect(isBorderLine("── text ──")).toBe(false);
  });
});
