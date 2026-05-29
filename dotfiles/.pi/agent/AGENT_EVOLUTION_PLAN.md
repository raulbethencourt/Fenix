# Agent Evolution Plan

> Living document — tracks the roadmap for evolving the pi multi-agent orchestration system.

## Current Team

| Agent | Model | Tools | Role |
|---|---|---|---|
| **scout** | gpt-5.4-mini | read, grep, find, ls | Fast codebase investigator. Locates files, traces dependencies, returns structured findings. |
| **researcher** | claude-opus-4.6 | web_search, web_fetch | Web research specialist. Searches, fetches sources, synthesizes into sourced briefs. |
| **worker** | claude-sonnet-4.6 | read, write, edit, safe_bash | Isolated code executor. Reads before editing, makes targeted changes, verifies with commands. |
| **code-reviewer** | claude-sonnet-4-5 | read, grep, find, ls, rg | Git commit reviewer. APPROVE/REJECT with categorized issues (Critical/Important/Minor). |

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
  - scout: gpt-5.4-mini (fast recon, routed to gpt-5.4 for complex tasks)
  - researcher: gemini-3.1-pro-preview (Google long-context synthesis + third vendor perspective)
  - planner: claude-sonnet-4.6 (default planning; escalate to opus-4.7 only when explicitly needed)
  - worker: gpt-5.4 (fast code gen, routed: simple→gpt-5.4-mini; no automatic gpt-5.5)
  - tester: claude-sonnet-4.5 (adversarial vendor diversity vs OpenAI worker, routed to sonnet-4.6 for complex)
  - sugar-tester: claude-sonnet-4.5 (same rationale as tester)
  - debugger: gpt-5.4 (OpenAI for vendor diversity in debugger→tester loop; escalate to opus-4.7 for hard failures)
  - security-auditor: claude-sonnet-4.6 (stage-1 scan, escalates to opus-4.7 deep)
  - security-auditor-deep: claude-opus-4.7 (escalation tier)
  - doc-writer: claude-sonnet-4.5 (fast formulaic writing)
  - refactorer: gpt-5.4 (code restructuring; no automatic gpt-5.5)
  - code-reviewer: claude-sonnet-4.6 (stage-1 review, escalates to opus-4.7 deep)
  - code-reviewer-deep: claude-opus-4.7 (escalation tier)
  - critic: gemini-3.1-pro-preview (Google adversarial perspective against Anthropic planner)

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
- **Status**: [x] Complete — 165 tests across 10 suites covering 11/15 extension files

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
- **Status**: [x] Complete — extracted shared/format.ts and shared/content.ts, deduplicated review.ts selectors, fixed `any` casts, removed dead code. 173 tests passing.

### Phase 6: Research-Driven Improvements

> Based on research synthesis: see [RESEARCH_AGENTIC_WORKFLOWS.md](./RESEARCH_AGENTIC_WORKFLOWS.md)

#### 🧪 SugarCRM Testing Skill

- **Goal**: Dedicated skill for writing and running tests across three SugarCRM frameworks — PHPUnit unit/integration tests, bns end-to-end curl tests, and bns scheduler batch tests
- **Implementation**: Created `skills/sugarcrm-testing/SKILL.md` covering all three test types with format examples, naming conventions, variable references, and test creation workflow. Added skill to tester agent.
- **Status**: [x] Complete

#### 🌳 Tree-sitter Repo Map

- **Goal**: Build Aider-style structural codebase maps for scout/planner — fits entire repo in ~2K tokens
- **Implementation**: Created `subagents/tools/repo-map.ts` extension using ast-grep (tree-sitter under the hood) with `--inline-rules` to extract definition kinds (function_declaration, class_declaration, interface_declaration, type_alias_declaration, enum_declaration, method_definition). JSON stream output piped to inline Node.js formatter that groups by file, sorts, and trims to token budget. Added to scout and planner agents.
- **Status**: [x] Complete

#### 🔍 ast-grep Integration

- **Goal**: Add AST-based structural code search/replace as a tool for scout, refactorer, security-auditor
- **Implementation**: Installed `ast-grep` system-wide (`/usr/bin/sg`). Created custom tool extension `tools/ast-grep.ts` with pattern/lang/paths/rule/format params. Registered in CUSTOM_TOOL_EXTENSIONS. Added `ast_grep` tool to scout, planner, debugger, refactorer, and security-auditor agents.
- **Status**: [x] Complete

#### 🧠 Persistent Memory (Three-Tier)

