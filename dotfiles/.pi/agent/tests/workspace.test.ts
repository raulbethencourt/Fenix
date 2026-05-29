import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import * as path from "node:path";

// We'll test the helpers and execute logic by importing the module
// and capturing what registerTool receives
let registeredTool: any = null;

// Mock ExtensionAPI
const mockPi = {
	registerTool(toolDef: any) {
		registeredTool = toolDef;
	},
};

// Import and initialize
import workspaceInit from "../extensions/subagents/tools/workspace.ts";
workspaceInit(mockPi as any);

const cwd = process.cwd();
const hash = crypto.createHash("md5").update(cwd).digest("hex");
const wsPath = `/tmp/pi-workspace-${hash}.json`;

async function execute(params: any) {
	const result = await registeredTool.execute("test-id", params, null, () => {});
	return { content: result.content[0].text };
}

describe("workspace tool", () => {
	beforeEach(() => {
		// Clean workspace before each test
		if (fs.existsSync(wsPath)) fs.unlinkSync(wsPath);
		if (fs.existsSync(wsPath + ".tmp")) fs.unlinkSync(wsPath + ".tmp");
	});

	afterEach(() => {
		if (fs.existsSync(wsPath)) fs.unlinkSync(wsPath);
		if (fs.existsSync(wsPath + ".tmp")) fs.unlinkSync(wsPath + ".tmp");
	});

	describe("registration", () => {
		it("registers tool with correct name", () => {
			expect(registeredTool.name).toBe("workspace");
		});

		it("has all required metadata", () => {
			expect(registeredTool.label).toBe("Workspace");
			expect(registeredTool.description).toContain("inter-agent");
			expect(registeredTool.promptGuidelines.length).toBeGreaterThan(0);
		});
	});

	describe("write operation", () => {
		it("writes a simple value", async () => {
			const result = await execute({ op: "write", key: "name", value: "test" });
			expect(result.content).toBe('Written to "name"');
			const ws = JSON.parse(fs.readFileSync(wsPath, "utf-8"));
			expect(ws.name).toBe("test");
		});

		it("writes nested path", async () => {
			const result = await execute({ op: "write", key: "plan.steps", value: ["a", "b"] });
			expect(result.content).toBe('Written to "plan.steps"');
			const ws = JSON.parse(fs.readFileSync(wsPath, "utf-8"));
			expect(ws.plan.steps).toEqual(["a", "b"]);
		});

		it("throws without key", async () => {
			await expect(execute({ op: "write", value: "x" })).rejects.toThrow("write requires a key");
		});

		it("throws without value", async () => {
			await expect(execute({ op: "write", key: "x" })).rejects.toThrow("write requires a value");
		});

		it("enforces value size limit", async () => {
			const bigValue = "x".repeat(70000);
			await expect(execute({ op: "write", key: "big", value: bigValue })).rejects.toThrow("Value too large");
		});

		it("enforces workspace size limit", async () => {
			// 16 chunks stay under 1MB serialized; 17th pushes over the max-size limit
			const chunk = "x".repeat(62000); // under 64KB value limit
			for (let i = 0; i < 16; i++) {
				await execute({ op: "write", key: `chunk${i}`, value: chunk });
			}
			await expect(execute({ op: "write", key: "overflow", value: chunk })).rejects.toThrow("max size");
		});

		it("sets file permissions to 0o600", async () => {
			await execute({ op: "write", key: "test", value: 1 });
			const stat = fs.statSync(wsPath);
			expect(stat.mode & 0o777).toBe(0o600);
		});
	});

	describe("read operation", () => {
		it("reads full workspace when no key", async () => {
			await execute({ op: "write", key: "a", value: 1 });
			const result = await execute({ op: "read" });
			const parsed = JSON.parse(result.content);
			expect(parsed.a).toBe(1);
		});

		it("reads by key path", async () => {
			await execute({ op: "write", key: "x.y.z", value: 42 });
			const result = await execute({ op: "read", key: "x.y.z" });
			expect(result.content).toBe("42");
		});

		it("returns not found for missing key", async () => {
			const result = await execute({ op: "read", key: "missing" });
			expect(result.content).toContain("not found");
		});

		it("returns empty object for non-existent workspace", async () => {
			const result = await execute({ op: "read" });
			expect(result.content).toBe("{}");
		});
	});

	describe("append operation", () => {
		it("creates array if key doesn't exist", async () => {
			const result = await execute({ op: "append", key: "items", value: "first" });
			expect(result.content).toContain("1 items");
			const ws = JSON.parse(fs.readFileSync(wsPath, "utf-8"));
			expect(ws.items).toEqual(["first"]);
		});

		it("appends to existing array", async () => {
			await execute({ op: "write", key: "items", value: ["a"] });
			const result = await execute({ op: "append", key: "items", value: "b" });
			expect(result.content).toContain("2 items");
			const ws = JSON.parse(fs.readFileSync(wsPath, "utf-8"));
			expect(ws.items).toEqual(["a", "b"]);
		});

		it("throws when target is not an array", async () => {
			await execute({ op: "write", key: "obj", value: { a: 1 } });
			await expect(execute({ op: "append", key: "obj", value: "x" })).rejects.toThrow("not an array");
		});

		it("enforces max array length", async () => {
			await execute({ op: "write", key: "arr", value: Array(1000).fill(0) });
			await expect(execute({ op: "append", key: "arr", value: 1 })).rejects.toThrow("max length");
		});
	});

	describe("clear operation", () => {
		it("clears entire workspace", async () => {
			await execute({ op: "write", key: "a", value: 1 });
			const result = await execute({ op: "clear" });
			expect(result.content).toBe("Workspace cleared");
			const ws = JSON.parse(fs.readFileSync(wsPath, "utf-8"));
			expect(ws).toEqual({});
		});

		it("clears a specific key", async () => {
			await execute({ op: "write", key: "a", value: 1 });
			await execute({ op: "write", key: "b", value: 2 });
			const result = await execute({ op: "clear", key: "a" });
			expect(result.content).toBe('Cleared "a"');
			const ws = JSON.parse(fs.readFileSync(wsPath, "utf-8"));
			expect(ws.a).toBeUndefined();
			expect(ws.b).toBe(2);
		});
	});

	describe("keys operation", () => {
		it("lists top-level keys", async () => {
			await execute({ op: "write", key: "alpha", value: 1 });
			await execute({ op: "write", key: "beta", value: 2 });
			const result = await execute({ op: "keys" });
			expect(result.content).toContain("alpha");
			expect(result.content).toContain("beta");
		});

		it("lists nested keys", async () => {
			await execute({ op: "write", key: "plan.a", value: 1 });
			await execute({ op: "write", key: "plan.b", value: 2 });
			const result = await execute({ op: "keys", key: "plan" });
			expect(result.content).toContain("a");
			expect(result.content).toContain("b");
		});

		it("returns empty for non-existent workspace", async () => {
			const result = await execute({ op: "keys" });
			expect(result.content).toContain("empty");
		});
	});

	describe("security", () => {
		it("rejects __proto__ in key path", async () => {
			await expect(execute({ op: "write", key: "__proto__.polluted", value: true })).rejects.toThrow("forbidden key");
		});

		it("rejects constructor in key path", async () => {
			await expect(execute({ op: "read", key: "constructor.prototype" })).rejects.toThrow("forbidden key");
		});

		it("rejects prototype in key path", async () => {
			await expect(execute({ op: "append", key: "prototype.x", value: 1 })).rejects.toThrow("forbidden key");
		});

		it("rejects empty key segments", async () => {
			await expect(execute({ op: "write", key: "a..b", value: 1 })).rejects.toThrow("empty segment");
		});

		it("rejects single dot", async () => {
			await expect(execute({ op: "write", key: ".", value: 1 })).rejects.toThrow("empty segment");
		});
	});

	describe("resilience", () => {
		it("handles corrupted workspace file", async () => {
			fs.writeFileSync(wsPath, "not json {{{", { mode: 0o600 });
			const result = await execute({ op: "read" });
			expect(result.content).toBe("{}");
		});

		it("handles empty workspace file", async () => {
			fs.writeFileSync(wsPath, "", { mode: 0o600 });
			const result = await execute({ op: "read" });
			expect(result.content).toBe("{}");
		});
	});
});
