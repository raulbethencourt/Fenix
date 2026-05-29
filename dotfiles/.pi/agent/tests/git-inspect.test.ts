import { describe, it, expect, beforeAll } from "vitest";

const tools: Record<string, any> = {};
const mockPi = {
	registerTool: (opts: any) => {
		tools[opts.name] = opts;
	},
	on: () => {},
	registerCommand: () => {},
};

const TOOL_PATH = "../extensions/subagents/tools/git-inspect.ts";

async function executeText(params: Record<string, any>): Promise<string> {
	const result = await tools.git_inspect.execute("test-call", params, null, () => {});
	return String(result?.content?.[0]?.text ?? "");
}

async function invoke(params: Record<string, any>): Promise<{ text: string; threw: boolean }> {
	try {
		return { text: await executeText(params), threw: false };
	} catch (err) {
		return { text: String(err), threw: true };
	}
}

describe("git_inspect tool", () => {
	beforeAll(async () => {
		const mod = await import(TOOL_PATH);
		const init = mod.default;
		init(mockPi as any);
	});

	it("rejects unknown commands", async () => {
		const text = await executeText({ command: "push" });
		expect(text.toLowerCase()).toMatch(/not allowed|invalid|unsupported|reject/i);
	});

	it("rejects dangerous flags", async () => {
		const text = await executeText({ command: "log", args: "--exec=rm -rf /" });
		expect(text.toLowerCase()).toMatch(/dangerous|not allowed|forbidden|reject/i);
	});

	it("rejects --config flag", async () => {
		const text = await executeText({ command: "log", args: "--config core.sshCommand=evil" });
		expect(text.toLowerCase()).toMatch(/config|dangerous|not allowed|forbidden|reject/i);
	});

	it("accepts valid diff command", async () => {
		await expect(executeText({ command: "diff", args: "--name-only" })).resolves.toEqual(expect.any(String));
	});

	it("accepts valid log command", async () => {
		const text = await executeText({ command: "log", args: "--oneline -5" });
		expect(text.trim().length).toBeGreaterThan(0);
	});

	it("handles path parameter", async () => {
		await expect(
			executeText({ command: "log", args: "--oneline -3", path: "package.json" }),
		).resolves.toEqual(expect.any(String));
	});

	it("all whitelisted commands are accepted", async () => {
		const cases: Array<{ command: string; args?: string }> = [
			{ command: "diff", args: "--name-only" },
			{ command: "log", args: "--oneline -1" },
			{ command: "show", args: "HEAD --stat --oneline" },
			{ command: "status", args: "--short" },
			{ command: "branch", args: "--list" },
			{ command: "blame", args: "package.json -L 1,1" },
			{ command: "tag", args: "--list" },
			{ command: "stash-list" },
			{ command: "diff-stat", args: "--stat" },
			{ command: "shortlog", args: "-sne HEAD" },
		];

		for (const testCase of cases) {
			const out = await invoke(testCase);
			expect(out.text.toLowerCase(), `command ${testCase.command} was rejected`).not.toMatch(
				/not allowed|invalid command|unsupported command|forbidden command|rejected command/i,
			);
		}
	});
});
