import { stripParentOrchestrationContent } from "./strip-orchestration.ts";

export interface BeforeAgentStartEventLike {
	systemPrompt: string;
}

export function stripChildPromptHook(
	event: BeforeAgentStartEventLike,
	depth: number,
): { systemPrompt: string } | undefined {
	if (depth <= 0 || !Number.isFinite(depth)) return undefined;
	const systemPrompt = stripParentOrchestrationContent(event.systemPrompt);
	return systemPrompt === event.systemPrompt ? undefined : { systemPrompt };
}
