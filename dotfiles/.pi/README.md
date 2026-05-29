# Pi Configuration

This directory documents the `~/.pi/` configuration: global rules, a multi-agent subagent system,
reusable skills, and prompt templates. All agents inherit the rules in `agent/AGENTS.md`.
Specialized work is delegated to subagents via the `subagent` tool.

---

## Directory Structure

```
~/.pi/
├── README.md                    # This file
└── agent/
    ├── AGENTS.md                # Global rules (all agents)
    ├── AGENT_EVOLUTION_PLAN.md  # Roadmap
    ├── prompts/
    │   └── code-philosophy.md   # Reusable prompt template
    ├── skills/                  # On-demand knowledge modules
    │   ├── appmerge/
    │   ├── browser/
    │   ├── browser-tools/
    │   ├── code-philosophy/
    │   ├── delta/
    │   ├── frontend-design/
    │   ├── native-web-search/
    │   ├── orchestrator/
    │   ├── stop-slop/
    │   ├── sugarcrm-testing/
    │   ├── translation/
    │   ├── websearch/
    │   └── wrike/
    └── extensions/
        └── subagents/
            ├── index.ts         # Extension entry: orchestrator, tool registration
            ├── agents/          # Agent definitions (.md with frontmatter)
            │   ├── worker.md
            │   ├── scout.md
            │   ├── planner.md
            │   ├── researcher.md
            │   ├── tester.md
            │   ├── debugger.md
            │   ├── refactorer.md
            │   ├── security-auditor.md
            │   ├── doc-writer.md
            │   ├── code-reviewer.md
            │   ├── code-reviewer-deep.md
            │   ├── critic.md
            │   ├── security-auditor-deep.md
            │   └── sugar-tester.md
            └── tools/           # Custom tools loaded into subagent processes
                ├── safe-bash.ts
                ├── ast-grep.ts
                ├── repo-map.ts
                ├── workspace.ts
                ├── test-config.ts
                └── repomix.ts
```

---

## How It Works

1. **You** talk to the orchestrator (top-level pi session)
2. The orchestrator delegates work to **subagents** via the `subagent` tool
3. Each subagent runs as an **isolated pi process** — no shared context with the parent or siblings
4. Subagents receive: their system prompt (`.md` body) + tools + skills + the task string
5. **Skills** are loaded on-demand when a task matches the skill's trigger description
6. **Custom tools** (`safe_bash`, `ast_grep`, `repo_map`) are registered as extensions inside each subagent process
7. **`agent/AGENTS.md`** rules are inherited automatically by all agents

---

## Agents

14 built-in agents. Each is defined by a `.md` file in `agent/extensions/subagents/agents/` — YAML frontmatter for config, body for system prompt.

| Agent | Purpose | Model |
|-------|---------|-------|
| **worker** | General-purpose code writing/editing | gpt-5.3-codex |
| **scout** | Fast codebase recon — files, patterns, architecture | grok-code-fast-1 |
| **planner** | Architecture planning — requirements analysis, implementation design | claude-opus-4.6 |
| **researcher** | Web research — searches and synthesizes findings | claude-sonnet-4.6 |
| **tester** | Writes tests, runs suites, reports diagnostics | gpt-5.3-codex |
| **debugger** | Backward reasoning from symptoms to root cause | claude-opus-4.6 |
| **refactorer** | Improves code quality without changing behavior | gpt-5.3-codex |
| **security-auditor** | Scans for vulnerabilities, secrets, insecure dependencies | claude-sonnet-4.6 |
| **doc-writer** | Generates/updates docs, READMEs, changelogs | claude-sonnet-4.6 |
| **code-reviewer** | Expert review of git commits | claude-sonnet-4.6 |
| **sugar-tester** | SugarCRM-specific testing (bns curl E2E, PHPUnit, scheduler) | gpt-5.3-codex |
| **critic** | Devil's advocate — challenges plans before execution | claude-sonnet-4.6 |
| **security-auditor-deep** | Deep security audit (escalation tier) — Opus-level analysis | claude-opus-4.6 |
| **code-reviewer-deep** | Deep code review (escalation tier) — architectural analysis | claude-opus-4.6 |

**Tools by agent:**

