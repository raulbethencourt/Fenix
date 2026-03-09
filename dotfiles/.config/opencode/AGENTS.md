# Global Rules

Global rules for the OpenCode agent. These apply to all projects.

## Restrictions

- Never remove or overwrite .env, .env* files
- Never read, remove, write, or execute anything in ~/personal
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

## Workflows

- After making code changes, run the project's test suite if one exists
- After fixing a bug, verify the fix addresses the original issue
