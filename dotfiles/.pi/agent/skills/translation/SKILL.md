---
name: translation
description: >
  Translation skill for Markdown documents using Google Translate via deep-translator.
  Supports any target language (fr, es, de, pt, zh-CN, ar, ja, …).
  Use this skill whenever an agent needs to translate Markdown files from one language to another.
---

# Translation Skill

Translate Markdown documents into any language while preserving code blocks, front-matter, and document structure.

---

## Prerequisites

### 1. Install dependencies

```bash
pip install deep-translator
```

### 2. Verify setup

```python
import sys; sys.path.insert(0, "/path/to/translation_skill")
from scripts.translator import Translator

t = Translator(target="fr")
print(t.translate("Hello, world!"))   # → "Bonjour le monde !"
```

No API key is required — Google Translate is accessed via the free web endpoint.

---

## Supported Languages

Any language code accepted by Google Translate (BCP-47 / ISO 639-1).

| Code | Language |
|------|----------|
| `fr` | French |
| `es` | Spanish |
| `de` | German |
| `pt` | Portuguese |
| `it` | Italian |
| `nl` | Dutch |
| `zh-CN` | Chinese (Simplified) |
| `zh-TW` | Chinese (Traditional) |
| `ja` | Japanese |
| `ko` | Korean |
| `ar` | Arabic |
| `ru` | Russian |
| `pl` | Polish |

Use `source="auto"` (default) to let Google detect the source language automatically.

---

## Core Actions

### `Translator(target, source="auto")`

Create a translator instance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | str | ✅ | Target language code (e.g. `"fr"`, `"es"`) |
| `source` | str | | Source language code or `"auto"` (default) |

```python
from scripts.translator import Translator

t = Translator(target="fr")           # French, auto-detect source
t_es = Translator(target="es", source="en")  # Spanish from English
```

---

### `Translator.translate(text)`

Translate a plain-text string.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | str | ✅ | Text to translate |

```python
result = t.translate("Please review the attached document.")
# → "Veuillez examiner le document ci-joint."
```

- Whitespace-only strings are returned unchanged.
- Strings longer than ~4 500 characters are split on paragraph/line boundaries automatically.

---

### `markdown.translate_text(translator, text)`

Translate a full Markdown string in-memory.

```python
from scripts import markdown
from scripts.translator import Translator

t = Translator(target="de")
md_source = "# Introduction\n\nThis guide explains how to use the API.\n\n```python\nprint('hello')\n```\n"
md_translated = markdown.translate_text(t, md_source)
```

