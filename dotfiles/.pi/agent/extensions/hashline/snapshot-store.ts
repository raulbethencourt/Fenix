import { computeFileHash } from "./hash.ts";

export interface SnapshotStore {
  set(absolutePath: string, normalizedText: string): string;
  get(absolutePath: string): string | undefined;
  invalidate(absolutePath: string): void;
  size(): number;
}

export function createSnapshotStore(maxEntries = 200): SnapshotStore {
  const entries = new Map<string, string>();
  const limit = Math.max(0, maxEntries);

  const touch = (absolutePath: string, tag: string): void => {
    if (entries.has(absolutePath)) {
      entries.delete(absolutePath);
    }
    entries.set(absolutePath, tag);

    while (entries.size > limit) {
      const oldestKey = entries.keys().next().value;
      if (typeof oldestKey !== "string") {
        break;
      }
      entries.delete(oldestKey);
    }
  };

  const storeHash = (absolutePath: string, normalizedText: string): string => {
    const tag = computeFileHash(normalizedText);
    touch(absolutePath, tag);
    return tag;
  };

  return {
    set(absolutePath: string, normalizedText: string): string {
      return storeHash(absolutePath, normalizedText);
    },

    get(absolutePath: string): string | undefined {
      const tag = entries.get(absolutePath);
      if (!tag) {
        return undefined;
      }
      touch(absolutePath, tag);
      return tag;
    },

    invalidate(absolutePath: string): void {
      entries.delete(absolutePath);
    },

    size(): number {
      return entries.size;
    },
  };
}
