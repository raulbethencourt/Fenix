# Agent Evolution Plan

> Living document — tracks the roadmap for evolving the pi multi-agent orchestration system.

## Current Team

| Agent | Model | Tools | Role |
|---|---|---|---|
| **scout** | grok-code-fast-1 | read, grep, find, ls | Fast codebase investigator. Locates files, traces dependencies, returns structured findings. |
| **researcher** | claude-opus-4.6 | web_search, web_fetch | Web research specialist. Searches, fetches sources, synthesizes into sourced briefs. |
| **worker** | claude-sonnet-4.6 | read, write, edit, safe_bash | Isolated code executor. Reads before editing, makes targeted changes, verifies with commands. |
| **code-reviewer** | claude-sonnet-4-5 | read, grep, find, ls, rg | Git commit reviewer. APPROVE/REJECT with categorized issues (Critical/Important/Minor). |
| **distiller** | grok-code-fast-1 | read | Context compressor. Reduces large agent outputs to compact targeted summaries (10:1 ratio). |

## Current Orchestration

- **Topology**: Supervisor/Hierarchical — main pi agent routes to subagents
- **Patterns implemented**:
  - Scout → Worker Pipeline
  - Parallel Scout Fan-out
  - Researcher → Worker Pipeline
  - Worker → Code-Reviewer Loop
  - Full Reconnaissance
- **Max concurrency**: 4 parallel agents
- **Defined in**: `~/.pi/agent/skills/orchestrator/SKILL.md`
- **Enforced by**: `~/.pi/agent/extensions/delegation-enforcer/index.ts` (blocks direct tool use at orchestrator level)
- **Context savings**: `context-mode` extension loaded in all subagent processes via `subagents/index.ts`

## Research Findings

### Orchestration Strategies Evaluated

| Strategy | Status | Notes |
|---|---|---|
| Supervisor/Hierarchical | ✅ Active | Our current model — main agent routes to subagents |
| Pipeline/Sequential | ✅ Active | Scout → Worker, Researcher → Worker |
| Parallel Fan-out | ✅ Active | Max 4 concurrent subagents |
| Evaluator-Optimizer Loop | ✅ Active | Worker → Code-Reviewer with auto-retry protocol (max 2 retries, escalation on design issues) |
| Debate/Adversarial | ❌ Skipped | Expensive, low ROI for most coding tasks |
| Swarm/Dynamic Handoff | ❌ Skipped | Too unpredictable for our use case |

### Sources

- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [LangGraph Multi-Agent Concepts](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
- [AutoGen Design Patterns](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/)
- [CrewAI Crews Docs](https://docs.crewai.com/concepts/crews)
- [ChatDev Paper (arXiv 2307.07924)](https://arxiv.org/abs/2307.07924)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

## Roadmap — New Agents

### Phase 1: High Priority

#### 🏗️ Planner/Architect

- **Purpose**: Analyzes task requirements + codebase structure, designs approach, creates step-by-step implementation plan BEFORE worker starts coding
- **Why**: #1 differentiator in SWE-bench top performers. Prevents wasted worker cycles on wrong approaches.
- **Tools**: read, grep, find, ls (same as scout but with different system prompt focused on planning)
- **Outputs**: Implementation plan with file list, change description per file, dependency order, risk assessment
- **New pattern**: User request → Planner → Worker(s) → Code-Reviewer
- **Status**: [x] Complete — `~/.pi/agent/extensions/subagents/agents/planner.md`

#### 🧪 Tester

- **Purpose**: Writes unit/integration tests, runs test suites, reports pass/fail with diagnostics
- **Why**: Creates the evaluator-optimizer loop (Anthropic's most powerful agentic pattern). Catches regressions.
- **Tools**: read, write, edit, safe_bash
- **Outputs**: Test files, test execution results, pass/fail summary, failure diagnostics
- **New pattern**: Worker → Tester → if fail: Worker (with test feedback) → Tester (re-run)
- **Status**: [x] Complete — `~/.pi/agent/extensions/subagents/agents/tester.md`

### Phase 2: Medium Priority

#### 🔧 Debugger

- **Purpose**: Specialized backward reasoning from errors/failures → root cause → targeted fix
- **Why**: Debugging requires different reasoning than forward implementation. Separate expertise improves fix quality.
- **Tools**: read, grep, find, safe_bash
- **Outputs**: Root cause analysis, targeted fix, verification that fix resolves the issue
- **New pattern**: Tester (fail) → Debugger → Tester (re-run)
- **Status**: [x] Complete — `~/.pi/agent/extensions/subagents/agents/debugger.md`

#### 🔒 Security Auditor

- **Purpose**: Gate before commit — scans for hardcoded secrets, injection vulnerabilities, insecure dependencies, permission issues
- **Why**: Catches security issues that code-reviewer may miss (different focus)
- **Tools**: read, grep, find, safe_bash
- **Outputs**: PASS/FAIL with categorized findings (Critical/Warning/Info)
- **New pattern**: Code-Reviewer (APPROVE) → Security Auditor → if FAIL: Worker (fix) → loop
- **Status**: [x] Complete — `~/.pi/agent/extensions/subagents/agents/security-auditor.md`

### Phase 3: Low Priority

#### 📝 Doc Writer

- **Purpose**: Generates/updates documentation, README, API docs, changelog entries based on code changes
- **Why**: Automates the tedious post-coding documentation step
- **Tools**: read, write, edit
- **Outputs**: Updated docs, changelog entries, inline comments
- **New pattern**: Post Code-Reviewer approval → Doc Writer
- **Status**: [x] Complete — `~/.pi/agent/extensions/subagents/agents/doc-writer.md`

#### 🔄 Refactorer

- **Purpose**: Improves existing code quality — DRY violations, performance, readability — without changing behavior
- **Why**: Optional quality pass, useful for tech debt reduction
- **Tools**: read, write, edit, safe_bash
- **Outputs**: Refactored code with explanation of changes, test verification
- **New pattern**: Optional post-review pass, triggered on request
- **Status**: [x] Complete — `~/.pi/agent/extensions/subagents/agents/refactorer.md`

### Phase 4: Optimization & Tooling

Before adding new agents, optimize the existing team and build supporting infrastructure.

#### 📊 Model Selection Audit

- **Goal**: Evaluate all available models and assign the best model to each agent based on cost, speed, and capability
- **Tasks**:
  - List all available models from the provider (github-copilot models)
  - Benchmark/evaluate: speed, reasoning quality, cost per token
  - Match agents to optimal models:
    - Scout → needs speed, low cost (exploration is frequent)
    - Researcher → needs strong reasoning + large context (synthesizing web content)
    - Planner → needs strong reasoning (architecture decisions)
    - Worker → needs strong coding ability (writing/editing code)
    - Tester → needs coding + execution awareness (writing tests, reading output)
    - Code-reviewer → needs strong reasoning + attention to detail
  - Document choices with rationale
- **Status**: [x] Complete — see model assignments below
  - scout: grok-code-fast-1 (speed)
  - researcher: claude-opus-4.6 (1M ctx, best reasoning)
  - planner: claude-opus-4.6 (architecture decisions need best reasoning)
  - worker: gpt-5.3-codex (purpose-built for code generation, upgraded from 5.1 which failed in JSON mode)
  - tester: gpt-5.3-codex (purpose-built for code, upgraded from 5.1 which failed in JSON mode)
  - debugger: claude-opus-4.6 (deepest reasoning for root cause analysis)
  - security-auditor: claude-sonnet-4.6 (balance of thoroughness and speed)
  - doc-writer: claude-sonnet-4.6 (writing quality)
  - refactorer: gpt-5.3-codex (code restructuring, upgraded from 5.1 which failed in JSON mode)
  - code-reviewer: claude-opus-4.6 (strong reasoning for subtle bugs)

#### 🔧 Tools & Skills Audit

- **Goal**: Review all available tools, skills, and extensions — assign the right set to each agent
- **Tasks**:
  - Inventory all available tools (built-in + custom extensions)
  - Inventory all available skills that could benefit subagents
  - For each agent, determine:
    - Which tools it currently has vs which it should have
    - Whether any skills should be loaded for specific agents
    - Whether new custom tools are needed
  - Check for missing tool extensions (video_extract, youtube_search, google_image_search are mapped but don't exist)
  - Document the optimal tool assignment per agent
- **Status**: [x] Complete — added `skills` frontmatter support to `subagents/index.ts`, assigned skills per agent, updated tool sets (added rg to scout/planner, ls to debugger/security-auditor/doc-writer, grep/find/ls to refactorer)

#### 🖥️ Agent Dashboard Widget

- **Goal**: Build a TUI widget that shows real-time agent activity during orchestration
- **Requirements**:
  - Show which agents are currently running (with status: pending/running/completed/failed)
  - Progress indicator per agent (tools executed / estimated total, or elapsed time)
  - One-line summary of what each agent is currently doing (current tool + args)
  - Compact layout — should not dominate the terminal
  - Updates in real-time as subagents report progress
- **Implementation approach**:
  - Investigate pi's TUI component system (`@mariozechner/pi-tui`)
  - Check if the existing subagents extension `renderResult` can be enhanced
  - Or build a separate extension that hooks into subagent events
  - Reference: existing progress rendering in `extensions/subagents/index.ts` (renderAgentProgress function)
- **Status**: [x] Complete — compact dashboard in `subagents/index.ts` renderAgentProgress (progress bar, 2-3 lines per agent, smart status)

### Completed: Infrastructure Improvements

#### 🚫 Delegation Enforcer Extension

- **Goal**: Programmatically enforce that the orchestrator delegates all work to subagents instead of using file/code tools directly
- **Implementation**: Created `~/.pi/agent/extensions/delegation-enforcer/index.ts`
  - PreToolUse hook blocks `read, write, edit, bash, safe_bash, grep, find, ls` at orchestrator level (depth 0)
  - Allows `subagent, ask_user_question, web_search, web_fetch` and all MCP tools
  - `/delegation` command toggles bypass for escape hatch
  - Subagents (depth ≥ 1) are unaffected
- **Status**: [x] Complete

#### 🔄 Context-Mode Integration

- **Goal**: Enable context-mode in subagent processes for token savings on large outputs
- **Problem**: `buildPiArgs` passed `--no-extensions`, blocking context-mode from loading in subagents
- **Implementation**: Added `resolveContextModeExtension()` to `subagents/index.ts` that dynamically finds the context-mode extension path from global npm, loads it via `--extension` flag for all subagent processes
- **Status**: [x] Complete

#### 📝 Orchestrator Skill Cleanup

- **Goal**: Remove redundant delegation rules from orchestrator skill (now enforced by delegation-enforcer extension)
- **Implementation**: Stripped Delegation Policy section from `orchestrator/SKILL.md`, kept Agent Selection, Task Decomposition, and Implementation Discipline. Added note referencing the extension.
- **Status**: [x] Complete

#### 🗜️ Context Distiller Agent

- **Goal**: Compress large agent outputs before passing to next agent in pipeline
- **Implementation**: Created `~/.pi/agent/extensions/subagents/agents/distiller.md`
  - Uses grok-code-fast-1 (fast, cheap — haiku-4.5 not supported on github-copilot)
  - 10:1 compression target
  - Added Distilled Pipeline pattern to orchestrator skill
  - Added distiller to Agent Selection table
- **Status**: [x] Complete

### Phase 5: Quality & Maintenance

#### 🧪 Test Coverage for All TypeScript Files

- **Goal**: Add comprehensive tests for all `.ts` files in the agent extensions and subagents codebase
- **Tasks**:
  - Inventory all `.ts` files under `~/.pi/agent/extensions/`
  - Write unit tests for each module (pure functions, hooks, event handlers)
  - Write integration tests for extension loading and agent orchestration flows
  - Use the **tester** agent to generate and run tests
  - Ensure edge cases and error paths are covered
  - Set up a test runner (vitest or similar) if not already configured
- **Status**: [ ] Pending

#### 🔄 Codebase Refactoring Pass

- **Goal**: Improve code quality across all `.ts` files — reduce duplication, improve readability, enforce consistency
- **Tasks**:
  - Use the **refactorer** agent to audit each `.ts` file for:
    - DRY violations and shared utility extraction
    - Consistent error handling patterns
    - Type safety improvements
    - Dead code removal
    - Naming consistency
  - Verify no behavioral changes via test suite (Phase 5.1 must be complete first)
  - Document significant refactoring decisions
- **Status**: [ ] Pending — depends on test coverage (Phase 5.1)

## Future Patterns to Explore

### Persistent Memory Agent

- Maintains codebase knowledge graph across sessions
- Feeds context to other agents to reduce re-discovery
- Inspired by Devin and Cursor background agents

### Checkpoint/Rollback Pattern

- Save state before major changes
- If downstream validation fails beyond threshold, rollback rather than patch
- Requires git integration or file snapshot mechanism

### Speculative Execution

- Spawn multiple workers with different approaches in parallel
- Judge agent picks the best result
- Expensive but effective for hard problems

## Implementation Notes

- Agent definitions live in: `~/.pi/agent/extensions/subagents/agents/`
- Each agent is a `.md` file with frontmatter (name, description, tools, model) + system prompt body
- Custom tools mapped in: `~/.pi/agent/extensions/subagents/index.ts` (CUSTOM_TOOL_EXTENSIONS)
- Orchestration rules in: `~/.pi/agent/skills/orchestrator/SKILL.md`
- Max concurrency configurable via: `~/.pi/agent/extensions/subagents/config.json`

## Changelog

- **2026-05-03**: Added Phase 5 — test coverage for all TS files (using tester agent) and codebase refactoring pass (using refactorer agent).
- **2026-05-03**: Final validation — distiller model fixed (haiku→grok), delegation enforcer confirmed working (blocks orchestrator direct tool use), context-mode confirmed working in MCP and subagents. All systems operational.
- **2026-05-03**: Added distiller agent (context compression), Distilled Pipeline pattern in orchestrator skill, updated evolution plan.
- **2026-05-03**: Plan audit — fixed Tools & Skills status, corrected model assignments (gpt-5.1-codex → gpt-5.3-codex), documented delegation-enforcer extension, context-mode integration, and orchestrator skill cleanup.
- **2026-05-02**: Phase 4 complete — model audit done, tools/skills audit done with skills support in subagents extension, compact agent dashboard widget built.
- **2026-05-02**: Phase 4.1 complete — model selection audit done. Upgraded planner/debugger/code-reviewer to claude-opus-4.6, worker/tester/refactorer to gpt-5.1-codex.
- **2026-05-02**: Phase 3 complete — created doc-writer and refactorer agents.
- **2026-05-02**: Phase 2 complete — created debugger and security-auditor agents. Updated orchestrator with Tester → Debugger → Tester Loop pattern and security-auditor gate in Full Reconnaissance.
- **2026-05-02**: Added Pre-Phase 2 section — model selection audit, tools/skills audit, and agent dashboard widget.
- **2026-05-02**: Phase 1 complete — created planner and tester agents. Updated orchestrator skill with Planner → Worker Pipeline, Worker → Tester Validation Loop, and updated Full Reconnaissance pattern.
- **2026-05-02**: Evaluator-Optimizer Loop completed — added auto-retry protocol to Worker → Code-Reviewer pattern in orchestrator skill.
- **2026-05-02**: Initial plan created. Current team documented. Research findings added. Roadmap defined with 3 phases.
