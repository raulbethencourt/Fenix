---
name: websearch
description: Web search skill using DuckDuckGo (no API key needed) via the `ddgs` Python package. Use when the agent needs to discover URLs, search for information, or fetch and read web page content.
---

# Websearch Skill

Search the web and fetch page content without any API key, using `ddgs` (DuckDuckGo Search) and `lynx`.

## Requirements

```bash
pip install ddgs --break-system-packages   # already installed
which lynx                                  # for readable page content
```

## Text Search

Returns title, URL, and snippet for each result.

```bash
python3 - <<'EOF'
from ddgs import DDGS

results = DDGS().text("your query here", max_results=5)
for r in results:
    print(f"Title : {r['title']}")
    print(f"URL   : {r['href']}")
    print(f"Snippet: {r['body'][:200]}")
    print()
EOF
```

## News Search

```bash
python3 - <<'EOF'
from ddgs import DDGS

results = DDGS().news("your topic here", max_results=5)
for r in results:
    print(f"Title : {r['title']}")
    print(f"URL   : {r['url']}")
    print(f"Date  : {r['date']}")
    print(f"Source: {r['source']}")
    print()
EOF
```

## Fetch a Page as Readable Text

Use `lynx` to strip HTML and get clean readable content:

```bash
lynx -dump -nolist "https://example.com" 2>/dev/null | head -100
```

For longer pages, pipe through `grep` or `head`/`tail` to focus on relevant sections:

```bash
lynx -dump -nolist "https://example.com" 2>/dev/null | grep -A5 "keyword"
```

## Full Workflow: Search Then Read

```bash
python3 - <<'EOF'
from ddgs import DDGS
import subprocess

# 1. Search
results = DDGS().text("delta pager git syntax highlighting", max_results=3)
for r in results:
    print(r['title'], '->', r['href'])

# 2. Fetch the most relevant result
url = results[0]['href']
out = subprocess.run(
    ["lynx", "-dump", "-nolist", url],
    capture_output=True, text=True, timeout=15
)
print(out.stdout[:2000])
EOF
```

## Gotchas

- DuckDuckGo may rate-limit heavy usage; add `time.sleep(1)` between requests if needed
- `lynx` renders static HTML only — JS-heavy SPAs may return partial content
- For JS-heavy pages, fall back to the `browser` skill (Playwright)
- Always respect `max_results` to avoid unnecessary traffic

## When to Use

- Discovering URLs for a topic (curl/wget can't search)
- Getting up-to-date information not in training data
- Verifying current docs, changelogs, package versions
- News and recent events lookup
