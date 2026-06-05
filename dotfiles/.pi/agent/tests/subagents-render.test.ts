import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { visibleWidth } from "@mariozechner/pi-tui";
import subagentsInit from "../extensions/subagents/index.ts";

const plainTheme = {
	fg: (_color: string, text: string) => text,
	bold: (text: string) => text,
};

describe("subagents renderResult", () => {
	const originalColumns = process.stdout.columns;
	let registeredTool: any;

	beforeEach(() => {
		registeredTool = undefined;
		subagentsInit({
			registerCommand() {},
			registerTool(def: any) {
				registeredTool = def;
			},
		} as any);
		Object.defineProperty(process.stdout, "columns", { value: 64, configurable: true });
	});

	afterEach(() => {
		Object.defineProperty(process.stdout, "columns", { value: originalColumns, configurable: true });
	});

	it("renders flat tree connectors and clamps long previews", () => {
		const result = {
			content: [{ type: "text", text: "done" }],
			details: {
				mode: "parallel",
				results: [
					{
						agent: "scout",
						task: "Inspect an extremely long task description ".repeat(6),
						output: "",
						exitCode: 0,
						model: "openai/scout-model",
						usedFallback: false,
						usage: { input: 10, output: 20, cacheRead: 0, cacheWrite: 0, cost: 0.1234, turns: 2 },
						progress: {
							agent: "scout",
							status: "running",
							task: "Inspect an extremely long task description ".repeat(6),
							currentTool: "safe_bash",
							currentToolArgs: "echo " + "x".repeat(200),
							recentTools: [
								{ tool: "read", args: "/tmp/" + "a".repeat(160) },
								{ tool: "grep", args: "pattern=" + "b".repeat(160) },
							],
							toolCount: 2,
							tokens: 1234,
							durationMs: 5000,
							lastMessage: "Working through a very long progress message ".repeat(8),
						},
					},
					{
						agent: "worker",
						task: "Apply the fix",
						output: "",
						exitCode: 0,
						model: "openai/worker-model",
						usedFallback: false,
						usage: { input: 30, output: 40, cacheRead: 5, cacheWrite: 6, cost: 0.2345, turns: 3 },
						progress: {
							agent: "worker",
							status: "completed",
							task: "Apply the fix",
							recentTools: [{ tool: "edit", args: "agent/extensions/subagents/index.ts" }],
							toolCount: 1,
							tokens: 567,
							durationMs: 2500,
							lastMessage: "Applied the fix and verified the result",
						},
					},
				],
			},
		};

		const component = registeredTool.renderResult(result, { expanded: true }, plainTheme, {});
		const lines = component.render(60);
		const output = lines.join("\n");

		expect(output).toContain("├─ ");
		expect(output).toContain("└─ ");
		expect(output).toContain("│  ├─ read(");
		expect(output).toContain("│  └─ grep(");
		expect(output).toContain("…");
		for (const line of lines) {
			expect(visibleWidth(line)).toBeLessThanOrEqual(60);
		}
	});
});
