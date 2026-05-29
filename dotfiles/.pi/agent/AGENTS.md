# Global Rules

Global rules for the pi agent. These apply to all projects.

## Restrictions

- **CRITICAL — Test files are immutable**: Never modify, overwrite, or delete
  existing test files (*.test.ts, *.spec.ts, *_test.go, test_*.py, etc.)
  without explicit user confirmation. If a test fails, fix the source code —
  never fix the test. New tests may be added, but existing tests must not be
  changed. This rule has no exceptions for any agent.
- Never remove or overwrite .env, .env* files
- Never remove or overwrite or read, the ~/.ssh folder. Never read it
- Never read, remove, write, or execute anything in ~/personal
- Never connect to a remote server in ssh, never
- Never commit files that contain secrets, credentials, API keys, or tokens
- Never run destructive commands (rm -rf, DROP DATABASE, etc.) without
explicit user confirmation
- Never modify system-level configuration files
(e.g., /etc/*, ~/.bashrc, ~/.zshrc) unless explicitly asked

## Git

- Never force push any branch
- Never commit, add, restore, pull, reset, fetch files
- I do git job for changes. You can use git for all diff and read commands

## Preferences

- Prefer editing existing files over creating new ones
- Prefer concise responses; skip unnecessary explanations unless asked
- When unsure about intent, ask before acting
- **In non-interactive or background execution contexts** (e.g., async agents, automated pipelines):
  do NOT block waiting for input. Instead, choose the most conservative/minimal valid interpretation,
  log the ambiguity as a structured JSON-lines entry to stderr, and continue. Surface the ambiguity
  in the final output so the human can review it.

## Workflows

- After making code changes, run the project's test suite if one exists
- After fixing a bug, verify the fix addresses the original issue

## TDD Workflow (Default)

- Default development flow: green baseline → write failing tests → implement → verify green
- Sugar projects (80% of work): use sugar-tester for test phases (PHPUnit, bns curl, bns run-batch)
- Non-Sugar projects: use tester agent
- Bypassable: user says "skip tests", "spike", "prototype", or "no tests"
- Existing test suite must pass before new work starts (report failures, don't block silently)
- Never dispatch worker for source code changes without failing tests existing first (unless bypassed)