- **Goal**: Cross-session knowledge persistence — accumulated architectural knowledge, tried approaches, failure patterns, codebase evolution over weeks/months
- **Implementation**: Evaluate options before building:
  1. **Graphiti** (getzep/graphiti) — temporal knowledge graph, MCP-compatible, agent-native
  2. **Native SQLite** — lightweight fact store with FTS5 search, managed alongside analytics.db
  3. **Memory MCP server** — structured memory with semantic retrieval
  - Separate from session continuity — this is long-term knowledge, not single-session state
  - Needs: schema design, retrieval strategy, staleness/expiry handling, token budget impact analysis
- **Note**: Pi's built-in session system already persists conversation history, tool results, and branch state in JSONL files. Persistent memory should complement (not duplicate) this.
- **Status**: [x] Complete (Phase 1) — simple markdown memory files at `~/.pi/data/memory/<project-hash>.md`. Tool: `memory(remember|recall|forget|list)`. Available to planner + scout. Evaluated Graphiti (too heavy, LLM cost), Memory MCP (subagents can't access), SQLite+FTS5 (over-engineered for start). Phase 2 (SQLite upgrade) and Phase 3 (semantic search) deferred until markdown approach proves insufficient.

#### 📋 Shared Workspace / Blackboard

- **Goal**: Common state object for inter-agent coordination during orchestration
- **Implementation**: Created `subagents/tools/workspace.ts` — shared JSON document at `/tmp/pi-workspace-<hash>.json` (hash of CWD). Tool supports `read`, `write`, `append`, `clear`, `keys` operations with dot-notation key paths. Added `workspace` tool to all 9 agents (planner, worker, tester, debugger, security-auditor, doc-writer, refactorer, scout, code-reviewer).
- **Status**: [x] Complete

#### 🎰 MCTS-lite for Complex Tasks

- **Goal**: Generate multiple candidate solutions, test-select the best
- **Implementation**: Parallel worker agents with tester-based selection
- **Status**: [ ] Pending

#### 📊 Observability & Token Analytics

- **Goal**: Persistent token/cost tracking across all sessions. Answer: "How much did I spend this week?", "Which agent is most expensive?", "What's my cost trend?"
- **Approach**: Option B — hook into `subagents/index.ts` after `runSubagent()` returns (usage data already parsed there)
- **Implementation**:
  1. SQLite DB at `~/.pi/data/analytics.db` with schema:
     ```sql
     CREATE TABLE runs (
       id INTEGER PRIMARY KEY,
       timestamp TEXT,        -- ISO 8601
       session_id TEXT,       -- pi session identifier
       agent TEXT,            -- worker, scout, planner...
       model TEXT,            -- which model was used
       task_summary TEXT,     -- first 200 chars of task
       input_tokens INTEGER,
       output_tokens INTEGER,
       cache_read INTEGER,
       cache_write INTEGER,
       cost_usd REAL,
       turns INTEGER,
       duration_ms INTEGER,
       exit_code INTEGER,     -- 0 = success, non-zero = failure
       cwd TEXT               -- project directory
     );
     ```
  2. ~20 lines added to subagents/index.ts: after each run completes, INSERT row with usage
  3. New tool `token_stats` (in `subagents/tools/token-stats.ts`) that queries the DB:
     - `--today` → today's cost + tokens
     - `--week` → this week breakdown by agent
     - `--agent <name>` → specific agent history
     - `--project <path>` → per-project spending
     - `--expensive <N>` → top N most expensive runs
  4. Optional later: HTML dashboard (ctx-insight style)
- **Status**: [x] Complete — SQLite telemetry in `subagents/telemetry.ts`, `token_stats` tool in `subagents/tools/token-stats.ts`, `/token_stats` slash command in `extensions/token-stats-cmd/index.ts` (scrollable TUI dashboard with summary, by-agent, by-model, by-day bar chart, top 5 expensive runs, by-project)

### Phase 7: Company Vault Integration

#### 📚 Company Knowledge Base (`~/vaults/TECHNIQUE/`)

- **Goal**: Integrate the company Obsidian vault as a live knowledge base — agents automatically search it for context and write documentation back after significant work
- **Vault**: `~/vaults/TECHNIQUE/` — Obsidian markdown, French, YAML frontmatter (id, aliases, tags), wikilinks, callout blocks, `media_*` attachment folders
- **Folder structure**: `SUGAR CRM/`, `HOSTING/`, `DEVS TOOLS & MORE/`, `DEPLOIMENT/`, `FRESHWORKS/`, `MAJ/`, `Méthode de travail/`, `WORK IN PROGRESS/`, `NEW CRM/`

##### READ side — Vault Search
- **Search tools**: Graphify MCP (`query_graph`, `get_node`, `get_neighbors`, `shortest_path`) + Obsidian CLI (read notes, query backlinks)
- **Agents with access**: Scout + Planner (read-only)
- **Trigger**: Automatic — orchestrator dispatches vault search before any task touching vault topics (SugarCRM, hosting, deployment, PHP, integrations, tooling, work methods)
- **Pi's role**: Consumer only — search infrastructure (indexing, graph builds) managed separately

##### WRITE side — Auto-Documentation
- **Agent**: Doc-writer only (single point of control, no other agent writes to vault)
- **Method**: Direct file write to `~/vaults/TECHNIQUE/`
- **Placement**: Auto-inferred from vault folder structure + content topic
- **Format**: Match existing vault conventions — French titles, YAML frontmatter, wikilinks `[[note-name]]`, callout blocks `>[!IMPORTANT]`, kebab-case or space-separated filenames
- **Trigger**: Post-task auto-doc — orchestrator dispatches doc-writer after significant work (SugarCRM upgrades, server config changes, deployment procedures, etc.)

##### Implementation Tasks
1. **Vault skill** — create `skills/vault/SKILL.md` teaching agents the vault structure, folder mapping, note format conventions, and search tool usage
   - Status: [ ] Pending
2. **Orchestrator update** — add vault search step to task pipelines (pre-task for read, post-task for write) in `skills/orchestrator/SKILL.md`
   - Status: [ ] Pending
3. **MCP tool registration** — connect Graphify MCP server + Obsidian CLI as available tools for scout and planner agents
   - Status: [ ] Pending
4. **Doc-writer update** — add vault write permissions, note template with YAML frontmatter, folder inference logic to `agents/doc-writer.md`
   - Status: [ ] Pending
5. **Integration tests** — verify read path (search → results) and write path (task → doc created in correct folder with correct format)
   - Status: [ ] Pending

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

- **2026-05-11**: Persistent Memory Phase 1 complete. Simple markdown-based memory (`extensions/memory/index.ts`). Per-project files at `~/.pi/data/memory/`. Tool ops: remember/recall/forget/list. Added to planner + scout agents. Evaluated Graphiti (rejected: heavy infra + LLM cost), Memory MCP (rejected: subagents can't access), SQLite+FTS5 (deferred: over-engineered for start). Critic recommended starting simple. 13 memory tests, 479 full suite.
- **2026-05-10**: Mobile Bridge Phase 2 (Hardening) complete. HTTPS self-signed cert, Authorization Bearer header, token rotation (/mobile rotate), configurable rate limiting, input validation, error logging (/mobile logs + getBridgeLogs()), graceful KDE degradation. 117 mobile-bridge tests, 465 full suite.
- **2026-05-10**: Mobile Bridge Phase 0 + Phase 1 complete. Android LAN companion for pi — phone sends messages via local HTTP bridge, receives KDE Connect notifications on final answers. Features: auto LAN IP detection, auto KDE device detection, `/mobile link` URL sharing, `/mobile status`/`devices`/`devices debug`, token auth, rate limiting, last 10 answers history, multi-instance registry with dynamic ports, landing page instance picker. 87 mobile-bridge tests, 435 full suite. Plan at `MOBILE_BRIDGE_PLAN.md`.
- **2026-05-10**: Gemini adoption. Verified `github-copilot/gemini-3-flash-preview` and `github-copilot/gemini-3.1-pro-preview` work. Moved critic + researcher to `gemini-3.1-pro-preview` for third-vendor perspective and likely better price stability. Free opencode models (`minimax-m2.5-free`, `nemotron-3-super-free`) verified working but reserved for non-critical future helpers.
- **2026-05-10**: Vendor diversity pass. Moved researcher and debugger from claude-sonnet-4.6 to gpt-5.4 (OpenAI). Split is now 6 OpenAI / 8 Anthropic (was 4/10). All cross-checking pairs now have vendor diversity.
- **2026-05-10**: Cost-aware routing revision. Removed automatic GPT-5.5 routing (too expensive without real cost telemetry). Moved planner/debugger defaults back to claude-sonnet-4.6; Opus 4.7 reserved for explicit/deep escalation only. Future work: estimated-cost telemetry + budget/SLA profiles.
- **2026-05-10**: Model re-evaluation + complexity router complete. Reassigned 11 agent models: worker→gpt-5.4, tester/sugar-tester→claude-sonnet-4.5 (vendor diversity), planner/debugger→claude-opus-4.7, doc-writer→claude-sonnet-4.5, refactorer→gpt-5.4, deep variants→opus-4.7. Gemini models unavailable on GitHub Copilot. Created `routing.ts` + `routing.json` — complexity-based model routing for worker/tester/refactorer/scout (simple/standard/complex tiers). 13 new tests. Wired into subagents runtime via `resolveModel()`.
- **2026-05-10**: Removed Session Continuity (`/save` + `/resume`) — redundant with pi's built-in session system (JSONL persistence of conversation, tool results, branch state). Expanded Persistent Memory (Three-Tier) with evaluation criteria.
- **2026-05-10**: Added Phase 7 — Company Vault Integration (`~/vaults/TECHNIQUE/`). READ: Scout + Planner search via Graphify MCP + Obsidian CLI (automatic, consumer-only). WRITE: Doc-writer only, direct file write, auto-placed, matching vault conventions (French, YAML frontmatter, wikilinks). Triggered post-task for significant work. 5 implementation tasks defined.
- **2026-05-06**: Observability & Token Analytics complete. Created `/token_stats` slash command (`extensions/token-stats-cmd/index.ts`) — scrollable TUI dashboard showing summary, per-agent/model/day/project breakdowns, ASCII bar chart, top 5 expensive runs. Supports period argument (today/week/month/all). Auto-discovered by pi extension loader.
- **2026-05-06**: Model upgrades: Changed scout model from grok-code-fast-1 to gpt-5.4-mini to improve codebase comprehension while maintaining parallel fan-out speed.
- **2026-05-06**: TDD-First enforcement implemented. Replaced test-after flow with test-first (RED→GREEN→REFACTOR). Sugar-tester is primary test agent (80% SugarCRM work). Added RED Phase to sugar-tester and tester agents. Added "Testable Behaviors" output requirement to planner. Updated orchestrator with TDD Loop pattern. Soft enforcement — bypassable with "skip tests"/"spike"/"prototype"/"no tests". Updated AGENTS.md global workflows.
- **2026-05-05**: Test Enforcement system implemented. Created `subagents/tools/test-config.ts` (auto-detects vitest/jest/phpunit/pytest/go/bats/mocha, stores at `.pi/test-config.json`). Added `test_config` tool to tester and sugar-tester agents. Added "Test Enforcement" section to orchestrator skill with detection flow, enforcement rules, and workspace integration. 230 tests passing.
- **2026-05-05**: Phase 6 — Shared Workspace / Blackboard complete. Created `subagents/tools/workspace.ts` with read/write/append/clear/keys operations, dot-notation paths, per-CWD JSON persistence. Added workspace tool to all 9 agents.
- **2026-05-05**: Phase 6 — Tree-sitter Repo Map complete. Created `subagents/tools/repo-map.ts` using ast-grep definition extraction + Node.js formatter. Added `repo_map` tool to scout and planner agents.
- **2026-05-05**: Phase 6 — SugarCRM testing skill created. Covers PHPUnit, bns curl E2E, and bns scheduler tests. Added to tester agent.
- **2026-05-04**: Phase 6 — ast-grep integration complete. Created `tools/ast-grep.ts` extension, registered in CUSTOM_TOOL_EXTENSIONS, added to 5 agents (scout, planner, debugger, refactorer, security-auditor).
- **2026-05-03**: Phase 5.2 complete — refactoring pass: extracted `shared/format.ts` (formatTokens, formatDuration) and `shared/content.ts` (extractTextContent, extractAssistantText), deduplicated review.ts searchable selectors via generic `showSearchableSelector<T>`, replaced `any` with `ExtensionContext` in bash-guard, removed dead `Component` type from subagents. All consumers use re-exports for backward compatibility. 173 tests passing.
- **2026-05-03**: Phase 5.1 complete — 165 tests across 10 suites (bash-guard, safe-bash, notify, zsh-history, context-info, subagents utils, review, ask-user-question, btw, powerline). Infrastructure: vitest + tsconfig + package.json. Added exports to ~40 pure functions. Found regex bug in safe-bash (rm -rf ~ not caught). 4 UI-heavy files skipped (clear-screen, persistent-cwd, web-search, web-fetch).
- **2026-05-03**: Added Phase 6 — research-driven improvements (tree-sitter repo map, ast-grep, persistent memory, shared workspace, MCTS-lite, observability). Created RESEARCH_AGENTIC_WORKFLOWS.md.
- **2026-05-03**: Added Phase 5
- **2026-05-03**: Final validation — delegation enforcer confirmed working (blocks orchestrator direct tool use), context-mode confirmed working in MCP and subagents. All systems operational.
- **2026-05-03**: Plan audit — fixed Tools & Skills status, corrected model assignments (gpt-5.1-codex → gpt-5.3-codex), documented delegation-enforcer extension, context-mode integration, and orchestrator skill cleanup.
- **2026-05-02**: Phase 4 complete — model audit done, tools/skills audit done with skills support in subagents extension, compact agent dashboard widget built.
- **2026-05-02**: Phase 4.1 complete — model selection audit done. Upgraded planner/debugger/code-reviewer to claude-opus-4.6, worker/tester/refactorer to gpt-5.1-codex.
- **2026-05-02**: Phase 3 complete — created doc-writer and refactorer agents.
- **2026-05-02**: Phase 2 complete — created debugger and security-auditor agents. Updated orchestrator with Tester → Debugger → Tester Loop pattern and security-auditor gate in Full Reconnaissance.
- **2026-05-02**: Added Pre-Phase 2 section — model selection audit, tools/skills audit, and agent dashboard widget.
- **2026-05-02**: Phase 1 complete — created planner and tester agents. Updated orchestrator skill with Planner → Worker Pipeline, Worker → Tester Validation Loop, and updated Full Reconnaissance pattern.
- **2026-05-02**: Evaluator-Optimizer Loop completed — added auto-retry protocol to Worker → Code-Reviewer pattern in orchestrator skill.
- **2026-05-02**: Initial plan created. Current team documented. Research findings added. Roadmap defined with 3 phases.

## Next Steps — Additional Observations on Subagent Model Strategy

These are follow-up observations after the initial model assignment pass. They go beyond per-agent model choice and address composition, diversity, and routing.

### 1. Vendor diversity / blind spots
- 6 of 11 agents currently run on Claude. Planner → reviewer → auditor chains can repeat the same model's blind spots (missed vuln classes, hallucinated APIs).
- Action: deliberately mix vendors on cross-checking pairs (planner vs. reviewer, worker vs. tester) to get adversarial diversity.

### 2. Codex monoculture on execution side
- `worker`, `refactorer`, `tester` all run on `gpt-5.3-codex`.
- Risk: tests reinforce the worker's assumptions instead of challenging them.
- Action: evaluate moving `tester` to Sonnet or Opus so test design is independent from implementation.

### 3. Role-specific reconsiderations
- **scout (`gpt-5.4-mini`)**: Upgraded from Grok to fix weak code comprehension while maintaining speed/cost efficiency for parallel fan-outs.
- **refactorer (`gpt-5.3-codex`)**: refactoring needs behavior-preservation reasoning, not just code generation. Evaluate Sonnet/Opus for non-trivial refactors.
- **doc-writer (`claude-sonnet-4.6`)**: routine docs could run on a lighter Haiku-tier / `gpt-5-mini`-tier model.
- **planner (`claude-opus-4.6`)**: keep model, but explicitly enable extended thinking / reasoning mode where supported.

### 4. Missing critic role
- No dedicated agent whose job is to disagree with the planner.
- Action: add a cheap "devil's advocate" critic (Sonnet-tier) that runs before execution to challenge plans.

### 5. Static assignment vs. task-difficulty variance
- Some agents (worker, code-reviewer) handle wildly different difficulty levels. Static models force overpaying or underdelivering.
- Action: introduce a lightweight router skill that picks model based on task metadata (diff size, files touched, risk tags).

### 6. Reasoning-effort tuning
- Model choice is one lever; reasoning effort / thinking tokens is another, often cheaper.
- Action: expose per-agent reasoning effort configuration and tune per role.

### 7. Two-stage pipelines for high-cost-of-failure roles
- For `security-auditor` and `code-reviewer`: run Sonnet first, auto-escalate to Opus when risk signals fire (auth, crypto, migrations, large diff, low confidence).

### 8. Fallback chains
- Define explicit per-agent fallback model order for rate limits / timeouts (e.g., Opus → Sonnet → Codex where sensible).

### 9. Budget / SLA profiles
- Add global profiles (`fast`, `balanced`, `strict`) that swap models per run.

### 10. Quality telemetry loop
- Track per-agent outcomes: fix success rate, regression rate, rework count, reviewer overrides.
- Revisit model assignments monthly using data, not intuition.

### Suggested order of work
1. ~~Add critic agent (low effort, high signal).~~ ✅ Complete
2. ~~Implement two-stage escalation for `security-auditor` and `code-reviewer`.~~ ✅ Complete
3. ~~Re-evaluate `tester`, `refactorer`, and `scout` model choices with small A/B runs.~~ ✅ Complete
4. ~~Build complexity-based router skill.~~ ✅ Complete
5. ~~Add telemetry + monthly review cadence.~~ ✅ Complete
