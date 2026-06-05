import { describe, it, expect } from "vitest";
import { applyAgentOverrides } from "../extensions/subagents/agent-overrides.ts";
import type { OverridableAgent, AgentOverrides } from "../extensions/subagents/agent-overrides.ts";

const baseAgent: OverridableAgent = {
  name: "worker",
  model: "claude-sonnet",
  tools: ["bash", "read", "edit"],
};

function fresh(): OverridableAgent {
  return { ...baseAgent, tools: [...baseAgent.tools] };
}

describe("applyAgentOverrides", () => {
  it("1. undefined overrides → structurally equal agent", () => {
    expect(applyAgentOverrides(fresh(), undefined)).toEqual(baseAgent);
  });

  it("2. empty overrides object → structurally equal agent", () => {
    expect(applyAgentOverrides(fresh(), {})).toEqual(baseAgent);
  });

  it("3. override entry for different agent → structurally equal agent", () => {
    const overrides: AgentOverrides = { scout: { model: "claude-haiku" } };
    expect(applyAgentOverrides(fresh(), overrides)).toEqual(baseAgent);
  });

  it("4. model override replaces agent.model", () => {
    const result = applyAgentOverrides(fresh(), { worker: { model: "claude-haiku" } });
    expect(result.model).toBe("claude-haiku");
    expect(result.tools).toEqual(["bash", "read", "edit"]);
  });

  it("5. tools override REPLACES tools wholesale (not merged)", () => {
    const result = applyAgentOverrides(fresh(), { worker: { tools: ["read"] } });
    expect(result.tools).toEqual(["read"]);
    expect(result.tools).not.toContain("bash");
    expect(result.tools).not.toContain("edit");
  });

  it("6. tools: [] replaces with empty array", () => {
    const result = applyAgentOverrides(fresh(), { worker: { tools: [] } });
    expect(result.tools).toEqual([]);
  });

  it("7. extra fields (disabled: true) silently ignored; model still applies", () => {
    const override = { model: "claude-x", disabled: true } as any;
    const result = applyAgentOverrides(fresh(), { worker: override });
    expect(result.model).toBe("claude-x");
    expect((result as any).disabled).toBeUndefined();
    expect(result.tools).toEqual(baseAgent.tools);
  });

  it("8. input agent is NOT mutated", () => {
    const input = fresh();
    const snapshot = JSON.stringify(input);
    applyAgentOverrides(input, { worker: { model: "claude-haiku", tools: ["read"] } });
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("9. idempotency: applying twice equals applying once", () => {
    const overrides: AgentOverrides = { worker: { model: "claude-haiku", tools: ["read"] } };
    const once = applyAgentOverrides(fresh(), overrides);
    const twice = applyAgentOverrides(applyAgentOverrides(fresh(), overrides), overrides);
    expect(twice).toEqual(once);
  });

  it("10. combined: both model and tools applied", () => {
    const result = applyAgentOverrides(fresh(), { worker: { model: "claude-haiku", tools: ["read"] } });
    expect(result.model).toBe("claude-haiku");
    expect(result.tools).toEqual(["read"]);
  });

  it("11. only model set → tools unchanged", () => {
    const result = applyAgentOverrides(fresh(), { worker: { model: "claude-haiku" } });
    expect(result.tools).toEqual(["bash", "read", "edit"]);
  });

  it("12. only tools set → model unchanged", () => {
    const result = applyAgentOverrides(fresh(), { worker: { tools: ["read"] } });
    expect(result.model).toBe("claude-sonnet");
  });

  it("13. filters non-string elements out of a tools override", () => {
    const agent: OverridableAgent = { name: "worker", tools: ["bash"] };
    const result = applyAgentOverrides(agent, { worker: { tools: [null, 42, {}, "read", "edit"] as any } });
    expect(result.tools).toEqual(["read", "edit"]);
  });

  it("14. treats a non-object per-agent override value as a no-op", () => {
    const agent: OverridableAgent = { name: "worker", tools: ["bash"] };
    const r1 = applyAgentOverrides(agent, { worker: "string" as any });
    expect(r1.name).toBe("worker");
    expect(r1.tools).toEqual(["bash"]);
    expect(r1.model).toBeUndefined();

    const r2 = applyAgentOverrides(agent, { worker: null as any });
    expect(r2.name).toBe("worker");
    expect(r2.tools).toEqual(["bash"]);
    expect(r2.model).toBeUndefined();
  });
});
