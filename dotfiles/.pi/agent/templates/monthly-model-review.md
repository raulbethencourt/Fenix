# Monthly Model Review — {{MONTH}} {{YEAR}}

## Data Collection

Run these queries to gather data:

1. `token_stats` with `period="month"` `group_by="agent"`
2. `token_stats` with `period="month"` `group_by="model"`
3. `token_stats` with `period="month"` `top=10`

## Per-Agent Analysis

| Agent | Model | Runs | Cost | Tokens | Success% | Avg Duration | Notes |
|-------|-------|------|------|--------|----------|--------------|-------|
| scout | | | | | | | |
| planner | | | | | | | |
| worker | | | | | | | |
| tester | | | | | | | |
| debugger | | | | | | | |
| critic | | | | | | | |
| code-reviewer | | | | | | | |
| security-auditor | | | | | | | |
| doc-writer | | | | | | | |
| refactorer | | | | | | | |
| researcher | | | | | | | |

## Questions to Answer

1. Which agent has the worst cost/value ratio?
2. Any agent with success rate < 80%? → investigate model fit
3. Which agent is slowest? Could a faster model work?
4. Any surprising cost spikes? → check task complexity distribution
5. Are cross-checking pairs (worker↔tester, planner↔reviewer) on different vendors?
6. Is the critic agent catching real issues or just generating noise?
7. Were any deep escalations triggered (security-auditor-deep, code-reviewer-deep)?

## Model Change Proposals

| Agent | Current Model | Proposed Model | Rationale | Risk |
|-------|---------------|----------------|-----------|------|
| | | | | |

## Vendor Diversity Check

| Role Pair | Agent A (Model) | Agent B (Model) | Same Vendor? | Action |
|-----------|-----------------|-----------------|--------------|--------|
| Implement ↔ Test | worker (Codex) | tester (Codex) | ⚠️ Yes | |
| Plan ↔ Critique | planner (Opus) | critic (Sonnet) | Same vendor, different tier | |
| Write ↔ Review | worker (Codex) | code-reviewer (Sonnet) | ✅ Different | |

## Action Items

- [ ] 
- [ ] 

## Next Review: {{NEXT_MONTH}} {{YEAR}}
