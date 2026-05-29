---
name: wrike
description: >
  Wrike connector skill for managing Agile work items (Epics, Stories, Tasks,
  sub-tasks, comments, and attachments) via the Wrike REST API v4.
  Use this skill whenever an agent needs to read or write Wrike workspace data.
---

# Wrike Connector Skill

Connect to a Wrike workspace and manage the full Agile hierarchy:
**Epics → Stories → Tasks**, plus comments and file attachments.

---

## Prerequisites

### 1. Install dependencies

```bash
pip install requests python-dotenv
```

### 2. Get a Wrike access token

1. Log in to Wrike
2. Go to **Profile → Apps & Integrations → API**
3. Click **+ App**, enter a name, click **Get Token**
4. Copy the token immediately (shown only once)

### 3. Set environment variables

Export directly:

```bash
export WRIKE_ACCESS_TOKEN="your_token_here"
export WRIKE_BASE_URL="https://www.wrike.com/api/v4"   # EU: https://app-eu.wrike.com/api/v4
```

Or create a `.env` file next to the `scripts/` directory (copy from `.env.example`):

```
WRIKE_ACCESS_TOKEN=your_token_here
WRIKE_BASE_URL=https://www.wrike.com/api/v4
```

### 4. Verify setup

```python
import sys; sys.path.insert(0, "/path/to/wrike_connector_skill")
from scripts.client import WrikeClient
from scripts import epics

client = WrikeClient()
spaces = epics.get_spaces(client)
print(spaces[0]["title"])   # should print your workspace name
```

---

## How Wrike Maps to Agile Concepts

| Agile Concept | Wrike Object | Notes |
|---------------|--------------|-------|
| **Epic** | Project (folder + metadata) | Has owners, dates, status |
| **Story** | Task inside an Epic folder | Has assignees, story points, status |
| **Task / Sub-task** | Task with `superTaskIds` set | Child of a Story |
| **Sprint** | Folder inside an Epic | Optional grouping layer |
| **Custom fields** | `customFields` array | Story Points, Acceptance Criteria, etc. |
| **Workflow status** | `customStatusId` on a task | Backlog → In Progress → Review → Done |

---

## Core Actions

### Utility

#### `epics.get_spaces(client)`
List all Spaces the user can access. Always call this first to get a `space_id`.

```python
from scripts import epics
spaces = epics.get_spaces(client)
space_id = spaces[0]["id"]
```

#### `epics.get_workflows(client)`
List all workflows and their custom status IDs. Use to resolve status names to IDs.

```python
workflows = epics.get_workflows(client)
for wf in workflows:
    for status in wf["customStatuses"]:
        print(status["id"], status["name"])
```

#### `epics.get_custom_fields(client)`
List all custom field definitions (IDs, titles, types).

```python
fields = epics.get_custom_fields(client)
sp_field = next(f for f in fields if f["title"] == "Story Points")
sp_field_id = sp_field["id"]
```

---

### Epics

#### `epics.create_epic(client, space_id, title, **kwargs)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `space_id` | str | ✅ | Space where the Epic is created |
| `title` | str | ✅ | Epic title |
| `description` | str | | HTML or plain-text description |
| `owner_ids` | list[str] | | Wrike user IDs of Epic owners |
| `start_date` | str | | `YYYY-MM-DD` format |
| `end_date` | str | | `YYYY-MM-DD` format |
| `project_status` | str | | `Green`/`Yellow`/`Red`/`Completed`/`OnHold`/`Cancelled` (default: `Green`) |
| `custom_fields` | list[dict] | | `[{"id": "...", "value": "..."}]` |

```python
epic = epics.create_epic(
    client,
    space_id=space_id,
    title="User Authentication",
    description="Everything auth-related",
    start_date="2026-04-01",
    end_date="2026-06-30",
    owner_ids=["KUA..."],
)
epic_id = epic["id"]
```

#### `epics.get_epic(client, epic_id)`
```python
epic = epics.get_epic(client, epic_id)
print(epic["title"], epic["project"]["status"])
```

