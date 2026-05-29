---
name: orchestrator-reference
description: Extended orchestrator reference — NOT auto-loaded. Read this when you need pipeline details, TDD enforcement rules, or investigation discipline.
---

# Orchestrator Reference (Extended)

> This file is NOT loaded automatically. It is a reference archive for the orchestrator skill's full detail.
> Scout or read it explicitly if you need pipeline protocols, TDD enforcement flow, or investigation discipline.

## Understand Before You Build

THE MOST IMPORTANT THING: YOU DON'T ASSUME, YOU VERIFY - YOU GROUND YOUR COMMUNICATION TO THE USER IN EVIDENCE-BASED FACTS  
DON'T JUST RELY ON WHAT YOU KNOW. YOU FOLLOW YOUR KNOWLEDGE BUT ALWAYS CHECK YOUR WORK AND YOUR ASSUMPTIONS TO BACK IT UP WITH HARD, UP-TO-DATE DATA THAT YOU LOOKED UP YOURSELF

Never start implementing until you are **100% certain** of what needs to be done. If you catch yourself thinking "I think this is how it works" or "this should probably be..." — STOP. That's a signal to ask or scout, not to start coding.

**Fill knowledge gaps with:**
- **`ask_user_question`** — ambiguous requirements, preference between approaches, any detail that would materially change the implementation. One question per call. Never guess what the user wants.
- **`subagent` scout** — how the codebase works, what patterns exist, which files are involved. Tools: `read`, `grep`, `find`, `ls`. Fast and cheap (Haiku).
- **`subagent` researcher** — API docs, library behavior, migration guides, external knowledge. Tools: `web_search`, `web_fetch`.
- **`subagent` worker** — isolated code changes. Tools: `read`, `write`, `edit`, `safe_bash`. Use when the change is well-specified and doesn't need back-and-forth.

**Before any non-trivial implementation, you must know:**
- Exactly what the change does (confirmed with user)
- Exactly which files are involved (confirmed with scout)
- Exactly which APIs/patterns to use (confirmed with scout or researcher)

If any of those are fuzzy, you're not ready to implement.

## Task Decomposition