| Agent | Tools | Skills |
|-------|-------|--------|
| worker | read, write, edit, safe_bash, workspace, repomix | frontend-design, code-philosophy |
| scout | read, grep, find, ls, rg, ast_grep, repo_map | delta |
| planner | read, grep, find, ls, ast_grep, repo_map, workspace, repomix | — |
| researcher | web_search, web_fetch | websearch |
| tester | read, write, edit, safe_bash, workspace, test_config | browser-tools, sugarcrm-testing |
| debugger | read, grep, find, safe_bash, ast_grep, workspace | — |
| refactorer | read, write, edit, grep, find, ls, safe_bash, ast_grep, workspace | delta, code-philosophy |
| security-auditor | read, grep, find, safe_bash, ast_grep, workspace | — |
| doc-writer | read, write, edit, grep, find, ls, workspace | stop-slop, translation |
| code-reviewer | read, grep, find, ls, rg, workspace | delta |
| sugar-tester | read, write, edit, safe_bash, workspace, test_config | sugarcrm-testing |
| critic | read, grep, find, ls | — |
| security-auditor-deep | read, grep, find, safe_bash, ast_grep, workspace | — |
| code-reviewer-deep | read, grep, find, ls, rg, workspace | delta |

---

## Custom Tools

Six tools are registered as extensions and loaded into every subagent process that lists them.

### `safe_bash`

Bash with a blocklist of dangerous commands (`rm -rf /`, `sudo`, `mkfs`, `dd if=`, etc.). Drop-in replacement for raw bash in agent contexts.

### `ast_grep`

