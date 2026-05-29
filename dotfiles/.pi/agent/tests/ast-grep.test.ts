import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock createBashTool before importing the module
const mockExecute = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "mock output" }] });
vi.mock("@mariozechner/pi-coding-agent", () => ({
	createBashTool: () => ({ execute: mockExecute }),
}));

import astGrepInit from "../extensions/subagents/tools/ast-grep.ts";

let registeredTool: any = null;
const mockPi = { registerTool(def: any) { registeredTool = def; } };

astGrepInit(mockPi as any);

function getCommand(params: any) {
	mockExecute.mockClear();
	registeredTool.execute("id", params, null, () => {});
	return mockExecute.mock.calls[0][1].command;
}

describe("ast-grep tool", () => {
	it("registers with correct name", () => {
		expect(registeredTool.name).toBe("ast_grep");
	});

	describe("command construction", () => {
		it("uses scan mode by default", () => {
			const cmd = getCommand({ pattern: "console.log($MSG)" });
			expect(cmd).toContain("/usr/bin/sg scan");
		});

		it("uses run mode with rule", () => {
			const cmd = getCommand({ pattern: "x", rule: "/path/to/rule.yml" });
			expect(cmd).toContain("/usr/bin/sg run");
			expect(cmd).toContain("-r");
			expect(cmd).toContain("rule.yml");
		});

		it("includes pattern flag", () => {
			const cmd = getCommand({ pattern: "if ($COND) { $$$ }" });
			expect(cmd).toContain("-p");
			expect(cmd).toContain("if ($COND) { $$$ }");
		});

		it("includes lang flag when specified", () => {
			const cmd = getCommand({ pattern: "x", lang: "typescript" });
			expect(cmd).toContain("-l");
			expect(cmd).toContain("typescript");
		});

		it("omits lang flag when not specified", () => {
			const cmd = getCommand({ pattern: "x" });
			expect(cmd).not.toContain("-l");
		});

		it("includes format flag", () => {
			const cmd = getCommand({ pattern: "x", format: "json" });
			expect(cmd).toContain("-f json");
		});

		it("always includes --color never", () => {
			const cmd = getCommand({ pattern: "x" });
			expect(cmd).toContain("--color never");
		});

		it("includes paths when specified", () => {
			const cmd = getCommand({ pattern: "x", paths: ["src/", "lib/"] });
			expect(cmd).toContain("'src/'");
			expect(cmd).toContain("'lib/'");
		});

		it("omits paths when not specified", () => {
			const cmd = getCommand({ pattern: "x" });
			// Should end with --color never
			expect(cmd).toMatch(/--color never$/);
		});

		it("shell-escapes pattern with single quotes", () => {
			const cmd = getCommand({ pattern: "it's a test" });
			expect(cmd).toContain("'it'\\''s a test'");
		});

		it("passes timeout of 30 to bashTool", () => {
			mockExecute.mockClear();
			registeredTool.execute("id", { pattern: "x" }, null, () => {});
			expect(mockExecute.mock.calls[0][1].timeout).toBe(30);
		});
	});
});
