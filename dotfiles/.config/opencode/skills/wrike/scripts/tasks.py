"""Task helpers — Tasks/Subtasks map to Wrike Tasks with a parent Story.

A Task (sub-task) is a Wrike Task whose ``superTaskIds`` field is set to the
ID of its parent Story.  This creates the three-level hierarchy:

    Epic (Project) → Story (Task) → Task (Sub-task)

Typical usage::

    from scripts.client import WrikeClient
    from scripts import tasks

    client = WrikeClient()

    # Create a sub-task under a Story
    task = tasks.create_task(
        client,
        story_id="IEAD...",
        epic_id="IEAD...",
        title="Write unit tests",
        assignee_ids=["KUA..."],
    )

    # List, fetch, update, delete
    all_tasks = tasks.list_tasks(client, story_id="IEAD...")
    task = tasks.get_task(client, task["id"])
    tasks.update_task(client, task["id"], custom_status_id="IEAD...DONE")
    tasks.delete_task(client, task["id"])
"""

from typing import Any

from .client import WrikeClient


# ---------------------------------------------------------------------------
# Tasks CRUD
# ---------------------------------------------------------------------------


def create_task(
    client: WrikeClient,
    story_id: str,
    epic_id: str,
    title: str,
    *,
    description: str = "",
    assignee_ids: list[str] | None = None,
    follower_ids: list[str] | None = None,
    custom_status_id: str | None = None,
    importance: str = "Normal",
    start_date: str | None = None,
    due_date: str | None = None,
    custom_fields: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Create a new Task (sub-task) under a Story.

    The task is placed inside the Epic folder AND linked to the Story as its
    parent task via ``superTasks``.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        story_id: Wrike task ID of the parent Story.
        epic_id: Wrike folder/project ID of the Epic (used as the folder
            parent so the task appears in the right project).
        title: Task title.
        description: Optional HTML or plain-text description.
        assignee_ids: List of Wrike user IDs to assign.
        follower_ids: List of Wrike user IDs to add as followers.
        custom_status_id: Workflow status ID.
        importance: ``High``, ``Normal`` (default), or ``Low``.
        start_date: Planned start date in ``YYYY-MM-DD`` format.
        due_date: Planned due date in ``YYYY-MM-DD`` format.
        custom_fields: List of ``{"id": "<fieldId>", "value": "<val>"}`` dicts.

    Returns:
        The created Task dict from the Wrike API.

    Raises:
        ValidationError: If required fields are missing or malformed.
        WrikeAPIError: On any other API failure.

    Example::

        task = create_task(
            client,
            story_id="IEAD...STORY",
            epic_id="IEAD...EPIC",
            title="Write unit tests",
        )
        print(task["id"])
    """
    payload: dict[str, Any] = {
        "title": title,
        "importance": importance,
        "superTasks": [story_id],
    }

    if description:
        payload["description"] = description
    if assignee_ids:
        payload["responsibles"] = assignee_ids
    if follower_ids:
        payload["followers"] = follower_ids
    if custom_status_id:
        payload["customStatus"] = custom_status_id
    if custom_fields:
        payload["customFields"] = custom_fields

    dates: dict[str, Any] = {"type": "Planned"}
    if start_date:
        dates["start"] = start_date
    if due_date:
        dates["due"] = due_date
    if start_date or due_date:
        payload["dates"] = dates

    results = client.post(f"folders/{epic_id}/tasks", payload)
    return results[0]


def get_task(client: WrikeClient, task_id: str) -> dict[str, Any]:
    """Fetch a single Task by its ID.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        task_id: Wrike task ID.

    Returns:
        The Task dict.

    Raises:
        ResourceNotFoundError: If the Task does not exist.

    Example::

        task = get_task(client, "IEAD...")
        print(task["title"], task["status"])
    """
    results = client.get(f"tasks/{task_id}")
    return results[0]


def list_tasks(
    client: WrikeClient,
    story_id: str,
    *,
    include_completed: bool = True,
) -> list[dict[str, Any]]:
    """List all sub-tasks belonging to a Story.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        story_id: Wrike task ID of the parent Story.
        include_completed: If ``False``, only return active sub-tasks.

    Returns:
        List of Task dicts whose ``superTaskIds`` contains ``story_id``.

    Example::

        for task in list_tasks(client, story_id):
            print(task["id"], task["title"])
    """
    params: dict[str, Any] = {"subTasks": True, "descendants": False}
    if not include_completed:
        params["status"] = "Active"

    all_tasks = client.get(f"tasks/{story_id}/subtasks", params=params)

    # Fallback: if the /subtasks endpoint is not available, query by super task
    if not all_tasks:
        all_tasks = client.get(
            "tasks",
            params={**params, "superTasks": story_id},
        )

    return all_tasks


def update_task(
    client: WrikeClient,
    task_id: str,
    *,
    title: str | None = None,
    description: str | None = None,
    assignee_ids: list[str] | None = None,
    custom_status_id: str | None = None,
    importance: str | None = None,
    start_date: str | None = None,
    due_date: str | None = None,
    custom_fields: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Update an existing Task.

    Only the keyword arguments you pass will be modified.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        task_id: Wrike task ID of the Task to update.
        title: New title.
        description: New description.
        assignee_ids: Replace assignee list.
        custom_status_id: New workflow status ID.
        importance: ``High``, ``Normal``, or ``Low``.
        start_date: New start date in ``YYYY-MM-DD`` format.
        due_date: New due date in ``YYYY-MM-DD`` format.
        custom_fields: Custom field overrides.

    Returns:
        The updated Task dict.

    Raises:
        ResourceNotFoundError: If the Task does not exist.

    Example::

        updated = update_task(client, "IEAD...", custom_status_id="IEAD...DONE")
    """
    payload: dict[str, Any] = {}

    if title is not None:
        payload["title"] = title
    if description is not None:
        payload["description"] = description
    if assignee_ids is not None:
        payload["responsibles"] = assignee_ids
    if custom_status_id is not None:
        payload["customStatus"] = custom_status_id
    if importance is not None:
        payload["importance"] = importance
    if custom_fields is not None:
        payload["customFields"] = custom_fields

    dates: dict[str, Any] = {}
    if start_date is not None:
        dates["start"] = start_date
    if due_date is not None:
        dates["due"] = due_date
    if dates:
        payload["dates"] = dates

    results = client.put(f"tasks/{task_id}", payload)
    return results[0]


def delete_task(client: WrikeClient, task_id: str) -> None:
    """Delete a Task (moves it to Wrike's Recycle Bin).

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        task_id: Wrike task ID to delete.

    Raises:
        ResourceNotFoundError: If the Task does not exist.

    Example::

        delete_task(client, "IEAD...")
    """
    client.delete(f"tasks/{task_id}")
