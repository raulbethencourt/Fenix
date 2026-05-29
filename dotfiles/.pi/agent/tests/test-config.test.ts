import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let registeredTool: any = null;
const mockPi = {
	registerTool(toolDef: any) {
		registeredTool = toolDef;
	},
};

// Create a temp dir to act as project root
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-config-"));
const originalCwd = process.cwd();

// Mock process.cwd to return our temp dir
const origCwd = process.cwd;

describe("test_config tool", () => {
	beforeEach(() => {
		process.cwd = () => tmpDir;
		// Re-import to pick up new cwd
		registeredTool = null;
	});

	afterEach(() => {
		process.cwd = origCwd;
		// Clean up .pi dir
		const piDir = path.join(tmpDir, ".pi");
		if (fs.existsSync(piDir)) {
			fs.rmSync(piDir, { recursive: true });
		}
		// Remove any test config files
		for (const f of ["vitest.config.ts", "jest.config.js", "phpunit.xml", "go.mod"]) {
			const fp = path.join(tmpDir, f);
			if (fs.existsSync(fp)) fs.unlinkSync(fp);
		}
	});

	async function initTool() {
		// Dynamic import to get fresh module with mocked cwd
		const mod = await import("../extensions/subagents/tools/test-config.ts");
		mod.default(mockPi as any);
	}

	async function execute(params: any) {
		const result = await registeredTool.execute("test-id", params, null, () => {});
		return { content: result.content[0].text };
	}

	describe("detection", () => {
		it("detects vitest", async () => {
			fs.writeFileSync(path.join(tmpDir, "vitest.config.ts"), "export default {}");
			await initTool();
			const result = await execute({ op: "detect" });
			expect(result.content).toContain("vitest");
			expect(result.content).toContain("Detected");
		});

		it("detects jest", async () => {
			fs.writeFileSync(path.join(tmpDir, "jest.config.js"), "module.exports = {}");
			await initTool();
			const result = await execute({ op: "detect" });
			expect(result.content).toContain("jest");
		});

		it("detects phpunit", async () => {
			fs.writeFileSync(path.join(tmpDir, "phpunit.xml"), "<phpunit/>");
			await initTool();
			const result = await execute({ op: "detect" });
			expect(result.content).toContain("phpunit");
		});

		it("detects go test", async () => {
			fs.writeFileSync(path.join(tmpDir, "go.mod"), "module example.com/test");
			await initTool();
			const result = await execute({ op: "detect" });
			expect(result.content).toContain("go test");
		});

		it("returns not found when no config files", async () => {
			await initTool();
			const result = await execute({ op: "detect" });
			expect(result.content).toContain("No test infrastructure detected");
		});
	});

	describe("persistence", () => {
		it("saves and reads config", async () => {
			fs.writeFileSync(path.join(tmpDir, "vitest.config.ts"), "export default {}");
			await initTool();
			await execute({ op: "detect" });
			const result = await execute({ op: "read" });
			const config = JSON.parse(result.content);
			expect(config.runner).toBe("vitest");
			expect(config.detected).toBe(true);
			expect(config.confirmedByUser).toBe(false);
		});

		it("updates config fields", async () => {
			fs.writeFileSync(path.join(tmpDir, "vitest.config.ts"), "export default {}");
			await initTool();
			await execute({ op: "detect" });
			await execute({ op: "update", config: { testDir: "src/__tests__", confirmedByUser: true } });
			const result = await execute({ op: "read" });
			const config = JSON.parse(result.content);
			expect(config.testDir).toBe("src/__tests__");
			expect(config.confirmedByUser).toBe(true);
			expect(config.runner).toBe("vitest"); // preserved
		});

		it("returns already confirmed on re-detect", async () => {
			fs.writeFileSync(path.join(tmpDir, "vitest.config.ts"), "export default {}");
			await initTool();
			await execute({ op: "detect" });
			await execute({ op: "update", config: { confirmedByUser: true } });
			const result = await execute({ op: "detect" });
			expect(result.content).toContain("already confirmed");
		});
	});

	describe("errors", () => {
		it("read returns message when no config", async () => {
			await initTool();
			const result = await execute({ op: "read" });
			expect(result.content).toContain("No test config found");
		});

		it("update without config throws", async () => {
			await initTool();
			await expect(execute({ op: "update" })).rejects.toThrow("update requires config");
		});
	});
});
