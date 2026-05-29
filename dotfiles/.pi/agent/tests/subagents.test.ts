import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatTokens,
  formatDuration,
  formatToolPreview,
  truncLine,
  extractTextFromContent,
  extractToolArgsPreview,
  throttle,
  mapConcurrent,
} from "../extensions/subagents/index.ts";

describe("formatTokens", () => {
  it("formats small numbers", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(500)).toBe("500");
  });
  it("formats thousands", () => {
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(10000)).toBe("10.0k");
  });
  it("formats millions", () => {
    expect(formatTokens(1_000_000)).toBe("1.00M");
  });
});

describe("formatDuration", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(500)).toMatch(/\d+/);
  });
  it("formats seconds", () => {
    const result = formatDuration(5000);
    expect(result).toContain("5");
  });
  it("formats minutes", () => {
    const result = formatDuration(125000);
    expect(result).toContain("m");
  });
  it("handles zero", () => {
    expect(formatDuration(0)).toBeDefined();
  });
});

describe("formatToolPreview", () => {
  it("formats bash command", () => {
    expect(formatToolPreview("bash", { command: "ls -la" })).toContain("ls -la");
  });
  it("formats read with path", () => {
    expect(formatToolPreview("read", { path: "/tmp/file.txt" })).toContain("/tmp/file.txt");
  });
  it("formats write with path", () => {
    expect(formatToolPreview("write", { path: "/tmp/file.txt" })).toContain("/tmp/file.txt");
  });
  it("formats web_search with query", () => {
    expect(formatToolPreview("web_search", { query: "test query" })).toContain("test query");
  });
  it("formats unknown tools", () => {
    const result = formatToolPreview("custom_tool", { foo: "bar" });
    expect(result).toBeDefined();
  });
});

describe("truncLine", () => {
  it("returns short text unchanged", () => {
    expect(truncLine("hello", 20)).toBe("hello");
  });
  it("truncates long text", () => {
    const long = "a".repeat(100);
    const result = truncLine(long, 20);
    expect(result.length).toBeLessThanOrEqual(21); // may include …
    expect(result).toContain("…");
  });
});

describe("extractTextFromContent", () => {
  it("returns empty for falsy input", () => {
    expect(extractTextFromContent(null)).toBe("");
    expect(extractTextFromContent(undefined)).toBe("");
    expect(extractTextFromContent("")).toBe("");
  });
  it("returns string content directly", () => {
    expect(extractTextFromContent("hello")).toBe("hello");
  });
  it("extracts text from array content", () => {
    const content = [
      { type: "text", text: "part1" },
      { type: "image" },
      { type: "text", text: "part2" },
    ];
    expect(extractTextFromContent(content)).toBe("part1\npart2");
  });
  it("returns empty for non-string non-array", () => {
    expect(extractTextFromContent(42)).toBe("");
  });
});

describe("extractToolArgsPreview", () => {
  it("extracts command", () => {
    expect(extractToolArgsPreview({ command: "ls -la" })).toBe("ls -la");
  });
  it("extracts path", () => {
    expect(extractToolArgsPreview({ path: "/tmp/file" })).toBe("/tmp/file");
  });
  it("extracts query with quotes", () => {
    expect(extractToolArgsPreview({ query: "search term" })).toBe('"search term"');
  });
  it("extracts url", () => {
    expect(extractToolArgsPreview({ url: "http://example.com" })).toBe("http://example.com");
  });
  it("falls back to JSON for unknown args", () => {
    const result = extractToolArgsPreview({ foo: "bar" });
    expect(result).toContain("foo");
  });
  it("truncates long command", () => {
    const result = extractToolArgsPreview({ command: "x".repeat(200) });
    expect(result.length).toBeLessThanOrEqual(100);
  });
});

describe("throttle", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("calls function immediately on first invocation", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throttles subsequent calls", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("allows calls after throttle window", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    vi.advanceTimersByTime(101);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("mapConcurrent", () => {
  it("maps all items", async () => {
    const results = await mapConcurrent([1, 2, 3], 2, async (x) => x * 2);
    expect(results).toEqual([2, 4, 6]);
  });

  it("respects concurrency limit", async () => {
    let running = 0;
    let maxRunning = 0;
    const results = await mapConcurrent([1, 2, 3, 4], 2, async (x) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return x;
    });
    expect(maxRunning).toBeLessThanOrEqual(2);
    expect(results).toEqual([1, 2, 3, 4]);
  });

  it("handles empty array", async () => {
    const results = await mapConcurrent([], 4, async (x) => x);
    expect(results).toEqual([]);
  });

  it("preserves order", async () => {
    const results = await mapConcurrent([3, 1, 2], 3, async (x) => {
      await new Promise((r) => setTimeout(r, x * 10));
      return x;
    });
    expect(results).toEqual([3, 1, 2]);
  });
});
