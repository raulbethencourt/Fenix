import { describe, it, expect, vi } from "vitest";

const mockExecute = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "mock" }] });
vi.mock("@mariozechner/pi-coding-agent", () => ({
	createBashTool: () => ({ execute: mockExecute }),
}));

import repomixInit from "../extensions/subagents/tools/repomix.ts";

let registeredTool: any = null;
const mockPi = { registerTool(def: any) { registeredTool = def; } };

repomixInit(mockPi as any);

function getCommand(params: any) {
	mockExecute.mockClear();
	registeredTool.execute("id", params, null, () => {});
	return mockExecute.mock.calls[0][1].command;
}

describe("repomix tool", () => {
	it("registers with correct name", () => {
		expect(registeredTool.name).toBe("repomix");
	});

	describe("defaults", () => {
		it("starts with repomix command", () => {
			const cmd = getCommand({});
			expect(cmd).toMatch(/^repomix/);
		});

		it("includes --compress by default", () => {
			const cmd = getCommand({});
			expect(cmd).toContain("--compress");
		});

		it("uses markdown style by default", () => {
			const cmd = getCommand({});
			expect(cmd).toContain("--style markdown");
		});

		it("outputs to /dev/stdout", () => {
			const cmd = getCommand({});
			expect(cmd).toContain("--output /dev/stdout");
		});

		it("includes --no-file-summary", () => {
			const cmd = getCommand({});
			expect(cmd).toContain("--no-file-summary");
		});

		it("includes --no-directory-structure", () => {
			const cmd = getCommand({});
			expect(cmd).toContain("--no-directory-structure");
		});

		it("uses timeout of 120", () => {
			mockExecute.mockClear();
			registeredTool.execute("id", {}, null, () => {});
			expect(mockExecute.mock.calls[0][1].timeout).toBe(120);
		});
	});

	describe("path parameter", () => {
		it("adds path when specified", () => {
			const cmd = getCommand({ path: "/my/project" });
			expect(cmd).toContain("'/my/project'");
		});

		it("omits path when not specified", () => {
			const cmd = getCommand({});
			expect(cmd).not.toMatch(/repomix '.+'/);
		});
	});

	describe("include parameter", () => {
		it("adds --include with comma-joined globs", () => {
			const cmd = getCommand({ include: ["src/auth/**", "src/middleware/**"] });
			expect(cmd).toContain("--include");
			expect(cmd).toContain("src/auth/**,src/middleware/**");
		});

		it("omits --include when empty array", () => {
			const cmd = getCommand({ include: [] });
			expect(cmd).not.toContain("--include");
		});
	});

	describe("ignore parameter", () => {
		it("adds --ignore with comma-joined patterns", () => {
			const cmd = getCommand({ ignore: ["*.test.ts", "dist/**"] });
			expect(cmd).toContain("--ignore");
			expect(cmd).toContain("*.test.ts,dist/**");
		});

		it("omits --ignore when not specified", () => {
			const cmd = getCommand({});
			expect(cmd).not.toContain("--ignore");
		});
	});

	describe("compress parameter", () => {
		it("omits --compress when explicitly false", () => {
			const cmd = getCommand({ compress: false });
			expect(cmd).not.toContain("--compress");
		});

		it("includes --compress when true", () => {
			const cmd = getCommand({ compress: true });
			expect(cmd).toContain("--compress");
		});
	});

	describe("style parameter", () => {
		it("uses xml when specified", () => {
			const cmd = getCommand({ style: "xml" });
			expect(cmd).toContain("--style xml");
		});

		it("uses plain when specified", () => {
			const cmd = getCommand({ style: "plain" });
			expect(cmd).toContain("--style plain");
		});
	});

	describe("optional flags", () => {
		it("adds --include-diffs when true", () => {
			const cmd = getCommand({ includeDiffs: true });
			expect(cmd).toContain("--include-diffs");
		});

		it("omits --include-diffs when false", () => {
			const cmd = getCommand({ includeDiffs: false });
			expect(cmd).not.toContain("--include-diffs");
		});

		it("adds --remove-comments when true", () => {
			const cmd = getCommand({ removeComments: true });
			expect(cmd).toContain("--remove-comments");
		});

		it("adds --token-count-tree when true", () => {
			const cmd = getCommand({ tokenCountTree: true });
			expect(cmd).toContain("--token-count-tree");
		});

		it("omits --token-count-tree when false", () => {
			const cmd = getCommand({ tokenCountTree: false });
			expect(cmd).not.toContain("--token-count-tree");
		});
	});

	describe("shell escaping", () => {
		it("escapes path with single quotes", () => {
			const cmd = getCommand({ path: "/path/with spaces" });
			expect(cmd).toContain("'/path/with spaces'");
		});

		it("escapes include patterns", () => {
			const cmd = getCommand({ include: ["it's a glob"] });
			expect(cmd).toContain("'it'\\''s a glob'");
		});
	});
});
