# Branch Comparison Context — Post-Merge Integrity Check

## Variables

> **These placeholders are filled automatically by the agent during Phase 0.**
> Pass values when launching the skill. Do not hardcode branch names, client names,
> or markers elsewhere in this file.

| Variable         | Value                          | Description                                                    |
|------------------|--------------------------------|----------------------------------------------------------------|
| `OLD_BRANCH`     | `{{OLD_BRANCH}}`              | Production/baseline branch (before merge)                      |
| `NEW_BRANCH`     | `{{NEW_BRANCH}}`              | Merge result branch (to validate)                              |
| `CLIENT_NAME`    | `{{CLIENT_NAME}}`             | Client-specific identifier used in filenames and code          |
| `CUSTOM_MARKERS` | `{{CUSTOM_MARKERS}}`          | Strings that identify custom code in filenames, paths, content |

## Objective

After merging two very different SugarCRM versions using a custom git merge script, verify that
**no custom functionality identified by `CUSTOM_MARKERS` was lost or damaged** during the merge.

This is NOT a full diff of all changes. The focus is exclusively on:

1. **Lost files**: Custom files (matching `CUSTOM_MARKERS`) that existed in `OLD_BRANCH` but are missing in `NEW_BRANCH`
2. **Damaged customizations**: Custom files that were modified during the merge in ways that may
   break functionality
3. **Client-specific code (`CLIENT_NAME`)**: Ensuring all client-branded code is intact

## Branches

| Role       | Branch         | Description                      |
| ---------- | -------------- | -------------------------------- |
| Old (prod) | `OLD_BRANCH`   | Production baseline before merge |
| New (dev)  | `NEW_BRANCH`   | Result of merge (to validate)    |

## Custom Code Markers

Custom code in this project is identified by any of the `CUSTOM_MARKERS` values appearing in:

- Filenames and directory paths
- Module names
- Code content (class names, function names, comments)

## Scope

### What to check

| Area | Description |
|------|-------------|
| `custom/` (excl. auto-generated Ext/) | All customizations — treated as potentially client-specific |
| Custom modules in `modules/` | Module directories matching `CUSTOM_MARKERS` |
| Custom files in `include/` | Any files with `CUSTOM_MARKERS` in filename or path |
| `CLIENT_NAME`-specific files | Known client-specific files (see list below) |

### What to EXCLUDE (not relevant to this check)

- Auto-generated compiled extensions: `custom/application/Ext/`, `custom/modules/*/Ext/`
- Cache, uploads, logs: `cache/`, `upload/`, `*.log`
- Config files: `config.php`, `config_override.php`
- Encryption keys: `custom/blowfish`
- History files: `custom/history`
- Order mapping: `custom/Extension/**/*orderMapping.php`
- Patches/logs directories matching `CUSTOM_MARKERS` (e.g. `bns_logs/`, `bns_patches/`, `bns_patches_old/`, `bns_git_patches/`, `bns_git_patch/`)
- Generated fix patches directory: `patches/`
- PDF files: `**.pdf`
- Core SugarCRM platform changes (these are expected from the version upgrade)

## Exception Rules

> **Update this section per project.** These rules suppress known false positives from the
> comparison results. The agent must check each finding against these rules before including it
> in `COMPARISON_RESULTS.md`. If a finding matches an exception rule, omit it from the output.

| # | Pattern to suppress | Reason |
|---|---------------------|--------|
| 1 | `auth => false` in `custom/include/MVC/Controller/entry_point_registry.php` — do NOT flag as unauthenticated / security risk | All BNS API entry points are protected by **API key + IP whitelist** enforced inside each endpoint (`bns_check_api_key()`). The `auth => false` flag only disables SugarCRM session-based authentication, which is intentional for external API consumers. |
| 2 | Deletion of `custom/modules/Accounts/Account.php` and `custom/modules/Notes/Note.php` — do NOT flag as lost custom code | These bean overrides contained bad code and were **intentionally removed**. Their deletion is expected and correct. |
| 3 | Deletion of `modules/Import/bnsImportCustom.php` and `modules/Import/bnsImportUpdateAccount.php` — do NOT flag as lost custom code | These import files contained wrong code and were **intentionally removed**. Their deletion is expected and correct. |
| 4 | Deletion of files in `custom/modules/Emails/` — do NOT flag as lost custom code | These custom Emails module overrides were **deprecated code** and their deletion is expected and correct. |
| 5 | Deletion of files in `custom/modules/Calendar/` — do NOT flag as lost custom code | These custom Calendar module overrides were **deprecated code** and their deletion is expected and correct. |
| 6 | Deletion or removal of code related to `bns_detail_document_function` — do NOT flag as lost custom code | The `bns_detail_document_function` feature was **deprecated code** and all related files/references were **intentionally removed**. This includes the PHP file (`custom/modules/Opportunities/bns_detail_document_function.php`) and its JS handler in the Opportunities record view. |