### Scout → Worker Pipeline
**When**: User asks to change something but you don't know the codebase yet.
**Flow**: scout → orchestrator synthesizes findings → worker (with scout's context)
**Example**: "Rename the `processPayment` function everywhere" — scout finds all call sites, worker does the renames.

### Parallel Scout Fan-out
**When**: Need to understand multiple independent parts of a codebase.
**Flow**: scout[] (parallel, `tasks[]`) → orchestrator synthesizes all findings → next step
**Example**: Understanding auth, routing, and DB layers simultaneously before planning a refactor.

### Researcher → Worker Pipeline
**When**: Implementation requires external knowledge (API docs, library usage, migration guide).
**Flow**: researcher → orchestrator extracts key info → worker (with researcher's findings as context)
**Example**: Migrating from `node-fetch` v2 to v3 — researcher finds breaking changes, worker updates the code.

### Planner → Critic → Worker Pipeline
**When**: Non-trivial changes where the planner produced a design/plan. The critic validates the plan before execution begins.
**Flow**: planner → critic (with plan text) → orchestrator evaluates verdict → worker(s)

**Protocol:**
1. Dispatch **planner** with the design task
2. Dispatch **critic** with the planner's output as input
3. Evaluate the critic's verdict:
   - **PROCEED** → continue to worker(s) with the plan + critic's noted concerns as awareness context
   - **REVISE** → re-dispatch planner with critic's warnings as constraints, then re-dispatch critic (max 1 revision loop)
   - **BLOCK** → stop and escalate to user with both the plan and the critic's blockers
4. Never skip the critic for planner-routed tasks unless the user explicitly requests speed over safety

**When to skip the critic:**
- Trivial changes that don't go through the planner (direct worker dispatch)
- User explicitly says "just do it" or "skip review"
- Pure documentation or config changes with no behavioral impact

### Two-Stage Escalation Protocol

**When**: Security audits or code reviews where the initial (cheaper) pass flags low confidence.
**Applies to**: `security-auditor` → `security-auditor-deep`, `code-reviewer` → `code-reviewer-deep`

**Flow**:
1. Dispatch the standard agent (`security-auditor` or `code-reviewer`) with the task
2. Check the output for `CONFIDENCE: LOW`
3. If confidence is HIGH or MEDIUM → accept the result as final
4. If confidence is LOW → dispatch the `-deep` variant with the original task/files + stage-1 findings
5. The deep variant's verdict is final

**Rules:**
- Always run stage-1 first (never skip to deep directly unless user explicitly requests it)
- The deep variant receives both the original input AND stage-1 output
- If stage-1 returns FAIL with HIGH confidence, do NOT escalate — the failure is already confirmed
- Only escalate on LOW confidence

### Worker → Code-Reviewer Loop
**When**: Making non-trivial code changes that need validation.
**Flow**: worker → code-reviewer → if REJECT: worker (with reviewer feedback) → code-reviewer

**Auto-retry protocol:**
1. Dispatch **worker** with the implementation task
2. Dispatch **code-reviewer** with the diff or changed files
3. If code-reviewer returns **APPROVE** → done
4. If code-reviewer returns **REJECT**:
   - Extract Critical and Important issues
   - Dispatch **worker** again with original context + reviewer's specific feedback
   - Dispatch **code-reviewer** again on the new changes
5. **Max retries: 2** — if still REJECT after 2 fix attempts, stop and report to user
6. Each retry must reference the previous reviewer feedback

**When NOT to auto-retry:**
- Reviewer flags a fundamental design issue (wrong approach)
- Reviewer's issues require user input
- In these cases, stop and escalate to the user

### Planner → Worker Pipeline
**When**: Non-trivial code change that requires design decisions.
**Flow**: planner → orchestrator reviews plan → tester (RED: write failing tests) → worker (GREEN: make tests pass) → tester (verify GREEN)

### TDD Loop (Default Development Flow)

**When**: Any feature or bug fix (default unless user bypasses).
**Agent selection**:
- SugarCRM project (has `custom/`, bns tools, Sugar structure) → **sugar-tester**
- Everything else → **tester**

**Flow**:
1. Run existing test suite → report status
2. Dispatch sugar-tester/tester: "Write failing tests for [feature/fix]. Confirm RED."
3. Verify RED — test agent runs tests, confirms new tests fail for the right reason
4. Dispatch worker: "Make these tests pass. Minimal code only."
5. Dispatch sugar-tester/tester: "Run full relevant suite. Confirm GREEN."
6. If FAIL → worker gets diagnostics → fix → re-run (max 2 retries)

**Bypass**: User explicitly says "skip tests", "spike", "prototype", or "no tests" → go straight to worker.

### Tester → Debugger → Tester Loop
**When**: Tests fail and the failure requires root cause analysis beyond simple diagnostics.
**Flow**: tester (reports FAIL with diagnostics) → debugger (analyzes, fixes root cause) → tester (re-validates) → max 2 retries

### Full Reconnaissance
**When**: Complex unfamiliar task (new codebase, large refactor, migration).
**Flow**: parallel [scout + researcher] → planner (with findings) → orchestrator reviews plan → workers (sequential or parallel) → tester → code-reviewer → security-auditor

## Test Enforcement

Every code change must be backed by tests. This is non-negotiable.

### Detection Flow (first task in a project)

1. Before any implementation, check if test config exists by dispatching **tester** with: "Run test_config op='detect' and report results"
2. If detected but not confirmed → ask user to confirm or adjust
3. If not detected → ask user about test runner, test dir, run command
4. Store confirmed config via test_config op='update' with confirmedByUser=true

### Enforcement Rules

**NEW EXTENSION/MODULE = TESTS FIRST (no exceptions)**

Before dispatching a worker to create any new `.ts`, `.js`, `.py`, or `.php` source file that contains logic:
1. **STOP** — ask yourself: "Do tests exist for this new code?"
2. If NO → dispatch **tester** first to write failing tests based on the planned behavior
3. Only THEN dispatch **worker** to implement
4. After worker completes → dispatch **tester** to verify GREEN

After **any worker creates or modifies source files**:
1. Check if the modified files have corresponding test files
2. If tests are missing → dispatch **tester** with the list of modified/created files + test config
3. If tests exist → dispatch **tester**: "Run existing tests that cover these files. Report pass/fail."

**Skip test enforcement when:**
- Change is documentation-only (*.md, *.txt)
- Change is configuration-only (*.json, *.yml, *.yaml, *.toml)
- Change is to test files themselves
- User explicitly says "no tests" or "skip tests"

### Test Creation Guidelines (passed to tester)

- Follow existing test patterns in the project
- Cover: happy path, edge cases, error cases
- Run tests after creation to verify they pass
- Never modify existing test files

## Implementation Discipline

### Keep It Simple

Only make changes that are directly requested or clearly necessary. Don't add features, refactoring, or "improvements" beyond what was asked. Prefer editing existing files over creating new ones.

### Investigate Before Fixing

When something breaks, don't guess — investigate first.

1. **Observe** — read error messages, check full stack traces
2. **Hypothesize** — form a theory based on evidence
3. **Verify** — test the hypothesis before implementing a fix
4. **Fix** — target the root cause, not the symptom

### Verify Before Claiming Done

Never claim success without proving it. Run the actual command, show the output.

| Claim | Requires |
|-------|----------|
| "Tests pass" | Run tests, show output |
| "Build succeeds" | Run build, show exit 0 |
| "Bug fixed" | Reproduce original issue, show it's gone |
| "Script works" | Run it, show expected output |
