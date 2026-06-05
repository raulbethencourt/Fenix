// TODO: Add more fanout-allowed agents here as nested orchestration expands.
export const FANOUT_AGENTS = ["planner"] as const satisfies readonly string[];

export function filterChildTools(tools: string[], agent: string, depth: number): string[] {
	if (depth <= 0 || FANOUT_AGENTS.includes(agent)) {
		return tools;
	}

	if (!tools.includes("subagent")) {
		return tools;
	}

	return tools.filter((tool) => tool !== "subagent");
}