## Known `CLIENT_NAME`-Specific Files

> **{{AUTO_DISCOVER_CLIENT_FILES}}**
>
> This section is auto-populated during Phase 0 by searching `OLD_BRANCH` for files
> whose names or paths contain `CLIENT_NAME` or `CUSTOM_MARKERS`.
>
> The agent runs:
> ```bash
> git ls-tree -r --name-only origin/{{OLD_BRANCH}} -- custom/ modules/ include/ \
>   | grep -iE '{{CUSTOM_MARKERS_GREP_PATTERN}}'
> ```
> and categorizes results into Business Logic, UI, Language, and Asset groups below.

### Business Logic (hooks, PDFs)

```
{{CLIENT_FILES_BUSINESS_LOGIC}}
```

### UI (JS, HBS, CSS)

```
{{CLIENT_FILES_UI}}
```

### Language Files

```
{{CLIENT_FILES_LANGUAGE}}
```

### Other / Assets

```
{{CLIENT_FILES_OTHER}}
```

## Known Custom Modules (matching `CUSTOM_MARKERS`)

> **{{AUTO_DISCOVER_CUSTOM_MODULES}}**
>
> This section is auto-populated during Phase 0 by listing module directories in
> `OLD_BRANCH` that match `CUSTOM_MARKERS`.
>
> The agent runs:
> ```bash
> git ls-tree -d --name-only origin/{{OLD_BRANCH}} -- modules/ \
>   | xargs -I{} basename {} \
>   | grep -iE '{{CUSTOM_MARKERS_GREP_PATTERN}}'
> ```

```
{{CUSTOM_MODULES_LIST}}
```

## Comparison Plan

### Phase 1 — Lost Files Detection

Find files that exist in `OLD_BRANCH` but are **absent** from `NEW_BRANCH`.

- Scan `custom/` (excl. Ext/) for deleted files — categorize as business logic, UI, language, or asset
- Scan `modules/` for deleted files in custom module directories (matching `CUSTOM_MARKERS`)
- Scan `include/` for deleted files with `CUSTOM_MARKERS` in filename or path
- Flag any lost business logic files (PHP controllers, hooks, workflows, API endpoints, PDFs)

### Phase 2 — Modified Customizations Check

For files on **both** branches, check which custom files were modified and whether changes look
intentional or accidental.

- Diff the known `CLIENT_NAME`-specific files — flag any functional regressions
- Review modified PHP in `custom/modules/` for logic changes that could break custom functionality
- Review modified JS/HBS in `custom/clients/` for UI regressions
- Review modified files in custom module directories (matching `CUSTOM_MARKERS`)
- Review other modified files in `custom/` (API endpoints, hooks, schedulers)

### Phase 3 — Risk Report

Produce the final `COMPARISON_RESULTS.md` (see output format below).

### Phase 4 — PDF Export

Generate a presentation-ready PDF from the results.

1. Create `COMPARISON_RESULTS_PDF.md` — a PDF-optimized version of the findings with:
   - YAML front matter: title, subtitle (`CLIENT_NAME`), date, `geometry: margin=1.8cm`,
     `fontsize: 11pt`, LaTeX header includes for `fancyhdr`, `booktabs`, `colortbl`
   - Summary box (branches, scope, finding counts)
   - Each finding as a numbered subsection grouped by risk level (HIGH then MEDIUM),
     with Category, File, and Details fields
2. Generate the PDF:
   ```bash
   pandoc COMPARISON_RESULTS_PDF.md -o COMPARISON_RESULTS.pdf \
     --pdf-engine=xelatex -V mainfont="DejaVu Sans" -V monofont="DejaVu Sans Mono"
   ```
3. Verify output with `pdfinfo COMPARISON_RESULTS.pdf` (expect 1–2 pages)
4. The intermediate `COMPARISON_RESULTS_PDF.md` can be kept or deleted at the user's discretion

### Phase 5 — Patch Generation

For each **CRITICAL** or **HIGH** finding in `COMPARISON_RESULTS.md` where the problem is a code
difference (categories: **Modified** or **Lost**), generate a git patch file that can be applied
to `NEW_BRANCH` to restore or fix the affected code.

#### When to generate patches

- **Lost files** (category `Lost`): Restore the entire file from `OLD_BRANCH`
- **Modified files** (category `Modified`): Revert the damaging change by patching only the
  affected lines back to their `OLD_BRANCH` state
- **Security findings** (category `Security`): Only if the fix is a code change (not a
  configuration or architectural issue)
