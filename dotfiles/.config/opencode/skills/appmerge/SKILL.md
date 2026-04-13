---
name: appmerge
description: >
  Post-merge integrity check skill for SugarCRM projects. Use whenever an agent
  needs to compare two branches after a version-upgrade merge, detect lost or
  damaged custom code (identified by CUSTOM_MARKERS), and produce a structured
  risk report with optional patches and PDF export.
---

# AppMerge — Post-Merge Integrity Check Skill

Run a structured comparison between two SugarCRM branches after a version-upgrade
merge and verify that **no custom functionality was lost or damaged**.

---

## Prerequisites

### 1. SugarCRM git repository

The agent must be run inside (or pointed at) the SugarCRM git repository that
contains both the old and new branches as remote-tracking refs
(`origin/OLD_BRANCH` and `origin/NEW_BRANCH`).

### 2. Required tools

```bash
# PDF generation (Phase 4 only)
which pandoc     # must be available
which xelatex    # must be available (TeX Live or equivalent)

# PDF metadata inspection (Phase 4 only)
which pdfinfo    # poppler-utils
```

### 3. Configure the Variables table

`COMPARISON_CONTEXT.md` is a **template file** with `{{VAR}}` placeholders.
The user provides variable values when launching the skill (in their prompt).
The agent fills them in during **Phase 0** — do NOT ask the user to edit the
file manually.

**Required variables** (must be provided by the user):

| Variable | Example value | Description |
|---|---|---|
| `OLD_BRANCH` | `client/prod/12` | Baseline branch (before merge) |
| `NEW_BRANCH` | `client/prod/25` | Merge-result branch (to validate) |
| `CLIENT_NAME` | `ACME` | Client identifier used in filenames and code |
| `CUSTOM_MARKERS` | `bns`, `BNS`, `acme`, `ACME` | Strings that flag custom code |

**Manual setup** (before launching):

- **Exception Rules** in `COMPARISON_CONTEXT.md` — suppress known false positives
  for this project. The user edits this section by hand before running.

---

## Mandatory First Step

**Always run Phase 0 before performing any other task.**
Phase 0 reads the user's variables, fills in `COMPARISON_CONTEXT.md`, and
auto-discovers client files and custom modules from the old branch.

---

## Workflow

### Phase 0 — Variable Substitution & Auto-Discovery

This phase transforms `COMPARISON_CONTEXT.md` from a template into a
project-specific context file. **Must complete before any other phase.**

#### Step 1: Extract variables from the user's prompt

Parse the user's message for the four required variables:

- `OLD_BRANCH`, `NEW_BRANCH`, `CLIENT_NAME`, `CUSTOM_MARKERS`

If any are missing, **ask the user** before proceeding.

#### Step 2: Replace `{{VAR}}` placeholders in `COMPARISON_CONTEXT.md`

Replace every occurrence of:

- `{{OLD_BRANCH}}` → actual old branch name
- `{{NEW_BRANCH}}` → actual new branch name
- `{{CLIENT_NAME}}` → actual client name
- `{{CUSTOM_MARKERS}}` → actual comma-separated marker list

Also compute and replace:

- `{{CUSTOM_MARKERS_GREP_PATTERN}}` → a `grep -iE` compatible pattern
  from the markers list, e.g. `bns|BNS|acme|ACME`

#### Step 3: Verify branches exist

```bash
git branch -r | grep -E "OLD_BRANCH|NEW_BRANCH"
```

If either branch is missing, **stop and report the error** to the user.

#### Step 4: Auto-discover Known CLIENT_NAME-Specific Files

Run against `OLD_BRANCH` to find all files matching any `CUSTOM_MARKERS`
(excluding Ext/ directories, cache, logs, patches, and other excluded paths):

