import { describe, it, expect } from "vitest";
import { filterChildTools, FANOUT_AGENTS } from "../extensions/subagents/filter-child-tools.ts";

describe("filterChildTools", () => {
	it("depth=0 → tool list returned unchanged (parent context)", () => {
		const tools = ["subagent", "bash", "read", "edit"];
		expect(filterChildTools(tools, "worker", 0)).toEqual(tools);
	});

	it("depth=1, agent=worker → subagent is removed", () => {
		const tools = ["subagent", "bash", "read"];
		const result = filterChildTools(tools, "worker", 1);
		expect(result).not.toContain("subagent");
		expect(result).toContain("bash");
		expect(result).toContain("read");
	});

	it("depth=1, agent=planner → subagent is preserved (fanout-allowed)", () => {
		expect(FANOUT_AGENTS).toContain("planner");
		const tools = ["subagent", "bash", "read"];
		const result = filterChildTools(tools, "planner", 1);
		expect(result).toContain("subagent");
	});

	it("depth=2, agent=worker → subagent is removed", () => {
		const tools = ["subagent", "bash"];
		const result = filterChildTools(tools, "worker", 2);
		expect(result).not.toContain("subagent");
	});

	it("depth=1, agent=worker, tools list has no subagent → returned unchanged", () => {
		const tools = ["bash", "read", "edit"];
		expect(filterChildTools(tools, "worker", 1)).toEqual(tools);
	});

	it("other tools (bash, read, edit) are never touched regardless of depth", () => {
		for (const depth of [0, 1, 2]) {
			const tools = ["bash", "read", "edit"];
			expect(filterChildTools(tools, "worker", depth)).toEqual(tools);
		}
	});
});
