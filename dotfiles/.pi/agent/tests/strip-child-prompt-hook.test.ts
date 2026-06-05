import { describe, it, expect } from "vitest";
import { stripChildPromptHook } from "../extensions/subagents/strip-child-prompt-hook.ts";

const ORCHESTRATION_BLOCK = `# Session Orchestration

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

const DEPTH0_BLOCK = `# Depth-0 Hard Rule

If \`PI_SUBAGENT_DEPTH=0\`: your only tools are \`subagent\` and \`ask_user_question\`.
All other tools are BLOCKED by the delegation-enforcer extension.

# Language Rule

Always respond in English.
`;

describe("stripChildPromptHook", () => {
  it("case 1: depth=0, prompt has orchestrator content → returns undefined (parent untouched)", () => {
    const event = { systemPrompt: ORCHESTRATION_BLOCK };
    expect(stripChildPromptHook(event, 0)).toBeUndefined();
  });

  it("case 2: depth=-1 (defensive) → returns undefined", () => {
    const event = { systemPrompt: ORCHESTRATION_BLOCK };
    expect(stripChildPromptHook(event, -1)).toBeUndefined();
  });

  it("case 3: depth=1, prompt has # Session Orchestration → returns stripped systemPrompt", () => {
    const event = { systemPrompt: ORCHESTRATION_BLOCK };
    const result = stripChildPromptHook(event, 1);
    expect(result).not.toBeUndefined();
    expect(result!.systemPrompt).not.toContain("# Session Orchestration");
    expect(result!.systemPrompt).not.toContain("Every other tool is BLOCKED");
  });

  it("case 4: depth=1, prompt has ## Hard Rule: Delegate First, Always → section removed", () => {
    const event = { systemPrompt: ORCHESTRATION_BLOCK };
    const result = stripChildPromptHook(event, 1);
    expect(result).not.toBeUndefined();
    expect(result!.systemPrompt).not.toContain("## Hard Rule: Delegate First, Always");
  });

  it("case 5: depth=2, prompt has # Depth-0 Hard Rule → section removed", () => {
    const event = { systemPrompt: DEPTH0_BLOCK };
    const result = stripChildPromptHook(event, 2);
    expect(result).not.toBeUndefined();
    expect(result!.systemPrompt).not.toContain("# Depth-0 Hard Rule");
    expect(result!.systemPrompt).not.toContain("PI_SUBAGENT_DEPTH=0");
  });

  it("case 6: depth=1, prompt has no orchestrator content → returns undefined (no-op)", () => {
    const plain = "## Token Efficiency\n\nBe brief.\n";
    const event = { systemPrompt: plain };
    expect(stripChildPromptHook(event, 1)).toBeUndefined();
  });

  it("case 7: depth=1, empty string prompt → returns undefined", () => {
    const event = { systemPrompt: "" };
    expect(stripChildPromptHook(event, 1)).toBeUndefined();
  });

  it("case 8: depth=1, orchestrator + Token Efficiency → strips orchestrator, keeps Token Efficiency", () => {
    const event = { systemPrompt: ORCHESTRATION_BLOCK };
    const result = stripChildPromptHook(event, 1);
    expect(result).not.toBeUndefined();
    expect(result!.systemPrompt).not.toContain("## Agent Selection");
    expect(result!.systemPrompt).not.toContain("## TDD (Default Development Flow)");
    expect(result!.systemPrompt).toContain("## Token Efficiency");
    expect(result!.systemPrompt).toContain("Minimize output tokens");
  });

  it("case 9: input event is NOT mutated after call", () => {
    const original = ORCHESTRATION_BLOCK;
    const event = { systemPrompt: original };
    stripChildPromptHook(event, 1);
    expect(event.systemPrompt).toBe(original);
  });

  it("case 10: treats NaN depth as a no-op (parent-side defense)", () => {
    // NaN <= 0 is false, so without a guard the strip runs; spec requires undefined
    const event = { systemPrompt: ORCHESTRATION_BLOCK };
    expect(stripChildPromptHook(event, NaN)).toBeUndefined();
  });

  it("case 11: second call on the already-stripped prompt returns undefined", () => {
    const event = { systemPrompt: ORCHESTRATION_BLOCK };
    const first = stripChildPromptHook(event, 1);
    expect(first).not.toBeUndefined();
    const second = stripChildPromptHook({ systemPrompt: first!.systemPrompt }, 1);
    expect(second).toBeUndefined();
  });
});
