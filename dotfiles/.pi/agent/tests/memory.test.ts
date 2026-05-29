import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";

// We'll test by importing the module and capturing what registerTool receives
let registeredTool: any = null;

// Mock ExtensionAPI
const mockPi = {
	registerTool(toolDef: any) {
		registeredTool = toolDef;
	},
	on: () => {},
	registerCommand: () => {},
};

// Test helpers
let tempDir: string;
let originalEnv: string | undefined;
let originalCwd: string;

function getProjectHash(cwd: string): string {
	return crypto.createHash("md5").update(cwd).digest("hex");
}

function getMemoryFilePath(cwd: string): string {
	const hash = getProjectHash(cwd);
	return path.join(tempDir, `${hash}.md`);
}

async function execute(params: any, cwd?: string) {
	const oldCwd = process.cwd();
	if (cwd) process.chdir(cwd);
	try {
		const result = await registeredTool.execute("test-id", params, null, () => {});
		return result.content[0].text;
	} finally {
		if (cwd) process.chdir(oldCwd);
	}
}

// Import and initialize - THIS WILL FAIL because the extension doesn't exist yet (RED phase)
import memoryInit from "../extensions/memory/index.ts";
memoryInit(mockPi as any);

describe("memory tool", () => {
	beforeEach(() => {
		// Create temp directory for test memories
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-memory-test-"));
		originalEnv = process.env.PI_MEMORY_DIR;
		originalCwd = process.cwd();
		process.env.PI_MEMORY_DIR = tempDir;
	});

	afterEach(() => {
		// Clean up temp directory
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
		// Restore environment
		if (originalEnv === undefined) {
			delete process.env.PI_MEMORY_DIR;
		} else {
			process.env.PI_MEMORY_DIR = originalEnv;
		}
		process.chdir(originalCwd);
	});

	describe("registration", () => {
		it("registers memory tool", () => {
			expect(registeredTool).toBeDefined();
			expect(registeredTool.name).toBe("memory");
		});
	});

	describe("remember operation", () => {
		it("creates file and appends timestamped line", async () => {
			const result = await execute({ op: "remember", content: "Test fact" });
			
			expect(result).toContain("Remembered");
			
			const memoryFile = getMemoryFilePath(process.cwd());
			expect(fs.existsSync(memoryFile)).toBe(true);
			
			const content = fs.readFileSync(memoryFile, "utf-8");
			expect(content).toMatch(/- \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\] Test fact/);
		});

		it("appends multiple facts", async () => {
			await execute({ op: "remember", content: "First fact" });
			await execute({ op: "remember", content: "Second fact" });
			await execute({ op: "remember", content: "Third fact" });
			
			const memoryFile = getMemoryFilePath(process.cwd());
			const content = fs.readFileSync(memoryFile, "utf-8");
			const lines = content.trim().split("\n");
			
			expect(lines.length).toBe(3);
			expect(content).toContain("First fact");
			expect(content).toContain("Second fact");
			expect(content).toContain("Third fact");
		});
	});

	describe("recall operation", () => {
		it("returns matching lines only", async () => {
			await execute({ op: "remember", content: "JavaScript is great" });
			await execute({ op: "remember", content: "Python is also good" });
			await execute({ op: "remember", content: "JavaScript has async" });
			
			const result = await execute({ op: "recall", query: "JavaScript" });
			
			expect(result).toContain("JavaScript is great");
			expect(result).toContain("JavaScript has async");
			expect(result).not.toContain("Python is also good");
		});

		it("is case-insensitive", async () => {
			await execute({ op: "remember", content: "JavaScript is great" });
			await execute({ op: "remember", content: "Python is good" });
			
			const result = await execute({ op: "recall", query: "javascript" });
			
			expect(result).toContain("JavaScript is great");
			expect(result).not.toContain("Python is good");
		});

		it("returns empty message when no matches", async () => {
			await execute({ op: "remember", content: "Something" });
			
			const result = await execute({ op: "recall", query: "nonexistent" });
			
			expect(result).toMatch(/no.*match|not.*found|empty/i);
		});
	});

	describe("list operation", () => {
		it("returns last 20 lines", async () => {
			// Create 25 entries
			for (let i = 1; i <= 25; i++) {
				await execute({ op: "remember", content: `Fact ${i}` });
			}
			
			const result = await execute({ op: "list" });
			
			// Should contain last 20 (6-25)
			expect(result).toContain("Fact 25");
			expect(result).toContain("Fact 6");
			// Should NOT contain first 5
			expect(result).not.toContain("Fact 1");
			expect(result).not.toContain("Fact 5");
		});

		it("returns empty message for missing file", async () => {
			const result = await execute({ op: "list" });
			
			expect(result).toMatch(/empty|no.*memor/i);
		});

		it("returns empty message for empty file", async () => {
			// Create empty file
			const memoryFile = getMemoryFilePath(process.cwd());
			fs.mkdirSync(path.dirname(memoryFile), { recursive: true });
			fs.writeFileSync(memoryFile, "");
			
			const result = await execute({ op: "list" });
			
			expect(result).toMatch(/empty|no.*memor/i);
		});
	});

	describe("forget operation", () => {
		it("removes matching lines", async () => {
			await execute({ op: "remember", content: "Keep this" });
			await execute({ op: "remember", content: "Remove this" });
			await execute({ op: "remember", content: "Also keep this" });
			
			const result = await execute({ op: "forget", query: "Remove" });
			
			expect(result).toMatch(/removed|forgot|deleted/i);
			
			const memoryFile = getMemoryFilePath(process.cwd());
			const content = fs.readFileSync(memoryFile, "utf-8");
			
			expect(content).toContain("Keep this");
			expect(content).toContain("Also keep this");
			expect(content).not.toContain("Remove this");
		});

		it("leaves non-matching lines intact", async () => {
			await execute({ op: "remember", content: "JavaScript" });
			await execute({ op: "remember", content: "Python" });
			await execute({ op: "remember", content: "Ruby" });
			
			await execute({ op: "forget", query: "Python" });
			
			const memoryFile = getMemoryFilePath(process.cwd());
			const content = fs.readFileSync(memoryFile, "utf-8");
			const lines = content.trim().split("\n");
			
			expect(lines.length).toBe(2);
			expect(content).toContain("JavaScript");
			expect(content).toContain("Ruby");
			expect(content).not.toContain("Python");
		});
	});

	describe("project isolation", () => {
		it("different cwds write to different files", async () => {
			const cwd1 = path.join(tempDir, "project1");
			const cwd2 = path.join(tempDir, "project2");
			
			fs.mkdirSync(cwd1, { recursive: true });
			fs.mkdirSync(cwd2, { recursive: true });
			
			await execute({ op: "remember", content: "Project 1 fact" }, cwd1);
			await execute({ op: "remember", content: "Project 2 fact" }, cwd2);
			
			const file1 = getMemoryFilePath(cwd1);
			const file2 = getMemoryFilePath(cwd2);
			
			expect(file1).not.toBe(file2);
			expect(fs.existsSync(file1)).toBe(true);
			expect(fs.existsSync(file2)).toBe(true);
			
			const content1 = fs.readFileSync(file1, "utf-8");
			const content2 = fs.readFileSync(file2, "utf-8");
			
			expect(content1).toContain("Project 1 fact");
			expect(content1).not.toContain("Project 2 fact");
			expect(content2).toContain("Project 2 fact");
			expect(content2).not.toContain("Project 1 fact");
		});
	});

	describe("markdown format", () => {
		it("memory file is human-readable markdown", async () => {
			await execute({ op: "remember", content: "First memory" });
			await execute({ op: "remember", content: "Second memory" });
			
			const memoryFile = getMemoryFilePath(process.cwd());
			const content = fs.readFileSync(memoryFile, "utf-8");
			
			// Should be markdown list format
			const lines = content.trim().split("\n");
			lines.forEach(line => {
				expect(line).toMatch(/^- \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\]/);
			});
			
			// Should be readable
			expect(content).toContain("First memory");
			expect(content).toContain("Second memory");
		});
	});
});
