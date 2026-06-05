import { createHash } from "node:crypto";

export const SNAPSHOT_MAX_BYTES = 4 * 1024 * 1024;

export function normalizeToLF(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function computeFileHash(text: string): string {
  const normalized = normalizeToLF(text);
  return createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 4).toUpperCase();
}
