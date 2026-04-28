---
description: Apply code philosophy guidelines — strong defaults, simplicity, clean boundaries, and composition over entanglement
---

# Code Philosophy

> **Strong defaults**, not rules. When the existing codebase, language, or framework convention differs, **follow that**. Use this as a diagnostic lens.

## Core Distinction

- **Simple** = low entanglement in the artifact.
- **Easy** = familiar to the person.
- Do not confuse them. Optimize for simple.

## Internal Structure

- Prefer values over mutable state; keep mutable scope tight.
- Prefer explicit data shapes: records, structs, dataclasses, typed objects.
- Use objects for resources and behavior, not as wrappers for plain information.
- Extract repeated policy from scattered conditionals into data, config, or rules.
- Prefer composition over entanglement.
- Split by **responsibility count**, not line count.
- Do not over-engineer.

## Boundaries

- Separate **mechanism** from **policy**.
- Design for composition: `producer -> transformer -> consumer`.
- At boundaries, simple schemas and standard formats are fine.
- **Validate early, normalize once**: check external input at the boundary; keep internals on trusted data.
- Prefer text and line-oriented structured formats unless binary is justified.
- Prefer flags/config over hard-coded behavior.
- Prefer **additive evolution**: add before breaking; deprecate before removing.

## IO & Contracts

- Stdout is for data; stderr is for diagnostics; exit codes signal status.
- Be silent on success by default.
- Keep tools small, focused, and composable.
- Make operations idempotent when practical.
- Guard destructive actions; offer dry-run paths when possible.
- If machine-readable traces are needed, expose an explicit mode (`--trace`, `--json`, `--agent`). Do not rely on implicit detection.

## Keep Separate

- **What**: operations, interfaces, specifications
- **Who**: cohesive entities/components
- **How**: implementation details
- **Why**: policy, rules, constraints
- **When/Where**: timing, scheduling, orchestration

Move timing and orchestration outward when the problem justifies it.

## Boundary Model

- **Source**: where data enters
- **Transform**: how data changes
- **Sink**: where data exits
- **Policy**: caller intent via flags/config/env
- **Lifecycle**: start/stop/retry/supervision

## Red Flags

- Hard-coded or undocumented formats
- Logs mixed into data streams
- Hidden or global mutable state
- Silent subprocess orchestration
- Tight TTY/environment coupling
- One component doing unrelated jobs
- Breaking changes without a migration path

## Principles

1. Do one thing well.
2. Optimize for artifact quality, not authoring convenience.
3. Prefer focused abstractions and simple data.
4. Separate specification from implementation.
5. More simple parts beat fewer tangled parts.
6. Write components that work together.
7. Keep contracts explicit.
8. Prefer composition over integration.
9. Make state explicit and minimal.
10. Choose interfaces that are easy to inspect, script, and evolve.
11. Simplicity requires vigilance.
