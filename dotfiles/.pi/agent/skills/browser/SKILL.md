---
name: browser
description: >
  Browser automation skill for testing SugarCRM Enterprise (v12-25).
  Use for simulating user interactions: clicking buttons, filling forms,
  navigating modules, creating records, and verifying functionality.
  Requires Playwright and Chromium browser installed.
---

# Browser Automation Skill

Control a Chromium browser to test SugarCRM Enterprise (versions 12-25) by simulating user interactions.

## When This Skill MUST Be Used

**Invoke this skill for ANY task involving:**

- Testing SugarCRM functionality
- Automating browser interactions with web applications
- UI testing, form submissions, navigation flows
- Screenshot capture of web pages
- Data extraction from web pages

## Prerequisites

### 1. Install Playwright

```bash
pip install playwright
playwright install chromium
```

### 2. Set Environment Variables

```bash
export SUGARCRM_URL="https://your-instance.sugarcrm.com"
export SUGARCRM_USERNAME="your-username"
export SUGARCRM_PASSWORD="your-password"
```

Optionally create `~/.config/opencode/skills/browser/.env`:

```
SUGARCRM_URL=https://your-instance.sugarcrm.com
SUGARCRM_USERNAME=admin
SUGARCRM_PASSWORD=your-password
```

### 3. Verify Installation

```bash
python -c "from playwright.sync_api import sync_playwright; print('OK')"
```

## Core Actions

### Launch Browser

```python
from scripts.launcher import launch

# Headed mode (visible browser)
browser, page = launch(headless=False)

# Headless mode (background)
browser, page = launch(headless=True)
```

### Navigate to URL

```python
page.goto("https://example.com")
# Or use CRM URL from env
import os
page.goto(os.environ.get("SUGARCRM_URL"))
```

### Click Element

```python
# By CSS selector
page.click("#save-button")

# By text content
page.click("text=Save")

# By partial text
page.click("text=Create New")
```

### Fill Input Field

```python
# By selector
page.fill("#first_name", "John")

# By label text
page.fill("label:has-text('First Name')", "John")

# Type slowly (simulates real user)
page.type("#email", "john@example.com", delay=100)
```

### Select Dropdown

```python
# By value
page.select_option("#industry", "Technology")

# By label
page.select_option("#status", label="Active")
```

### Wait for Element

```python
# Wait for selector
page.wait_for_selector(".record-list")

# Wait for text
page.wait_for_selector("text=Lead created successfully")

# Wait for navigation
page.wait_for_load_state("networkidle")
page.wait_for_url("**/Accounts/**")
```

### Screenshot

```python
# Full page
page.screenshot(path="screenshot.png", full_page=True)

# Visible area only
page.screenshot(path="screenshot.png")

# Specific element
page.locator(".record-panel").screenshot(path="panel.png")
```

### Extract Content

```python
# Get text from element
name = page.locator(".record-name").inner_text()

# Get attribute value
url = page.locator("a.documentation").get_attribute("href")

# Get all text from page
content = page.content()

# Evaluate JavaScript
title = page.evaluate("document.title")
```

### Execute JavaScript

```python
# Run custom JS
result = page.evaluate("""(arg) => {
    return document.querySelector('.count').innerText;
}""")
```

### Close Browser

```python
browser.close()
```

## SugarCRM-Specific Helpers

Located in `scripts/crm_helpers.py`:

### Login to SugarCRM

```python
from scripts.crm_helpers import login

# Uses environment variables automatically
page = login(browser)
```

### Logout from SugarCRM

```python
from scripts.crm_helpers import logout

logout(page)
```

### Open Module

```python
from scripts.crm_helpers import open_module

# Navigate to module
open_module(page, "Accounts")
open_module(page, "Contacts")
open_module(page, "Leads")
open_module(page, "Opportunities")
```

### Create Record

```python
from scripts.crm_helpers import create_record

# Create an Account record
create_record(page, "Accounts", {
    "name": "Acme Corp",
    "phone": "+1234567890",
    "industry": "Technology",
    "website": "https://acme.com"
})
```