```bash
# List all files on OLD_BRANCH in custom/, modules/, include/
git ls-tree -r --name-only origin/OLD_BRANCH -- custom/ modules/ include/ \
  | grep -v 'custom/application/Ext/' \
  | grep -v 'custom/modules/.*/Ext/' \
  | grep -v 'custom/Extension/.*/Ext/Language/' \
  | grep -v 'cache/' \
  | grep -v 'bns_logs/' \
  | grep -v 'bns_patches/' \
  | grep -v 'bns_git_patches/' \
  | grep -v 'patches/' \
  | grep -iE 'CUSTOM_MARKERS_GREP_PATTERN'
```

Categorize results and replace placeholders:

| File extension / path pattern | Category | Placeholder |
|------|----------|-------------|
| `.php` in `custom/modules/`, `custom/include/`, `modules/` | Business Logic | `{{CLIENT_FILES_BUSINESS_LOGIC}}` |
| `.js`, `.hbs`, `.css` in `custom/clients/` | UI | `{{CLIENT_FILES_UI}}` |
| Files under `Ext/Language/` or with `Language` in path | Language | `{{CLIENT_FILES_LANGUAGE}}` |
| Everything else | Other / Assets | `{{CLIENT_FILES_OTHER}}` |

Replace `{{AUTO_DISCOVER_CLIENT_FILES}}` with:
`Auto-discovered from origin/OLD_BRANCH — N files found`

#### Step 5: Auto-discover Known Custom Modules

```bash
# List module directories on OLD_BRANCH matching CUSTOM_MARKERS
git ls-tree -d --name-only origin/OLD_BRANCH -- modules/ \
  | sed 's|modules/||' \
  | grep -iE 'CUSTOM_MARKERS_GREP_PATTERN' \
  | sort
```

Replace `{{CUSTOM_MODULES_LIST}}` with the comma-separated list of module names.
Replace `{{AUTO_DISCOVER_CUSTOM_MODULES}}` with:
`Auto-discovered from origin/OLD_BRANCH — N custom modules found`

#### Step 6: Verify the filled context file

Read `COMPARISON_CONTEXT.md` and confirm:

- No `{{...}}` placeholders remain (except inside code block examples)
- Variables table shows the actual values
- Known files and modules sections are populated
- Exception Rules section is present (may still have the example row if user
  hasn't customized it — that's OK, just note it)

### Phase 1 — Lost Files Detection

Find files that exist in `OLD_BRANCH` but are **absent** from `NEW_BRANCH`.

```bash
# Files deleted in custom/ (excluding auto-generated Ext/)
git diff --diff-filter=D --name-only origin/OLD_BRANCH...origin/NEW_BRANCH \
  -- 'custom/' \
  | grep -v 'custom/application/Ext/' \
  | grep -v 'custom/modules/.*/Ext/'

# Files deleted in custom modules (matching CUSTOM_MARKERS)
git diff --diff-filter=D --name-only origin/OLD_BRANCH...origin/NEW_BRANCH \
  -- 'modules/'

# Files deleted in include/ matching CUSTOM_MARKERS
git diff --diff-filter=D --name-only origin/OLD_BRANCH...origin/NEW_BRANCH \
  -- 'include/'
```

Categorize each deleted file as: **Business Logic**, **UI**, **Language**, or **Asset**.
Flag any lost business logic files (PHP controllers, hooks, workflows, API endpoints, PDFs).

**Apply Exception Rules** — omit any finding that matches a suppression rule in `COMPARISON_CONTEXT.md`.

---

### Phase 2 — Modified Customizations Check

For files present on **both** branches, identify which custom files were changed
and assess whether changes look intentional or accidental.

```bash
# Modified files in custom/
git diff --diff-filter=M --name-only origin/OLD_BRANCH...origin/NEW_BRANCH \
  -- 'custom/'

# Diff a specific file
git diff origin/OLD_BRANCH...origin/NEW_BRANCH -- <file>

# Diff known CLIENT_NAME-specific files
git diff origin/OLD_BRANCH...origin/NEW_BRANCH \
  -- custom/modules/Accounts/bnsHooks_Account_CLIENTNAME.php
```

