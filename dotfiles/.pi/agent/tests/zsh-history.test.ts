import { describe, it, expect } from "vitest";
import { parseZshHistory } from "../extensions/zsh-history.ts";

describe("parseZshHistory", () => {
  it("parses simple commands", () => {
    const raw = "ls\ncd /tmp\npwd";
    const result = parseZshHistory(raw);
    // Most recent first
    expect(result).toEqual(["pwd", "cd /tmp", "ls"]);
  });

  it("parses extended format", () => {
    const raw = ": 1234567890:0;ls\n: 1234567891:0;cd /tmp";
    const result = parseZshHistory(raw);
    expect(result).toEqual(["cd /tmp", "ls"]);
  });

  it("deduplicates commands", () => {
    const raw = "ls\ncd\nls";
    const result = parseZshHistory(raw);
    // Only one "ls", most recent position wins
    expect(result.filter(c => c === "ls").length).toBe(1);
  });

  it("handles backslash continuations", () => {
    const raw = ": 1234567890:0;echo \\\nhello";
    const result = parseZshHistory(raw);
    expect(result[0]).toContain("echo");
    expect(result[0]).toContain("hello");
  });

  it("returns empty for empty input", () => {
    expect(parseZshHistory("")).toEqual([]);
  });

  it("skips blank lines", () => {
    const raw = "ls\n\n\npwd";
    const result = parseZshHistory(raw);
    expect(result).toEqual(["pwd", "ls"]);
  });
});