**Preserved as-is (never translated):**
- Fenced code blocks (``` ``` ``` or `~~~`)
- Indented code blocks (4-space / tab prefix)
- YAML / TOML front-matter (`--- … ---` at the top of the file)

---

### `markdown.translate_file(translator, src, dst, *, verbose=True)`

Translate a single Markdown file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `translator` | Translator | ✅ | Configured Translator instance |
| `src` | str \| Path | ✅ | Path to source `.md` file |
| `dst` | str \| Path | ✅ | Path for the translated output file |
| `verbose` | bool | | Print progress (default: `True`) |

```python
from scripts import markdown
from scripts.translator import Translator

t = Translator(target="fr")
markdown.translate_file(t, "docs/guide.md", "docs/guide-fr.md")
```

- Parent directories of *dst* are created automatically.

---

### `markdown.translate_directory(translator, src_dir, dst_dir, *, pattern="*.md", verbose=True)`

Translate all Markdown files under a directory tree.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `translator` | Translator | ✅ | Configured Translator instance |
| `src_dir` | str \| Path | ✅ | Root source directory |
| `dst_dir` | str \| Path | ✅ | Root destination directory |
| `pattern` | str | | Glob pattern to match (default: `"*.md"`) |
| `verbose` | bool | | Print progress (default: `True`) |

Returns a `list[tuple[Path, Path]]` of `(src_file, dst_file)` pairs.

```python
results = markdown.translate_directory(t, "docs/", "docs-fr/")
for src, dst in results:
    print(f"  {src} → {dst}")
```

The relative directory hierarchy is preserved in *dst_dir*.

---

## Common Workflows

### Workflow 1 — Translate a single file to French

```python
import sys; sys.path.insert(0, "/path/to/translation_skill")
from scripts.translator import Translator
from scripts import markdown

t = Translator(target="fr")
markdown.translate_file(t, "docs/user-guide.md", "docs/user-guide-fr.md")
```

---

### Workflow 2 — Translate an entire docs folder to Spanish

```python
import sys; sys.path.insert(0, "/path/to/translation_skill")
from scripts.translator import Translator
from scripts import markdown

t = Translator(target="es")
results = markdown.translate_directory(t, "docs/", "docs-es/")
print(f"Translated {len(results)} files.")
```

---

### Workflow 3 — Translate multiple files to multiple languages

```python
import sys; sys.path.insert(0, "/path/to/translation_skill")
from scripts.translator import Translator
from scripts import markdown

files = [
    ("docs/qa-nf525-functional-testing.md",  "docs/qa-nf525-functional-testing-{lang}.md"),
    ("docs/user-guide-handover.md",           "docs/user-guide-handover-{lang}.md"),
]

for lang in ["fr", "es", "de"]:
    t = Translator(target=lang)
    for src, dst_tpl in files:
        markdown.translate_file(t, src, dst_tpl.format(lang=lang))
```

---

### Workflow 4 — Translate in-memory without writing a file

```python
from scripts.translator import Translator
from scripts import markdown

t = Translator(target="pt")
with open("docs/readme.md", encoding="utf-8") as f:
    source = f.read()

translated = markdown.translate_text(t, source)
print(translated[:500])
```

---

### Workflow 5 — Handle errors gracefully

```python
from scripts.translator import Translator
from scripts import markdown
from scripts.exceptions import (
    UnsupportedLanguageError,
    ProviderError,
    FileNotFoundError,
)

try:
    t = Translator(target="xx")   # invalid code
except UnsupportedLanguageError as e:
    print(f"Bad language: {e}")

try:
    t = Translator(target="fr")
    markdown.translate_file(t, "missing.md", "out.md")
except FileNotFoundError as e:
    print(f"File not found: {e}")
except ProviderError as e:
    print(f"Translation API error: {e}")
```

---

## Decision Rules

| Situation | Action |
|-----------|--------|
| Translating one file | `markdown.translate_file(t, src, dst)` |
| Translating a folder | `markdown.translate_directory(t, src_dir, dst_dir)` |
| Need in-memory result | `markdown.translate_text(t, text_string)` |
| Need plain string translated | `t.translate("your text")` |
| Code blocks must not be translated | ✅ Already handled — fenced and indented blocks are preserved automatically |
| Front-matter must not be translated | ✅ Already handled — YAML/TOML front-matter is skipped |
| Unsupported language code | Use a valid BCP-47 / ISO 639-1 code; see table above |
| `ProviderError` raised | Check network connectivity; Google Translate free tier may be rate-limited |
| Long documents (> 4 500 chars) | Handled automatically by chunked translation |

---

## Guardrails & Limitations

- **No API key required** — uses the free Google Translate web endpoint via `deep-translator`. For production workloads consider the paid API.
- **Rate limiting** — the free endpoint may throttle heavy use. Add delays between files if you hit errors on large batches.
- **Chunk size** — each translator call is capped at ~4 500 characters. Very long single paragraphs (no blank lines) may produce slightly unnatural splits.
- **Code block detection** — fenced blocks (``` ``` ```, `~~~`) and indented blocks are skipped. Inline backtick spans (`` `code` ``) inside prose are passed to the translator as-is; the translator usually preserves them.
- **Front-matter** — only the `--- … ---` block at the very start of the file is skipped. Inline YAML elsewhere is not detected.
- **HTML inside Markdown** — HTML tags are passed to the translator, which generally preserves them but is not guaranteed to.

---

## File Structure

```
translation_skill/
├── translation/
│   └── SKILL.md              ← this file
├── scripts/
│   ├── __init__.py           ← public re-exports
│   ├── translator.py         ← Translator class (Google Translate wrapper)
│   ├── markdown.py           ← Markdown file/directory translation
│   └── exceptions.py         ← exception hierarchy
├── tests/
│   ├── __init__.py
│   ├── test_translator.py
│   └── test_markdown.py
├── requirements.txt
└── AGENTS.md
```

---

## Reference

- [deep-translator documentation](https://deep-translator.readthedocs.io/)
- [Google Translate supported languages](https://cloud.google.com/translate/docs/languages)
- [BCP-47 language codes](https://www.ietf.org/rfc/bcp/bcp47.txt)