Review areas:

- Known `CLIENT_NAME`-specific files → flag functional regressions
- PHP in `custom/modules/` → logic changes that could break custom functionality
- JS/HBS in `custom/clients/` → UI regressions
- Files in custom module directories (matching `CUSTOM_MARKERS`)
- Other files in `custom/` (API endpoints, hooks, schedulers)

**Apply Exception Rules** before recording any finding.

---

### Phase 3 — Risk Report

Produce `COMPARISON_RESULTS.md` — **single file, max ~50–80 lines**.

Output format (table only, no prose):

```markdown
| Risk | Category | Problem | File(s) |
|------|----------|---------|---------|
| CRITICAL | Security | Unauthenticated API endpoints | `custom/include/api/exampleApi.php:42` |
| HIGH | Lost | Custom import files deleted | `modules/Import/customImport.php` |
| MEDIUM | Modified | Dashlet property access change | `custom/clients/base/views/example/example.js:23` |
```

Rules:

- Only list CRITICAL / HIGH / MEDIUM findings
- Suppress findings matching Exception Rules
- No prose, no progress notes, no LOW / whitespace-only / trivial changes
- One line per finding

---

### Phase 4 — PDF Export

1. Create `COMPARISON_RESULTS_PDF.md` with YAML front matter and LaTeX headers:

```yaml
---
title: "Post-Merge Integrity Report"
subtitle: "CLIENT_NAME"
date: "YYYY-MM-DD"
geometry: margin=1.8cm
fontsize: 11pt
header-includes:
  - \usepackage{fancyhdr}
  - \usepackage{booktabs}
  - \usepackage{colortbl}
---
```

   Include: summary box (branches, scope, finding counts) + findings grouped by
   risk level (CRITICAL → HIGH → MEDIUM), each as a numbered subsection with
   Category, File, and Details fields.

1. Generate the PDF:

```bash
pandoc COMPARISON_RESULTS_PDF.md -o COMPARISON_RESULTS.pdf \
  --pdf-engine=xelatex -V mainfont="DejaVu Sans" -V monofont="DejaVu Sans Mono"
```

1. Verify:

```bash
pdfinfo COMPARISON_RESULTS.pdf   # expect 1–2 pages
```

1. The intermediate `COMPARISON_RESULTS_PDF.md` can be kept or deleted at the
   user's discretion.

---

### Phase 5 — Patch Generation

For each **CRITICAL** or **HIGH** finding where the problem is a code difference
(categories: **Modified** or **Lost**), generate a git patch in `patches/`.

```bash
mkdir -p patches/
```

#### Naming convention

```
patches/001-restore-missing-status-filter-email.patch
patches/002-restore-deleted-custom-import.patch
```

#### Patch header format (git mailbox)

```
From: AI Comparison Agent
Subject: [PATCH NNN] <short description>
Date: <generation date>

# Context
# -------
# Risk: <CRITICAL|HIGH>
# Category: <Lost|Modified|Security>
# Finding: <short problem description>
# File(s): <path(s) with line numbers>
# Description: <2-3 sentences explaining what was broken and what this patch
#   does to fix it. Reference the OLD_BRANCH behavior being restored.>
# Reference: COMPARISON_RESULTS.md — Finding #<N>
---
<standard unified diff>
```

#### Generating patches

```bash
# Lost file — restore entirely from OLD_BRANCH
git show origin/OLD_BRANCH:<file> > /tmp/restored_file
diff -u /dev/null /tmp/restored_file > patches/NNN-description.patch
# Edit header paths (a/ b/ prefixes) manually

# Modified file — reverse diff of the damaging change
git diff origin/NEW_BRANCH origin/OLD_BRANCH -- <file> > patches/NNN-description.patch
```

#### Applying patches