#### `epics.list_epics(client, space_id, *, include_archived=False)`
Returns only folders that have a `project` block (actual Projects, not plain folders).

```python
for epic in epics.list_epics(client, space_id):
    print(epic["id"], epic["title"])
```

#### `epics.find_epic(client, space_id, title)`
Find by exact title. Returns `None` if not found.

```python
epic = epics.find_epic(client, space_id, "User Authentication")
```

#### `epics.update_epic(client, epic_id, **kwargs)`
Same keyword args as `create_epic`. Only passed fields are changed.

```python
epics.update_epic(client, epic_id, project_status="Completed", end_date="2026-05-01")
```

#### `epics.delete_epic(client, epic_id)`
Moves Epic to Wrike's Recycle Bin.

```python
epics.delete_epic(client, epic_id)
```

---

### Stories

#### `stories.create_story(client, epic_id, title, **kwargs)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `epic_id` | str | ✅ | Epic (Project) that owns this Story |
| `title` | str | ✅ | Story title |
| `description` | str | | Description |
| `assignee_ids` | list[str] | | Wrike user IDs |
| `follower_ids` | list[str] | | Wrike user IDs |
| `custom_status_id` | str | | Workflow status ID |
| `importance` | str | | `High`/`Normal`/`Low` (default: `Normal`) |
| `start_date` | str | | `YYYY-MM-DD` |
| `due_date` | str | | `YYYY-MM-DD` |
| `story_points` | int | | Requires `story_points_field_id` |
| `story_points_field_id` | str | | Custom field ID for Story Points |
| `custom_fields` | list[dict] | | Additional custom fields |

```python
story = stories.create_story(
    client,
    epic_id=epic_id,
    title="Login Page",
    assignee_ids=["KUA..."],
    story_points=5,
    story_points_field_id=sp_field_id,
    due_date="2026-04-15",
)
story_id = story["id"]
```

#### `stories.get_story(client, story_id)`
```python
story = stories.get_story(client, story_id)
```

#### `stories.list_stories(client, epic_id, *, include_completed=True)`
Returns direct-child tasks of the Epic (no sub-tasks).

```python
for story in stories.list_stories(client, epic_id, include_completed=False):
    print(story["title"], story["status"])
```

#### `stories.find_story(client, epic_id, title)`
Find by exact title. Returns `None` if not found.

```python
story = stories.find_story(client, epic_id, "Login Page")
```

#### `stories.update_story(client, story_id, **kwargs)`
Same keyword args as `create_story`. Only passed fields are changed.

```python
stories.update_story(client, story_id, custom_status_id="IEAD...IN_PROGRESS", importance="High")
```

#### `stories.delete_story(client, story_id)`
```python
stories.delete_story(client, story_id)
```

---

### Tasks (Sub-tasks)

#### `tasks.create_task(client, story_id, epic_id, title, **kwargs)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `story_id` | str | ✅ | Parent Story (sets `superTasks`) |
| `epic_id` | str | ✅ | Epic folder (places task in right project) |
| `title` | str | ✅ | Task title |
| `description` | str | | Description |
| `assignee_ids` | list[str] | | Wrike user IDs |
| `custom_status_id` | str | | Workflow status ID |
| `importance` | str | | `High`/`Normal`/`Low` |
| `start_date` | str | | `YYYY-MM-DD` |
| `due_date` | str | | `YYYY-MM-DD` |
| `custom_fields` | list[dict] | | Custom fields |

```python
task = tasks.create_task(
    client,
    story_id=story_id,
    epic_id=epic_id,
    title="Write unit tests",
    assignee_ids=["KUA..."],
)
```

#### `tasks.get_task(client, task_id)`
```python
task = tasks.get_task(client, task_id)
```

#### `tasks.list_tasks(client, story_id, *, include_completed=True)`
Returns all sub-tasks of a Story.

```python
for task in tasks.list_tasks(client, story_id):
    print(task["title"])
```

#### `tasks.update_task(client, task_id, **kwargs)`
```python
tasks.update_task(client, task_id, custom_status_id="IEAD...DONE")
```

