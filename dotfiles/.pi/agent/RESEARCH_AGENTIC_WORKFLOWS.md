# Agentic Workflow Research — May 2026

> Synthesis of research into tools, plugins, patterns, and architectures for improving the pi multi-agent coding system.

## High-Impact Improvements (Do First)

### 1. Tree-sitter Repo Map (à la Aider)
- Build a condensed structural map of the codebase (function/class signatures, no bodies)
- Uses tree-sitter AST parsing, ranked by symbol reference graph (PageRank-like)
- Fits entire repo structure in ~2K tokens instead of sending all files
- **Impact**: Dramatically reduces tokens for scout/planner, improves context selection
- **Implementation**: `web-tree-sitter` npm package, build as a pi extension or MCP server
- **Reference**: [Aider Repo Map](https://aider.chat/docs/repomap.html)

### 2. ast-grep for Structural Code Search
- Pattern-based code search/replace using AST (not text regex)
- Much more precise than ripgrep for finding code patterns
- CLI tool, works with Tree-sitter grammars for 200+ languages
- **Impact**: Better code search for scout, refactorer, security-auditor
- **Implementation**: `pacman -S ast-grep`, add as tool for relevant agents
- **Reference**: [ast-grep](https://ast-grep.github.io/)

### 3. MCP Servers for Tool Integration
- MCP is the de facto standard for AI agent tool integration (adopted by Cursor, Copilot, Cline, Claude Code)
- Pi already has MCP support — leverage existing community servers:
  - **Memory MCP server** — persistent knowledge graph for cross-session memory
  - **GitHub MCP server** — PR creation, issue management, code search
  - **Git MCP server** — direct git operations
  - **Puppeteer/Playwright MCP** — browser automation
  - **Sentry MCP** — error monitoring integration
  - **Slack/Discord MCP** — notifications and team comms
- **Registries**: [mcp.so](https://mcp.so), [glama.ai/mcp/servers](https://glama.ai/mcp/servers), [Smithery.ai](https://smithery.ai)
- **Reference**: [MCP Protocol](https://modelcontextprotocol.io)

### 4. Shared Workspace / Blackboard Pattern
- All agents read/write a common state object during orchestration
- Holds: current task, codebase context map, file modifications, test results, agent observations
- Similar to MetaGPT's publish-subscribe message pool
- **Impact**: Reduces redundant file reads, improves inter-agent coordination
- **Implementation**: JSON state file or in-memory object passed through agent pipeline

## Medium-Priority Improvements

### 5. Three-Tier Memory Architecture
- **Working memory**: Current task context (files, tool outputs, conversation)
- **Session memory**: Event stream of all actions/observations — enables replay and debugging
- **Persistent memory**: Cross-session knowledge:
  - Vector-indexed code snippets (semantic retrieval)
  - Structured facts (architecture decisions, known patterns, past fixes)
  - Per-project "memory bank" markdown files agents read on startup
- **References**: [CrewAI Memory](https://docs.crewai.com/concepts/memory), [Graphiti Knowledge Graph](https://github.com/getzep/graphiti)

### 6. State Machine for Agent Workflows (Moatless Pattern)
- Constrain agent action space per phase: SearchCode → IdentifyCode → PlanToCode → EditCode
- Transitions based on confidence/completion signals
- **Impact**: More reliable than free-form agent loops — proven on SWE-bench
- **Reference**: [Moatless Tools](https://github.com/aorwall/moatless-tools)

### 7. MCTS-lite for Hard Problems
- Generate 3-5 candidate approaches in parallel
- Run tests on each, pick the winner
- Inspired by AlphaCode and SWE-Search
- **Impact**: Better solutions for complex tasks at cost of more tokens
- **Implementation**: Spawn multiple worker agents with different approaches, tester selects best

### 8. Constitutional Coding Rules
- Define project-level rules (`.pi/rules.md`) as principles for self-checking
- Examples: "never use eval()", "always handle errors", "prefer immutable data"
- Agents self-check against rules before submitting
- Inspired by Constitutional AI applied to code

### 9. Structured JSON Observability
- Log every LLM call: `{timestamp, model, input_tokens, output_tokens, cached_tokens, latency_ms, tool_calls, task_id}`
- Store in local SQLite for analytics
- Track: token usage per task, tool success rates, edit acceptance rates, retry frequency
- **References**: [Langfuse](https://langfuse.com) (open-source), [Arize Phoenix](https://docs.arize.com)

### 10. Git-Based Isolation & Rollback
- Each agent task creates a branch, auto-commits after each change
- On failure/rejection, reset to branch point
- Free audit trail and rollback mechanism
- Used by: Aider (auto-commit), Copilot coding agent (branch per issue), SWE-agent

## Lower-Priority / Experimental

### 11. LSP Integration for Agents
- Use language servers for go-to-definition, find-references, diagnostics
- Gives agents precise code intelligence (call graphs, type info)
- Tools: `typescript-language-server`, `pyright`, `rust-analyzer`
- Heavy to set up but powerful for large codebases

### 12. Speculative Parallel Execution
- When agent reads a file, speculatively pre-read related files (imports, tests) in parallel
- When agent writes code, speculatively start test run
- Reduces latency for I/O-bound workflows

### 13. bubblewrap Sandboxing (Arch Linux)
- Lightweight sandboxing without Docker overhead
- `pacman -S bubblewrap` — restrict filesystem, network, capabilities per agent
- Good for security-auditor and untrusted code execution

### 14. Google A2A Protocol
- New standard (April 2025) for agent-to-agent discovery and communication
- Agent Cards (JSON metadata at `/.well-known/agent.json`), Tasks with lifecycle, SSE streaming
- Complementary to MCP: MCP = agent↔tool, A2A = agent↔agent
- **Reference**: [Google A2A](https://google.github.io/A2A/)

### 15. Reflection / Self-Critique Loop
- Agent reviews its own output before submitting
- Feed test/lint results back with "reflect on what went wrong" prompt
- Shown to dramatically improve pass rates on coding benchmarks
- **Reference**: Reflexion paper (Shinn et al., 2023)

## Architecture Patterns from Top Performers

| Pattern | Used By | Applicability |
|---|---|---|
| Localize → Edit → Validate pipeline | SWE-bench top agents, Agentless | ✅ Already similar to scout→worker→tester |
| Constrained action space per phase | Moatless Tools | 🔄 Could add state machine to worker |
| Repo map (tree-sitter AST summary) | Aider, Cursor | 🎯 Highest ROI single improvement |
| Edit format optimization | Aider | ✅ Pi uses search/replace (good choice) |
| Event-stream architecture | OpenHands | 🔄 Could add for replay/debugging |
| Modes with different tools/prompts | Roo Code, Claude Code | ✅ Already have via agent .md files |
| Tiered model routing | Multiple | ✅ Already implemented in evolution plan |
| Human-in-the-loop approval gates | Cline, Roo Code | 🔄 Could add per-tool approval levels |

## Key Open-Source References

| Project | Architecture Insight | URL |
|---|---|---|
| SWE-agent | ACI tool design > model choice | https://github.com/princeton-nlp/SWE-agent |
| OpenHands | Event-stream, sandboxed runtime | https://github.com/All-Hands-AI/OpenHands |
| Aider | Repo map, edit formats, token efficiency | https://aider.chat |
| Moatless Tools | State machine for coding agents | https://github.com/aorwall/moatless-tools |
| Roo Code | Modes pattern (agent roles as config) | https://github.com/RooVetGit/Roo-Code |
| MetaGPT | Publish-subscribe blackboard | https://github.com/geekan/MetaGPT |
| Agentless | Structured pipeline beats complex agents | https://arxiv.org/abs/2407.01489 |
| CrewAI | Memory system (4 tiers) | https://docs.crewai.com/concepts/memory |
| Graphiti | Temporal knowledge graphs | https://github.com/getzep/graphiti |

## Gaps in Current Research

- No rigorous benchmarks comparing multi-agent vs. single-agent for coding tasks
- Production multi-agent coordination (merge conflicts, concurrent edits) is unsolved in open-source
- Long-running agent reliability (crashes, token exhaustion mid-task) underdocumented
- A2A + MCP combined patterns are frontier — no established best practices yet