Structural code search via [ast-grep](https://ast-grep.github.io/). Matches AST patterns rather than text — finds all arrow functions, all class declarations implementing an interface, etc. Supports TypeScript, JavaScript, PHP, Python, and more.

### `repo_map`

Generates a compact structural map of a codebase — all functions, classes, interfaces, types, and methods. Fits an entire repo in ~1–2K tokens.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | required | Root directory to map |
| `lang` | string | optional | `typescript`, `javascript`, `php`, `python` |
| `maxLines` | number | `200` | Cap output length |
| `globs` | object | optional | `include` / `exclude` glob patterns |

### `workspace`

Shared JSON blackboard for inter-agent communication. Agents read and write structured data using dot-notation key paths; other agents in the same pipeline pick it up without direct coupling.

| Operation | Description |
|-----------|-------------|
| `read` | Read a value at a key path (or full document if no key) |
| `write` | Set a value at a key path (creates intermediates) |
| `append` | Push a value onto an array (creates if absent) |
| `clear` | Delete a key path or reset entire workspace |
| `keys` | List object field names |

Storage: `/tmp/pi-workspace-<md5-of-cwd>.json` — persists across agent handoffs within a session. Security: `0o600` permissions, prototype pollution guard, atomic writes, 1 MB limit, 64 KB per-value, 1000-item array cap.

### `test_config`

Auto-detects project test infrastructure and stores configuration for reuse across sessions.

| Operation | Description |
|-----------|-------------|
| `detect` | Scan for known runner configs (vitest, jest, phpunit, pytest, go test, bats, mocha) |
| `read` | Return stored test config |
| `update` | Merge fields into stored config (e.g., confirm, override testDir) |

Storage: `<project>/.pi/test-config.json`. After first detection and user confirmation, subsequent sessions skip detection.

### `repomix`

Packs a subset of the codebase into a single AI-optimized document using tree-sitter compression (~70% token reduction). Use when an agent needs holistic understanding of 5-20 related files — not for structural overview (use `repo_map`) or single files (use `read`).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | cwd | Directory to pack |
| `include` | string[] | optional | Glob patterns to include (strongly recommended) |
| `ignore` | string[] | optional | Additional patterns to exclude |
| `compress` | boolean | `true` | Tree-sitter compression |
| `style` | string | `markdown` | Output format: markdown, xml, plain |
| `includeDiffs` | boolean | `false` | Include uncommitted git changes |
| `removeComments` | boolean | `false` | Strip comments for further reduction |
| `tokenCountTree` | boolean | `false` | Show token usage tree instead of content |

---

## Skills

Skills are on-demand knowledge modules. Each lives in `agent/skills/<name>/SKILL.md`. Agents load a skill when the task description matches the skill's trigger.

| Skill | Purpose |
|-------|---------|
| **appmerge** | Post-merge integrity check for SugarCRM version upgrades |
| **browser** | Browser automation for SugarCRM testing via Playwright |
| **browser-tools** | Interactive browser automation via Chrome DevTools Protocol |
| **code-philosophy** | Code quality guidelines — simplicity, composition, clean boundaries |
| **delta** | Terminal diff viewing with syntax highlighting |
| **frontend-design** | Production-ready frontend design with strong aesthetic direction |
| **native-web-search** | Quick web research with concise summaries |
| **orchestrator** | Top-level session orchestration rules (not for subagents) |
| **stop-slop** | Remove AI writing patterns from prose |
| **sugarcrm-testing** | PHPUnit, bns curl E2E, and scheduler tests for SugarCRM |
| **translation** | Translate Markdown documents via Google Translate (`deep-translator`) |
| **websearch** | DuckDuckGo search via the `ddgs` Python package |
| **wrike** | Wrike REST API v4 connector for Agile work items |

---

## Usage Examples

**Single agent:**

```json
{ "agent": "scout", "task": "Find all authentication-related files in src/" }
```

**Parallel agents:**

```json
{ "tasks": [
  { "agent": "scout", "task": "Map the database layer in this project" },
  { "agent": "researcher", "task": "Best practices for PostgreSQL connection pooling" }
]}
```

**Scout → Worker pipeline:**

```json
{ "agent": "scout", "task": "Find all files that import from 'legacy-auth', return their paths" }
```

Then pass scout's output directly into worker's task context.

**Structural orientation with repo_map:**

```json
{ "agent": "scout", "task": "Use repo_map on /path/to/project, then identify the main entry points and explain the module boundaries" }
```

---

## Global Rules

These apply to every agent automatically (sourced from `agent/AGENTS.md`):

**Hard restrictions:**

- Test files are immutable — fix source code, never the test
- Never touch `.env` / `.env*` files
- Never read or write `~/.ssh` or `~/personal`
- Never connect via SSH
- Never commit secrets, credentials, API keys, or tokens
- Never run destructive commands (`rm -rf`, `DROP DATABASE`, etc.) without explicit confirmation
- Never modify system config files (`/etc/*`, `~/.bashrc`, etc.) unless explicitly asked

**Git:**

- Never force push
- Never commit, add, restore, pull, reset, or fetch — the user handles git

**Preferences:**

- Edit existing files over creating new ones
- Concise responses; skip obvious explanations
- Ask before acting when intent is unclear
- In non-interactive/background contexts: don't block — pick the most conservative interpretation, log ambiguity to stderr as JSON-lines, surface it in final output

**Workflows:**

- After code changes, run the test suite if one exists
- After a bug fix, verify the fix actually addresses the issue

---

## Configuration

Max concurrency: **4 parallel subagents** (configurable via `agent/extensions/subagents/config.json`):

```json
{ "maxConcurrency": 4 }
```

---

## Adding a New Agent

1. Create `agent/extensions/subagents/agents/my-agent.md`:

```markdown
---
name: my-agent
description: One-line description of what it does and when to use it
tools: read, write, edit, safe_bash
skills: code-philosophy
model: github-copilot/claude-sonnet-4.6
---

You are my-agent. Your system prompt goes here...
```

1. If the agent needs tools not in `CUSTOM_TOOL_EXTENSIONS` (i.e., not `web_search`, `web_fetch`, `safe_bash`, `ast_grep`, `repo_map`, `workspace`, `test_config`, `repomix`), add the mapping in `index.ts`:

```typescript
const CUSTOM_TOOL_EXTENSIONS: Record<string, string> = {
  // existing entries...
  my_tool: path.join(EXT_BASE, "my-tool", "index.ts"),
};
```

---

## Adding a New Skill

1. Create `agent/skills/my-skill/SKILL.md`:

```markdown
---
description: When to use this skill — written as trigger conditions, e.g. "Use when testing SugarCRM modules"
---

# My Skill

Instructions, patterns, and examples the agent should follow...
```

1. Add `my-skill` to the `skills:` field in any agent `.md` that should use it.

---

## Adding a New Custom Tool

1. Create `agent/extensions/subagents/tools/my-tool.ts` — follow the pattern in `safe-bash.ts` or `ast-grep.ts`
2. Register it in `CUSTOM_TOOL_EXTENSIONS` in `index.ts`
3. Add the tool name to `tools:` in any agent frontmatter that needs it

---

## Registering Agents from Another Extension

Other extensions can register agents at runtime via the `globalThis.__pi_subagents` bridge:

```typescript
import { parseFrontmatter } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const AGENTS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "agents");

function registerMyAgents(): void {
  const subagents = (globalThis as any).__pi_subagents;
  if (!subagents) return; // subagents extension not loaded

  for (const entry of fs.readdirSync(AGENTS_DIR)) {
    if (!entry.endsWith(".md")) continue;
    const filePath = path.join(AGENTS_DIR, entry);
    const { frontmatter, body } = parseFrontmatter(fs.readFileSync(filePath, "utf-8"));
    if (!frontmatter.name) continue;

    const tools = (frontmatter.tools || "").split(",").map((t: string) => t.trim()).filter(Boolean);
    try {
      subagents.registerAgent({
        name: frontmatter.name,
        description: frontmatter.description || "",
        tools,
        model: frontmatter.model || "anthropic/claude-sonnet-4-6",
        systemPrompt: body,
        filePath,
      });
    } catch {
      // Already registered — skip
    }
  }
}
```

Call `registerMyAgents()` when your extension activates. Agents become available to the `subagent` tool immediately. Use `subagents.unregisterAgent(name)` on deactivation.