#### `tasks.delete_task(client, task_id)`
```python
tasks.delete_task(client, task_id)
```

---

### Comments

#### `comments.add_comment(client, task_id, text, *, plain_text=True)`
Works on both Stories and Tasks.

```python
comment = comments.add_comment(client, story_id, "Ready for review.")
comment_id = comment["id"]
```

#### `comments.list_comments(client, task_id, *, plain_text=True)`
Returns comments oldest-first.

```python
for c in comments.list_comments(client, story_id):
    print(c["authorId"], c["text"])
```

#### `comments.update_comment(client, comment_id, text, *, plain_text=True)`
```python
comments.update_comment(client, comment_id, "Ready for review — updated.")
```

#### `comments.delete_comment(client, comment_id)`
Permanent — not moved to Recycle Bin.

```python
comments.delete_comment(client, comment_id)
```

---

### Attachments

#### `attachments.upload_attachment(client, task_id, filepath, *, filename=None)`
```python
att = attachments.upload_attachment(client, story_id, "/tmp/spec.pdf")
att_id = att["id"]
```

#### `attachments.list_attachments(client, task_id, *, versions=False)`
```python
for a in attachments.list_attachments(client, story_id):
    print(a["name"], a["size"])
```

#### `attachments.get_attachment(client, attachment_id)`
```python
meta = attachments.get_attachment(client, att_id)
```

#### `attachments.download_attachment(client, attachment_id, dest)`
Streams to disk. If `dest` is a directory the original filename is used.

```python
saved = attachments.download_attachment(client, att_id, "/tmp/downloads/")
print(f"Saved to {saved}")
```

#### `attachments.delete_attachment(client, attachment_id)`
Permanent — not moved to Recycle Bin.

```python
attachments.delete_attachment(client, att_id)
```

---

## Common Workflows

### Workflow 1 — Create a full Epic with Stories and Tasks

```python
import sys; sys.path.insert(0, "/path/to/wrike_connector_skill")
from scripts.client import WrikeClient
from scripts import epics, stories, tasks

client = WrikeClient()

# 1. Find your Space
spaces = epics.get_spaces(client)
space_id = spaces[0]["id"]

# 2. Get Story Points field ID
fields = epics.get_custom_fields(client)
sp_id = next((f["id"] for f in fields if f["title"] == "Story Points"), None)

# 3. Create Epic
epic = epics.create_epic(
    client, space_id, "User Authentication",
    start_date="2026-04-01", end_date="2026-06-30",
)

# 4. Create Stories
for title, pts in [("Login Page", 5), ("Password Reset", 3), ("OAuth Integration", 8)]:
    story = stories.create_story(
        client, epic["id"], title,
        story_points=pts, story_points_field_id=sp_id,
    )

# 5. Add sub-tasks to first story
login_story = stories.find_story(client, epic["id"], "Login Page")
for t in ["Design mockup", "Implement form", "Write tests"]:
    tasks.create_task(client, login_story["id"], epic["id"], t)

client.close()
```

### Workflow 2 — Move a Story to "In Progress"

```python
# 1. Resolve the status ID once
workflows = epics.get_workflows(client)
in_progress_id = None
for wf in workflows:
    for s in wf["customStatuses"]:
        if s["name"] == "In Progress":
            in_progress_id = s["id"]
            break

# 2. Find and update the story
story = stories.find_story(client, epic_id, "Login Page")
stories.update_story(client, story["id"], custom_status_id=in_progress_id)
```

### Workflow 3 — Bulk sub-task creation

```python
subtasks = ["Write unit tests", "Code review", "Deploy to staging", "QA sign-off"]
for title in subtasks:
    tasks.create_task(client, story_id, epic_id, title)
```

### Workflow 4 — Attach a file and leave a comment

```python
att = attachments.upload_attachment(client, story_id, "/tmp/design.png")
comments.add_comment(client, story_id, f"Design attached: {att['name']}")
```

### Workflow 5 — Use a CIT template (if configured in workspace)

