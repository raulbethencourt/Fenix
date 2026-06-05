import { describe, expect, it } from "vitest";
import {
  SNAPSHOT_MAX_BYTES,
  computeFileHash,
  normalizeToLF,
} from "../extensions/hashline/hash.ts";

describe("hashline hash helpers", () => {
  it("normalizes CRLF, CR, and LF to LF", () => {
    expect(normalizeToLF("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });

  it("returns 4 uppercase hex chars", () => {
    expect(computeFileHash("hello world")).toMatch(/^[0-9A-F]{4}$/);
  });

  it("returns the same hash for the same content", () => {
    expect(computeFileHash("same content")).toBe(computeFileHash("same content"));
  });

  it("returns different hashes for different content", () => {
    expect(computeFileHash("first")).not.toBe(computeFileHash("second"));
  });

  it("exposes a 4MB snapshot size cap", () => {
    expect(SNAPSHOT_MAX_BYTES).toBe(4 * 1024 * 1024);
  });
});
