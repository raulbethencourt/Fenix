"""Summarize helpers — fetch and format tasks assigned to a user.

Fixes the ``folders/{id}/tasks`` bug where ``responsibleIds`` is silently
stripped: task IDs are collected from the folder endpoint, then
batch-resolved individually via :meth:`WrikeClient.get_tasks_batch`.

Typical usage::

    from scripts.client import WrikeClient
    from scripts import summarize

    client = WrikeClient()

    # All tasks in a sprint assigned to me (identity from config.py)
    my_tasks = summarize.get_my_tasks_in_folder(client, folder_id="MQAAAAEI3abz")

    # Rich summary with status names and tags
    rows = summarize.summarize_tasks(client, my_tasks)
    for r in rows:
        print(r["status"], r["title"], r["tags"])
"""

from __future__ import annotations

from typing import Any

from . import epics as _epics
from .client import WrikeClient
from .config import CUSTOM_FIELD_IDS, get_me_id


# ---------------------------------------------------------------------------
# Fetch helpers
# ---------------------------------------------------------------------------


def fetch_folder_tasks_with_responsibles(
    client: WrikeClient,
    folder_id: str,
    *,
    descendants: bool = True,
) -> list[dict[str, Any]]:
    """Return fully-hydrated tasks from a folder with correct ``responsibleIds``.

    The ``folders/{id}/tasks`` endpoint silently strips ``responsibleIds``
    from its response.  This function collects task IDs from that endpoint
    (cheap, no field stripping) and then batch-fetches each task individually
    so all fields — including ``responsibleIds`` — are populated correctly.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        folder_id: Wrike folder or project ID.
        descendants: If ``True`` (default), include tasks in sub-folders.

    Returns:
        List of fully-hydrated task dicts.

    Example::

        tasks = fetch_folder_tasks_with_responsibles(client, "MQAAAAEI3abz")
        for t in tasks:
            print(t["responsibleIds"], t["title"])
    """
    stub_tasks = client.get(
        f"folders/{folder_id}/tasks",
        params={"descendants": descendants, "pageSize": 200},
    )
    task_ids = [t["id"] for t in stub_tasks]
    return client.get_tasks_batch(task_ids)


def get_my_tasks_in_folder(
    client: WrikeClient,
    folder_id: str,
    *,
    user_id: str | None = None,
    descendants: bool = True,
) -> list[dict[str, Any]]:
    """Return tasks inside a folder that are assigned to a specific user.

    Defaults to the identity configured in :mod:`scripts.config` (Raul
    Bethencourt / ``KUALBZKV``) or the ``WRIKE_ME_ID`` env var.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        folder_id: Wrike folder or project ID (e.g. a Sprint folder).
        user_id: Wrike user ID to filter by. Defaults to :func:`get_me_id`.
        descendants: If ``True`` (default), include tasks in sub-folders.

    Returns:
        List of task dicts assigned to the user.

    Example::

        my_tasks = get_my_tasks_in_folder(client, "MQAAAAEI3abz")
        print(f"{len(my_tasks)} tasks assigned to me")
    """
    uid = user_id or get_me_id()
    all_tasks = fetch_folder_tasks_with_responsibles(
        client, folder_id, descendants=descendants
    )
    return [t for t in all_tasks if uid in t.get("responsibleIds", [])]


# ---------------------------------------------------------------------------
# Summary formatter
# ---------------------------------------------------------------------------


def _build_cf_map(client: WrikeClient) -> dict[str, str]:
    """Return a mapping of custom field ID -> title.

    Merges the static :data:`CUSTOM_FIELD_IDS` registry with live data from
    the API so new fields are always resolved.
    """
    cf_map: dict[str, str] = dict(CUSTOM_FIELD_IDS)
    try:
        live_fields = _epics.get_custom_fields(client)
        for f in live_fields:
            cf_map.setdefault(f["id"], f["title"])
    except Exception:
        pass  # Fall back to static registry on API error
    return cf_map


def summarize_tasks(
    client: WrikeClient,
    tasks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Convert raw task dicts into human-readable summary rows.

    Each row contains:
    - ``id``: task ID
    - ``title``: task title
    - ``status``: resolved custom status name (e.g. "In Progress")
    - ``importance``: High / Normal / Low
    - ``due``: due date string ``YYYY-MM-DD`` or ``None``
    - ``story_points``: int or ``None``
    - ``tags``: list of ``"FieldName:value"`` strings built from custom fields
    - ``subtasks``: count of sub-task IDs
    - ``has_attachments``: bool
    - ``description``: brief description (first 300 chars, HTML stripped)
    - ``permalink``: direct Wrike URL

    Args:
        client: Authenticated :class:`WrikeClient` instance (used to resolve
            status names and custom field titles).
        tasks: List of raw task dicts (e.g. from :func:`get_my_tasks_in_folder`).

    Returns:
        List of summary dicts, one per task.

    Example::

        rows = summarize_tasks(client, my_tasks)
        for r in rows:
            print(f"[{r['status']}] {r['title']}  tags={r['tags']}")
    """
    # Build status map
    workflows = _epics.get_workflows(client)
    status_map: dict[str, str] = {
        s["id"]: s["name"]
        for wf in workflows
        for s in wf.get("customStatuses", [])
    }

    cf_map = _build_cf_map(client)

    # Story Points field ID (first match wins)
    sp_field_id = next(
        (fid for fid, title in cf_map.items() if title == "Story Points"), None
    )

    rows: list[dict[str, Any]] = []
    for t in tasks:
        status = status_map.get(t.get("customStatusId", ""), t.get("status", "Active"))

        dates = t.get("dates", {})
        due_raw = dates.get("due") if dates else None
        due = due_raw[:10] if due_raw else None

        # Custom fields → tags + story points
        story_points: int | None = None
        tags: list[str] = []
        for cf in t.get("customFields", []):
            fid = cf.get("id", "")
            val = cf.get("value", "")
            if not val:
                continue
            field_name = cf_map.get(fid, fid)
            if fid == sp_field_id:
                try:
                    story_points = int(val)
                except ValueError:
                    pass
                tags.append(f"StoryPoints:{val}")
            else:
                tags.append(f"{field_name}:{val}")

        # Strip basic HTML from brief description
        brief = t.get("briefDescription", "") or ""
        brief = (
            brief.replace("<br />", " ")
            .replace("<br>", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&#39;", "'")
            .replace("&quot;", '"')
            .strip()
        )
        # Remove remaining HTML tags naively
        import re
        brief = re.sub(r"<[^>]+>", "", brief).strip()[:300]

        rows.append(
            {
                "id": t["id"],
                "title": t["title"],
                "status": status,
                "importance": t.get("importance", "Normal"),
                "due": due,
                "story_points": story_points,
                "tags": tags,
                "subtasks": len(t.get("subTaskIds", [])),
                "has_attachments": t.get("hasAttachments", False),
                "description": brief,
                "permalink": t.get("permalink", ""),
            }
        )

    return rows
