import { describe, expect, it } from "vitest";
import { createSnapshotStore } from "../extensions/hashline/snapshot-store.ts";

describe("hashline snapshot store", () => {
  it("set stores and returns a tag", () => {
    const store = createSnapshotStore();
    const tag = store.set("/tmp/file.txt", "alpha");

    expect(tag).toMatch(/^[0-9A-F]{4}$/);
    expect(store.get("/tmp/file.txt")).toBe(tag);
  });

  it("get retrieves a stored tag", () => {
    const store = createSnapshotStore();
    const tag = store.set("/tmp/file.txt", "alpha");

    expect(store.get("/tmp/file.txt")).toBe(tag);
  });

  it("set changes the tag", () => {
    const store = createSnapshotStore();
    const before = store.set("/tmp/file.txt", "alpha");
    const after = store.set("/tmp/file.txt", "beta");

    expect(after).not.toBe(before);
    expect(store.get("/tmp/file.txt")).toBe(after);
  });

  it("invalidate removes an entry", () => {
    const store = createSnapshotStore();
    store.set("/tmp/file.txt", "alpha");

    store.invalidate("/tmp/file.txt");

    expect(store.get("/tmp/file.txt")).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it("evicts the least recently used entry when maxEntries is exceeded", () => {
    const store = createSnapshotStore(2);

    store.set("/tmp/one.txt", "one");
    store.set("/tmp/two.txt", "two");
    expect(store.get("/tmp/one.txt")).toBeDefined();
    store.set("/tmp/three.txt", "three");

    expect(store.size()).toBe(2);
    expect(store.get("/tmp/one.txt")).toBeDefined();
    expect(store.get("/tmp/two.txt")).toBeUndefined();
    expect(store.get("/tmp/three.txt")).toBeDefined();
  });

  it("keeps stores isolated per session instance", () => {
    const storeA = createSnapshotStore();
    const storeB = createSnapshotStore();

    const tagA = storeA.set("/tmp/shared.txt", "alpha");
    const tagB = storeB.set("/tmp/shared.txt", "beta");

    expect(tagA).not.toBe(tagB);
    expect(storeA.get("/tmp/shared.txt")).toBe(tagA);
    expect(storeB.get("/tmp/shared.txt")).toBe(tagB);
  });
});
