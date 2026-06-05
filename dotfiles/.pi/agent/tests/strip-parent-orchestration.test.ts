import { describe, it, expect } from "vitest";
import { stripParentOrchestrationContent } from "../extensions/subagents/strip-orchestration.ts";

const DEPTH0_BLOCK = `# Depth-0 Hard Rule

If \`PI_SUBAGENT_DEPTH=0\`: your only tools are \`subagent\` and \`ask_user_question\`.
All other tools are BLOCKED by the delegation-enforcer extension.

# Language Rule

Always respond in English.
`;

const DELEGATE_FIRST_BLOCK = `# Session Orchestration

## Hard Rule: Delegate First, Always

At depth 0 you have two action tools.
Every other tool is BLOCKED.

## Agent Selection

| Task signal | Agent |
|---|---|
| read files | scout |

## Delegation Rules

Give goals, not instructions.

## TDD (Default Development Flow)

Features use TDD by default.

## Token Efficiency

Minimize output tokens.
`;

describe("stripParentOrchestrationContent", () => {
	it("strips # Depth-0 Hard Rule block entirely", () => {
		const result = stripParentOrchestrationContent(DEPTH0_BLOCK);
		expect(result).not.toContain("# Depth-0 Hard Rule");
		expect(result).not.toContain("PI_SUBAGENT_DEPTH=0");
		expect(result).not.toContain("delegation-enforcer extension");
	});

	it("strips ## Hard Rule: Delegate First, Always and its body up to next sibling heading", () => {
		const result = stripParentOrchestrationContent(DELEGATE_FIRST_BLOCK);
		expect(result).not.toContain("## Hard Rule: Delegate First, Always");
		expect(result).not.toContain("Every other tool is BLOCKED");
	});

	it("strips ## Agent Selection section", () => {
		const result = stripParentOrchestrationContent(DELEGATE_FIRST_BLOCK);
		expect(result).not.toContain("## Agent Selection");
		expect(result).not.toContain("scout");
	});

	it("strips ## Delegation Rules section", () => {
		const result = stripParentOrchestrationContent(DELEGATE_FIRST_BLOCK);
		expect(result).not.toContain("## Delegation Rules");
		expect(result).not.toContain("Give goals, not instructions");
	});

	it("strips ## TDD (Default Development Flow) section", () => {
		const result = stripParentOrchestrationContent(DELEGATE_FIRST_BLOCK);
		expect(result).not.toContain("## TDD (Default Development Flow)");
		expect(result).not.toContain("Features use TDD by default");
	});

	it("preserves ## Token Efficiency section", () => {
		const result = stripParentOrchestrationContent(DELEGATE_FIRST_BLOCK);
		expect(result).toContain("## Token Efficiency");
		expect(result).toContain("Minimize output tokens");
	});

	it("preserves ## Language Rule section", () => {
		const result = stripParentOrchestrationContent(DEPTH0_BLOCK);
		expect(result).toContain("# Language Rule");
		expect(result).toContain("Always respond in English");
	});

	it("is idempotent: f(f(x)) === f(x)", () => {
		const once = stripParentOrchestrationContent(DELEGATE_FIRST_BLOCK);
		const twice = stripParentOrchestrationContent(once);
		expect(twice).toBe(once);
	});

	it("returns input unchanged when no target headings are present", () => {
		const plain = "## Language Rule\n\nAlways respond in English.\n\n## Token Efficiency\n\nBe brief.\n";
		expect(stripParentOrchestrationContent(plain)).toBe(plain);
	});

	it("strips a standalone PI_SUBAGENT_DEPTH paragraph not under a Depth-0 Hard Rule heading", () => {
		const input = `## Some Other Section

If \`PI_SUBAGENT_DEPTH=0\`: your only tools are subagent and ask_user_question.
All other tools are BLOCKED. Do not attempt them.

## Keep Me

This must stay.
`;
		const result = stripParentOrchestrationContent(input);
		expect(result).not.toContain("PI_SUBAGENT_DEPTH=0");
		expect(result).not.toContain("All other tools are BLOCKED. Do not attempt them.");
		expect(result).toContain("## Some Other Section");
		expect(result).toContain("## Keep Me");
		expect(result).toContain("This must stay.");
	});

	it("strips Session Orchestration heading AND any free-text body before the first subheading", () => {
		const input = `# Session Orchestration

This intro paragraph belongs to Session Orchestration and must be removed.

## Agent Selection

routing table here

## Token Efficiency

This must stay.
`;
		const result = stripParentOrchestrationContent(input);
		expect(result).not.toContain("# Session Orchestration");
		expect(result).not.toContain("This intro paragraph belongs to Session Orchestration");
		expect(result).not.toContain("## Agent Selection");
		expect(result).not.toContain("routing table here");
		expect(result).toContain("## Token Efficiency");
		expect(result).toContain("This must stay.");
	});
});
