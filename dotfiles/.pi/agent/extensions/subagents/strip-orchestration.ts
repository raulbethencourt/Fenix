const TARGET_SECTION_PATTERNS = [
	/^# Depth-0 Hard Rule\s*\r?\n(?:^(?!#\s).*(?:\r?\n|$))*/gm,
	/^## Hard Rule: Delegate First, Always\s*\r?\n(?:^(?!#{1,2}\s).*(?:\r?\n|$))*/gm,
	/^## Agent Selection\s*\r?\n(?:^(?!#{1,2}\s).*(?:\r?\n|$))*/gm,
	/^## Delegation Rules\s*\r?\n(?:^(?!#{1,2}\s).*(?:\r?\n|$))*/gm,
	/^## TDD \(Default Development Flow\)\s*\r?\n(?:^(?!#{1,2}\s).*(?:\r?\n|$))*/gm,
];

const SESSION_ORCHESTRATION_HEADING_PATTERN = /^# Session Orchestration\s*\r?\n(?:(?!^#{1,6}\s).*(?:\r?\n|$))*/gm;
const DEPTH_ZERO_PARAGRAPH_PATTERN = /^If `PI_SUBAGENT_DEPTH=0`:[\s\S]*?(?=\r?\n\r?\n|^#{1,6}\s|(?![\s\S]))/gm;

export function stripParentOrchestrationContent(prompt: string): string {
	let rewritten = prompt;

	for (const pattern of TARGET_SECTION_PATTERNS) {
		rewritten = rewritten.replace(pattern, "");
	}

	rewritten = rewritten
		.replace(DEPTH_ZERO_PARAGRAPH_PATTERN, "")
		.replace(SESSION_ORCHESTRATION_HEADING_PATTERN, "")
		.replace(/(?:\r?\n){3,}/g, "\n\n");

	return rewritten;
}