### Search

```python
from scripts.crm_helpers import search

# Global search
results = search(page, "Acme")
# Returns list of matching record names
```

### Handle Notifications

```python
from scripts.crm_helpers import handle_notifications

# Dismiss toast notifications
handle_notifications(page)
```

### Wait for Module Load

```python
from scripts.crm_helpers import wait_for_module_load

# Wait for module list view
wait_for_module_load(page, "Accounts")
```

## Common Workflows

### Workflow 1: Login and Create Lead

```python
from scripts.launcher import launch
from scripts.crm_helpers import login, open_module, create_record

browser, page = launch(headless=False)
login(page)
open_module(page, "Leads")
create_record(page, "Leads", {
    "first_name": "John",
    "last_name": "Doe",
    "email1": "john.doe@example.com",
    "phone_work": "+1234567890",
    "account_name": "Acme Corp"
})
browser.close()
```

### Workflow 2: Update Existing Record

```python
from scripts.launcher import launch
from scripts.crm_helpers import login, search, handle_notifications

browser, page = launch(headless=False)
login(page)

# Search for record
page.fill("input.search-input", "Acme Corp")
page.click("button.search-button")
page.wait_for_selector("text=Acme Corp")

# Click first result
page.click("tr[data-id] >> text=Acme Corp")

# Edit
page.click("button.edit-button")
page.fill("#phone_office", "+9876543210")
page.click("button.save")

handle_notifications(page)
browser.close()
```

### Workflow 3: Export Data

```python
from scripts.launcher import launch
from scripts.crm_helpers import login, open_module

browser, page = launch(headless=False)
login(page)
open_module(page, "Accounts")

# Select all records
page.click("input.select-all")
page.click("button.export")

# Download handled by browser
browser.close()
```

## Error Handling

### Retry Failed Actions

```python
from playwright.sync_api import expect

# Retry click up to 3 times
for _ in range(3):
    try:
        page.click("button.save")
        break
    except Exception:
        page.wait_for_timeout(1000)
```

### Handle Popups

```python
# Handle alert/prompt
page.on("dialog", lambda dialog: dialog.accept())

# Handle new window
with page.context.expect_page() as new_page_info:
    page.click("a.new-window")
new_page = new_page_info.value
```

### Handle Navigation Errors

```python
try:
    page.goto(url, timeout=30000)
except Exception as e:
    print(f"Navigation failed: {e}")
    page.screenshot(path="error.png")
```

## Troubleshooting

### Browser Won't Launch

```bash
# Install browser dependencies
playwright install-deps chromium

# Or install all browsers
playwright install
```

### Login Fails

- Verify environment variables are set: `echo $SUGARCRM_URL`
- Check URL is correct (includes https://)
- Verify credentials work manually first

### Element Not Found

- Use `page.screenshot()` to see current state
- Check if element is in iframe (use `page.frame()`)
- Wait longer with `page.wait_for_timeout(2000)`
- Inspect page HTML: `print(page.content())`

### Slow Performance

- Use headless mode: `launch(headless=True)`
- Disable screenshots during tests
- Use CSS selectors instead of text selectors

## Best Practices

1. **Always close browser** - Call `browser.close()` in finally block
2. **Use explicit waits** - Avoid `sleep()`, use `wait_for_selector()`
3. **Take screenshots on failure** - Helps debug issues
4. **Use unique selectors** - Prefer data attributes or IDs
5. **Handle notifications** - Call `handle_notifications()` after actions
6. **Log actions** - Print steps for debugging

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUGARCRM_URL` | Yes | SugarCRM instance URL |
| `SUGARCRM_USERNAME` | Yes | Login username |
| `SUGARCRM_PASSWORD` | Yes | Login password |

## File Structure

```
~/.config/opencode/skills/browser/
├── SKILL.md              # This file
├── .env.example          # Environment template
└── scripts/
    ├── __init__.py
    ├── launcher.py       # Browser launch entry point
    ├── browser.py        # Core Playwright actions
    └── crm_helpers.py   # SugarCRM helpers
```
