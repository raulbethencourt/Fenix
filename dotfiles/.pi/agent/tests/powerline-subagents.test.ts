import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildStatusLine } from "../extensions/powerline.ts";
import {
	incrementActiveSubagentCount,
	resetActiveSubagentCount,
} from "../extensions/subagents/activity.ts";

const theme = {
	fg: (_color: string, text: string) => text,
	bold: (text: string) => text,
};

const ctx = {
	cwd: "/tmp/project",
	model: { id: "openai/gpt-5" },
	getContextUsage: () => ({ percent: 12 }),
};

const pi = {
	getThinkingLevel: () => "medium",
};

describe("powerline subagent segment", () => {
	beforeEach(() => {
		resetActiveSubagentCount();
	});

	afterEach(() => {
		resetActiveSubagentCount();
	});

	it("shows the active subagent count when subagents are running", () => {
		incrementActiveSubagentCount();
		incrementActiveSubagentCount();

		const line = buildStatusLine(ctx as any, pi as any, { branch: "", staged: 0, modified: 0, untracked: 0 }, true, 0, 120, theme as any);

		expect(line).toContain("󰭆 2 agents");
	});

	it("hides the subagent count when there are no active subagents", () => {
		const line = buildStatusLine(ctx as any, pi as any, { branch: "", staged: 0, modified: 0, untracked: 0 }, false, 0, 120, theme as any);

		expect(line).not.toContain("󰭆");
		expect(line).not.toContain("agents");
	});
});