```bash
# Dry run
git apply --check patches/NNN-description.patch

# Apply single patch
git apply patches/NNN-description.patch

# Apply all patches in order
for p in patches/*.patch; do git apply "$p"; done

# With commit message from header
git am patches/NNN-description.patch
```

#### Validation

After generating each patch:

1. Run `git apply --check patches/NNN-description.patch`
2. If it does not apply cleanly, add `# WARNING: May require manual conflict resolution`
   to the patch header

---

## Exclusion Patterns

Never flag or report changes in these paths:

| Pattern | Reason |
|---------|--------|
| `custom/application/Ext/` | Auto-generated compiled extensions |
| `custom/modules/*/Ext/` | Auto-generated compiled extensions |
| `cache/`, `upload/`, `*.log` | Runtime artifacts |
| `config.php`, `config_override.php` | Environment config |
| `custom/blowfish` | Encryption keys |
| `custom/history` | History files |
| `custom/Extension/**/*orderMapping.php` | Order mapping |
| `bns_logs/`, `bns_patches/`, `bns_git_patches/` | Patch/log directories |
| `patches/` | Generated fix patches |
| `**.pdf` | PDF files |
| Core SugarCRM platform changes | Expected from version upgrade |

---

## Git Commands Reference

```bash
# List files deleted between branches
git diff --diff-filter=D --name-only origin/OLD_BRANCH...origin/NEW_BRANCH -- <dir>/

# List files modified between branches
git diff --diff-filter=M --name-only origin/OLD_BRANCH...origin/NEW_BRANCH -- <dir>/

# Diff a specific file between branches
git diff origin/OLD_BRANCH...origin/NEW_BRANCH -- <file>

# List all files on a specific branch
git ls-tree -r --name-only origin/BRANCH -- <dir>/

# Count files
git ls-tree -r --name-only origin/BRANCH -- <dir>/ | wc -l
```

---

## Decision Rules

| Situation | Action |
|-----------|--------|
| Starting a new project | Run Phase 0 — fill variables + auto-discover from OLD_BRANCH; edit Exception Rules manually |
| `{{VAR}}` placeholders still present | Phase 0 incomplete — run it before any other phase |
| Branch not found during Phase 0 | Stop and report to user — cannot proceed without both branches |
| File missing in NEW_BRANCH | Check Exception Rules first; if not suppressed → flag as Lost |
| File modified in NEW_BRANCH | Diff it; assess functional impact; apply Exception Rules |
| Finding matches an Exception Rule | Omit entirely from `COMPARISON_RESULTS.md` |
| CRITICAL/HIGH finding with code change | Generate a patch in `phases/` |
| MEDIUM finding | Report only; no patch |
| Phase 4 PDF fails | Check `pandoc` and `xelatex` are installed; verify YAML front matter |
| Patch does not apply cleanly | Add `# WARNING` line to patch header |

---

## Output Files

| File | Phase | Description |
|------|-------|-------------|
| `COMPARISON_RESULTS.md` | 3 | Risk table — the primary deliverable |
| `COMPARISON_RESULTS_PDF.md` | 4 | Intermediate PDF-optimized Markdown |
| `COMPARISON_RESULTS.pdf` | 4 | Presentation-ready PDF |
| `patches/NNN-description.patch` | 5 | Git patches for CRITICAL/HIGH findings |

---

## SugarCRM Context

This skill is designed for **SugarCRM Enterprise** installations using:

- **Dual architecture**: modern PHP (`src/`) + legacy SugarCRM patterns (`modules/`, `include/`)
- **Custom code markers**: typically `bns`, `BNS`, and client-specific identifiers
- **Custom modules**: located under `modules/` with names matching `CUSTOM_MARKERS`
- **Customizations**: primarily under `custom/` (excluding auto-generated `Ext/` subdirectories)

For SugarCRM build, test, and lint commands, code style guidelines, and development
workflow, refer to the `AGENTS.md` file in the project root.
