import { afterEach, beforeEach, describe, expect, it } from "vitest";
import subagentsInit, { formatBadge } from "../extensions/subagents/index.ts";

const plainTheme = {
	fg: (_color: string, text: string) => text,
	bold: (text: string) => text,
};

describe("subagents status badges", () => {
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
		Object.defineProperty(process.stdout, "columns", { value: 80, configurable: true });
	});

	afterEach(() => {
		Object.defineProperty(process.stdout, "columns", { value: originalColumns, configurable: true });
	});

	it("formats badge labels", () => {
		expect(formatBadge("retrying", "warning", plainTheme as any)).toBe("[retrying]");
		expect(formatBadge("rate-limited", "error", plainTheme as any)).toBe("[rate-limited]");
	});

	it("renders retry and rate-limit badges on the header line", () => {
		const result = {
			content: [{ type: "text", text: "done" }],
			details: {
				mode: "parallel",
				results: [
					{
						agent: "scout",
						task: "Inspect provider state",
						output: "done",
						exitCode: 0,
						model: "openai/scout-model",
						usedFallback: true,
						usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 },
						progress: {
							agent: "scout",
							status: "running",
							task: "Inspect provider state",
							recentTools: [],
							toolCount: 1,
							tokens: 100,
							durationMs: 1000,
							lastMessage: "retrying",
							retryState: "retrying",
						},
					},
					{
						agent: "worker",
						task: "Apply fallback",
						output: "failed",
						exitCode: 1,
						model: "openai/worker-model",
						usedFallback: false,
						usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 },
						progress: {
							agent: "worker",
							status: "failed",
							task: "Apply fallback",
							recentTools: [],
							toolCount: 1,
							tokens: 50,
							durationMs: 1000,
							lastMessage: "rate limited",
							retryState: "rate-limited",
							error: "429 Too Many Requests",
						},
					},
				],
			},
		};

		const component = registeredTool.renderResult(result, { expanded: false }, plainTheme, {});
		const output = component.render(80).join("\n");

		expect(output).toContain("[retrying]");
		expect(output).toContain("[rate-limited]");
	});
});