```python
# CIT must be set up in the Wrike UI first
cit_list = client.get("custom_item_types")
agile_epic_cit = next(c for c in cit_list if c["title"] == "Agile Epic")

result = client.post(
    f"custom_item_types/{agile_epic_cit['id']}/instantiate",
    {"parent": space_id, "title": "New Epic from Template"},
)
```

---

## Decision Rules

| Situation | Action |
|-----------|--------|
| Need to create an Epic | Use `epics.create_epic()` — creates a Wrike Project |
| Need to create a Story | Use `stories.create_story()` — creates a Task inside the Epic folder |
| Need to create a sub-task | Use `tasks.create_task()` — sets `superTasks` to the Story ID |
| Need workflow status IDs | Call `epics.get_workflows()` first, resolve by name |
| Need Story Points field ID | Call `epics.get_custom_fields()`, filter by title |
| Got a `ResourceNotFoundError` | ID is wrong or item was deleted; verify in Wrike UI |
| Got a `RateLimitError` | Already retried 3× automatically; reduce call frequency |
| Got an `AuthenticationError` | Token is invalid or expired; generate a new one |
| Workspace is in EU data center | Set `WRIKE_BASE_URL=https://app-eu.wrike.com/api/v4` |
| Don't know the Space ID | Call `epics.get_spaces(client)` and inspect the list |
| CIT template exists in workspace | Use `client.post("custom_item_types/{id}/instantiate", ...)` as a shortcut |

---

## Guardrails & Limitations

- **Rate limit:** 400 requests per 60-second window. `WrikeClient` applies a proactive sliding-window limiter and retries on 429 (up to 3×) before raising `RateLimitError`.
- **Batch GET limit:** Wrike allows up to 100 comma-separated IDs per request (e.g. `/tasks/id1,id2,...id100`).
- **ID format:** The Wrike UI shows v2 IDs; the API requires v4 IDs. If an ID from the UI returns 404, it may need conversion — copy IDs from API responses, not the browser URL.
- **CIT definitions:** Cannot be created via API — must be set up in the Wrike UI first.
- **Comment/attachment deletion:** Permanent (no Recycle Bin). Confirm before calling `delete_comment` or `delete_attachment`.
- **EU data center:** Users on the EU instance must change `WRIKE_BASE_URL` to `https://app-eu.wrike.com/api/v4`.
- **OAuth tokens:** Expire after 1 hour. Permanent tokens never expire. This skill uses permanent tokens by default.
- **`find_epic` / `find_story`:** Do a full list then client-side title match. Avoid in tight loops — cache the result instead.
- **Text size limit:** When you create the tasks for epics dont add emojis for explenation and be
  consize and clear in the task body explenation.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WRIKE_ACCESS_TOKEN` | ✅ | — | Permanent access token |
| `WRIKE_BASE_URL` | | `https://www.wrike.com/api/v4` | API base URL (change for EU) |

---

## File Structure

```
wrike_connector_skill/
├── wrike/
│   └── SKILL.md              ← this file
├── scripts/
│   ├── __init__.py           ← public re-exports
│   ├── client.py             ← WrikeClient, RateLimiter
│   ├── exceptions.py         ← exception hierarchy
│   ├── epics.py              ← Epic CRUD + utility helpers
│   ├── stories.py            ← Story CRUD
│   ├── tasks.py              ← Task/sub-task CRUD
│   ├── comments.py           ← Comment CRUD
│   └── attachments.py        ← Attachment upload/download/delete
├── tests/
│   ├── test_client.py
│   ├── test_epics.py
│   ├── test_stories.py
│   ├── test_tasks.py
│   └── test_comments.py
├── .env.example
├── requirements.txt
└── AGENTS.md
```

---

## Reference

- [Wrike API v4 Documentation](https://developers.wrike.com/api/v4/)
- [Wrike Custom Item Types](https://developers.wrike.com/api/v4/custom-item-types/)
- [Wrike Workflows](https://developers.wrike.com/api/v4/workflows/)
- [API Status](https://status.wrike.com)
