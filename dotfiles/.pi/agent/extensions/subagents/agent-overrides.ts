export interface AgentOverride {
	model?: string;
	tools?: string[];
}

export type AgentOverrides = Record<string, AgentOverride>;

export interface OverridableAgent {
	name: string;
	model?: string;
	tools: string[];
}

export function applyAgentOverrides<T extends OverridableAgent>(agent: T, overrides?: AgentOverrides): T {
	const next = { ...agent, tools: [...agent.tools] } as T;
	const override = overrides?.[agent.name];
	if (!override) return next;
	if (typeof override.model === "string" && override.model.trim()) next.model = override.model;
	if (Object.hasOwn(override, "tools") && Array.isArray(override.tools)) {
		next.tools = override.tools.filter((t): t is string => typeof t === "string") as T["tools"];
	}
	return next;
}
