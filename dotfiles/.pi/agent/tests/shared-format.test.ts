import { describe, it, expect } from "vitest";
import { formatTokens, formatDuration } from "../extensions/shared/format.ts";

describe("formatTokens", () => {
  it("formats small numbers as-is", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });
  it("formats thousands with k", () => {
    expect(formatTokens(1000)).toBe("1.0k");
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(10000)).toBe("10.0k");
    expect(formatTokens(999999)).toBe("1000.0k");
  });
  it("formats millions with M", () => {
    expect(formatTokens(1_000_000)).toBe("1.00M");
    expect(formatTokens(2_500_000)).toBe("2.50M");
  });
});

describe("formatDuration", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(999)).toBe("999ms");
  });
  it("formats seconds", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(5000)).toBe("5.0s");
    expect(formatDuration(59999)).toBe("60.0s");
  });
  it("formats minutes and seconds", () => {
    expect(formatDuration(60000)).toBe("1m0s");
    expect(formatDuration(125000)).toBe("2m5s");
    expect(formatDuration(3661000)).toBe("61m1s");
  });
});
