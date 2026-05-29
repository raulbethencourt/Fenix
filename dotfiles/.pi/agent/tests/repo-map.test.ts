import { describe, it, expect, vi } from "vitest";

const mockExecute = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "mock" }] });
vi.mock("@mariozechner/pi-coding-agent", () => ({
	createBashTool: () => ({ execute: mockExecute }),
}));

import repoMapInit from "../extensions/subagents/tools/repo-map.ts";

let registeredTool: any = null;
const mockPi = {
	registerTool(def: any) {
		registeredTool = def;
	},
};

repoMapInit(mockPi as any);

function getCommand(params: any) {
	mockExecute.mockClear();
	registeredTool.execute("id", params, null, () => {});
	return mockExecute.mock.calls[0][1].command;
}

describe("repo-map tool", () => {
	it("registers with correct name", () => {
		expect(registeredTool.name).toBe("repo_map");
	});

	describe("language normalization", () => {
		it("accepts typescript", () => {
			const cmd = getCommand({ path: "/src", lang: "typescript" });
			expect(cmd).toContain("TypeScript");
			expect(cmd).not.toContain("JavaScript");
		});

		it("accepts ts alias", () => {
			const cmd = getCommand({ path: "/src", lang: "ts" });
			expect(cmd).toContain("TypeScript");
		});

		it("accepts javascript", () => {
			const cmd = getCommand({ path: "/src", lang: "javascript" });
			expect(cmd).toContain("JavaScript");
			expect(cmd).not.toContain("TypeScript");
		});

		it("accepts js alias", () => {
			const cmd = getCommand({ path: "/src", lang: "js" });
			expect(cmd).toContain("JavaScript");
		});

		it("accepts php", () => {
			const cmd = getCommand({ path: "/src", lang: "php" });
			expect(cmd).toContain("PHP");
		});

		it("accepts python", () => {
			const cmd = getCommand({ path: "/src", lang: "python" });
			expect(cmd).toContain("Python");
		});

		it("accepts py alias", () => {
			const cmd = getCommand({ path: "/src", lang: "py" });
			expect(cmd).toContain("Python");
		});

		it("throws on unsupported lang", async () => {
			await expect(
				registeredTool.execute("id", { path: "/src", lang: "rust" }, null, () => {}),
			).rejects.toThrow("Unsupported lang");
		});

		it("uses all languages when lang omitted", () => {
			const cmd = getCommand({ path: "/src" });
			expect(cmd).toContain("TypeScript");
			expect(cmd).toContain("JavaScript");
			expect(cmd).toContain("PHP");
			expect(cmd).toContain("Python");
		});
	});

	describe("command construction", () => {
		it("starts with cd to path", () => {
			const cmd = getCommand({ path: "/my/project" });
			expect(cmd).toMatch(/^cd '\/my\/project'/);
		});

		it("uses --json=stream", () => {
			const cmd = getCommand({ path: "/src" });
			expect(cmd).toContain("--json=stream");
		});

		it("pipes to node formatter", () => {
			const cmd = getCommand({ path: "/src" });
			expect(cmd).toContain("| REPO_MAP_MAX_LINES=");
			expect(cmd).toContain("node -e");
		});

		it("defaults maxLines to 200", () => {
			const cmd = getCommand({ path: "/src" });
			expect(cmd).toContain("REPO_MAP_MAX_LINES=200");
		});

		it("uses custom maxLines", () => {
			const cmd = getCommand({ path: "/src", maxLines: 50 });
			expect(cmd).toContain("REPO_MAP_MAX_LINES=50");
		});

		it("includes globs when specified", () => {
			const cmd = getCommand({ path: "/src", globs: ["**/*.ts", "!node_modules"] });
			expect(cmd).toContain("--globs");
			expect(cmd).toContain("**/*.ts");
			expect(cmd).toContain("!node_modules");
		});

		it("redirects stderr to /dev/null", () => {
			const cmd = getCommand({ path: "/src" });
			expect(cmd).toContain("2>/dev/null");
		});

		it("passes timeout of 60", () => {
			mockExecute.mockClear();
			registeredTool.execute("id", { path: "/src" }, null, () => {});
			expect(mockExecute.mock.calls[0][1].timeout).toBe(60);
		});
	});
});