- Do **NOT** generate patches for MEDIUM findings or findings suppressed by Exception Rules

#### Output directory

Store all generated patches in `patches/` at the project root. Create the directory if it does
not exist:

```bash
mkdir -p patches/
```

#### Naming convention

Use sequential numbering with a short kebab-case description:

```
patches/001-restore-missing-status-filter-email.patch
patches/002-restore-deleted-custom-import.patch
patches/003-fix-dashlet-property-access.patch
```

#### Patch format and developer context header

Each patch file **must** begin with a comment block providing context for the developer.
Use the git mailbox format so the patch is compatible with `git am`:

```
From: AI Comparison Agent
Subject: [PATCH NNN] <short description of the fix>
Date: <generation date>

# Context
# -------
# Risk: <CRITICAL|HIGH>
# Category: <Lost|Modified|Security>
# Finding: <short problem description from COMPARISON_RESULTS.md>
# File(s): <affected file path(s) with line numbers>
# Description: <2-3 sentences explaining what was broken and what this
#   patch does to fix it. Reference the OLD_BRANCH behavior that is being
#   restored.>
# Reference: COMPARISON_RESULTS.md — Finding #<N>
---
<standard unified diff content>
```

#### How to generate patches

```bash
# For a LOST file — restore it entirely from OLD_BRANCH
git diff --no-index /dev/null <(git show origin/OLD_BRANCH:<file>) > patches/NNN-description.patch
# Then manually adjust the header paths in the patch (a/ b/ prefixes)

# Simpler alternative for lost files — extract and create patch
git show origin/OLD_BRANCH:<file> > /tmp/restored_file
diff -u /dev/null /tmp/restored_file > patches/NNN-description.patch
# Edit the patch header to use the correct target path

# For a MODIFIED file — generate a reverse diff of only the damaging changes
git diff origin/NEW_BRANCH origin/OLD_BRANCH -- <file> > patches/NNN-description.patch

# For targeted line-range fixes, manually craft the patch from the git diff output
```

#### How to apply patches

```bash
# Preview what the patch will do (dry run)
git apply --check patches/NNN-description.patch

# Apply a single patch
git apply patches/NNN-description.patch

# Apply all patches in order
for p in patches/*.patch; do git apply "$p"; done

# Alternative: apply with git am (preserves commit message from the header)
git am patches/NNN-description.patch
```

#### Patch validation

After generating each patch:

1. Verify the patch applies cleanly: `git apply --check patches/NNN-description.patch`
2. If the patch does not apply cleanly, note it in the patch header comment with a
   `# WARNING: May require manual conflict resolution` line
3. Ensure the context header is present and accurately describes the fix

## Result File — Output Format

Output: [`COMPARISON_RESULTS.md`](./COMPARISON_RESULTS.md) — **single file, max ~1 page**.

Only list **actual problems** (CRITICAL, HIGH, MEDIUM). Exclude LOW, whitespace-only, and
trivial path-only changes. Each entry is one line with:

- **Risk level**: CRITICAL / HIGH / MEDIUM
- **Problem**: Short description of the issue
- **File(s)**: Path(s) with line numbers where applicable
- **Category**: Lost / Modified / Security

### Table format

```markdown
| Risk | Category | Problem | File(s) |
|------|----------|---------|---------|
| CRITICAL | Security | Unauthenticated API endpoints | `custom/include/api/exampleApi.php:42` |
| CRITICAL | Modified | Query scope widened — removed status filter | `custom/modules/example/email.php:85` |
| HIGH | Lost | Custom import files deleted | `modules/Import/customImport.php` |
| MEDIUM | Modified | Dashlet property access change | `custom/clients/base/views/example/example.js:23` |
```

### Rules

- No detailed analysis or prose — just the table
- No file inventories for LOW/whitespace/trivial changes
- No session notes or progress tracking
- Keep it under **~50-80 lines max** (header + table)
- **Suppress findings that match an Exception Rule** (see "Exception Rules" section above)
- For detailed investigation, use `git diff` directly

## Git Commands Reference

```bash
# List files deleted between OLD_BRANCH and NEW_BRANCH
git diff --diff-filter=D --name-only origin/OLD_BRANCH...HEAD -- <dir>/

# List files modified between OLD_BRANCH and NEW_BRANCH
git diff --diff-filter=M --name-only origin/OLD_BRANCH...HEAD -- <dir>/

# Diff a specific file between branches
git diff origin/OLD_BRANCH...HEAD -- <file>

# List all files on a specific branch
git ls-tree -r --name-only <branch> -- <dir>/

# Count files
git ls-tree -r --name-only <branch> -- <dir>/ | wc -l
```
