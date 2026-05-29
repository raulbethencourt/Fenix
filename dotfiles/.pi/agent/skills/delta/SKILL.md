---
name: delta
description: Delta integration for viewing diffs in the terminal. Use when showing file differences to the user with syntax highlighting via delta.
---

# Delta CLI Tools

Tools for viewing diffs with syntax highlighting using `delta`.

## Requirements

`delta` must be installed and available in PATH (`delta --version` to verify).

## Comparing Two Files

```bash
delta <file1> <file2>
```

## Git Diffs with Delta

### Working tree vs last commit

```bash
git diff HEAD -- path/to/file | delta
```

### Staged vs working tree

```bash
git diff -- path/to/file | delta
```

### Staged vs HEAD

```bash
git diff --cached HEAD -- path/to/file | delta
```

### Two commits

```bash
git diff <commit1> <commit2> -- path/to/file | delta
```

### Previous commit vs current

```bash
git diff HEAD~1 HEAD -- path/to/file | delta
```

### Specific commit

```bash
git show <commit> -- path/to/file | delta
```

### Compare arbitrary versions via temp files

```bash
git show HEAD~1:path/to/file > /tmp/old
delta /tmp/old path/to/file
```

## Useful Flags

- `--side-by-side` — side-by-side view
- `--line-numbers` — show line numbers
- `--diff-highlight` — highlight changed words within lines
- `--no-gitconfig` — ignore local git config (use delta defaults)

Example:

```bash
git diff HEAD -- path/to/file | delta --side-by-side --line-numbers
```

## Gotchas

- `delta` reads from stdin, so always pipe git output to it
- Use `git log --oneline -5 -- path/to/file` to verify file has history before diffing
- If delta is configured as git's pager (`core.pager = delta`), plain `git diff` already uses it

## When to Use

- Showing the user what changed in a file with syntax highlighting
- Comparing two versions of code in the terminal
- Reviewing git changes without leaving the terminal
