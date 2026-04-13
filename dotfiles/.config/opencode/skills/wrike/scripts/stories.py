"""Story helpers — Stories map to Wrike Tasks living inside an Epic (Project).

A Story is a standard Wrike Task created directly inside an Epic folder/project.
It supports assignees, custom workflow statuses, custom fields (e.g. Story Points),
and a full description.

Typical usage::

    from scripts.client import WrikeClient
    from scripts import stories

    client = WrikeClient()

    # Create a Story inside an Epic
    story = stories.create_story(
        client,
        epic_id="IEAD...",
        title="Login Page",
        description="Implement the login UI",
        assignee_ids=["KUA..."],
        story_points=5,
    )

    # List, find, update, delete
    all_stories = stories.list_stories(client, epic_id="IEAD...")
    found = stories.find_story(client, epic_id="IEAD...", title="Login Page")
    stories.update_story(client, story["id"], custom_status_id="IEAD...STATUS")
    stories.delete_story(client, story["id"])
"""

from typing import Any

from .client import WrikeClient

# Wrike custom field title used to store Story Points (configurable).
_STORY_POINTS_FIELD_TITLE = "Story Points"


# ---------------------------------------------------------------------------
# Stories CRUD
# ---------------------------------------------------------------------------


def create_story(
    client: WrikeClient,
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
    story_points: int | None = None,
    story_points_field_id: str | None = None,
    custom_fields: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Create a new Story (Task) inside an Epic.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        epic_id: ID of the Epic (Project/folder) that owns this Story.
        title: Story title.
        description: Optional HTML or plain-text description.
        assignee_ids: List of Wrike user IDs to assign the Story to.
        follower_ids: List of Wrike user IDs to add as followers.
        custom_status_id: ID of a custom workflow status (e.g. "In Progress").
            Obtain status IDs via :func:`epics.get_workflows`.
        importance: ``High``, ``Normal`` (default), or ``Low``.
        start_date: Planned start date in ``YYYY-MM-DD`` format.
        due_date: Planned due date in ``YYYY-MM-DD`` format.
        story_points: Numeric story point estimate.  Requires
            ``story_points_field_id`` unless the field is auto-detected.
        story_points_field_id: Custom field ID for Story Points.  If omitted
            and ``story_points`` is given, the value is ignored (use
            ``custom_fields`` directly instead).
        custom_fields: Additional custom fields as
            ``[{"id": "<fieldId>", "value": "<val>"}, ...]``.

    Returns:
        The created Story dict from the Wrike API.

    Raises:
        ValidationError: If required fields are missing or malformed.
        WrikeAPIError: On any other API failure.

    Example::

        story = create_story(
            client,
            epic_id="IEAD...",
            title="Login Page",
            assignee_ids=["KUA..."],
            story_points=5,
            story_points_field_id="IEAD...FIELD",
        )
        print(story["id"])
    """
    payload: dict[str, Any] = {
        "title": title,
        "importance": importance,
    }

    if description:
        payload["description"] = description
    if assignee_ids:
        payload["responsibles"] = assignee_ids
    if follower_ids:
        payload["followers"] = follower_ids
    if custom_status_id:
        payload["customStatus"] = custom_status_id

    dates: dict[str, Any] = {"type": "Planned"}
    if start_date:
        dates["start"] = start_date
    if due_date:
        dates["due"] = due_date
    if start_date or due_date:
        payload["dates"] = dates

    # Merge story_points into custom_fields if a field ID is provided
    merged_fields: list[dict[str, str]] = list(custom_fields or [])
    if story_points is not None and story_points_field_id:
        merged_fields.append({"id": story_points_field_id, "value": str(story_points)})
    if merged_fields:
        payload["customFields"] = merged_fields

    results = client.post(f"folders/{epic_id}/tasks", payload)
    return results[0]


def get_story(client: WrikeClient, story_id: str) -> dict[str, Any]:
    """Fetch a single Story by its task ID.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        story_id: Wrike task ID of the Story.

    Returns:
        The Story dict.

    Raises:
        ResourceNotFoundError: If the Story does not exist.

    Example::

        story = get_story(client, "IEAD...")
        print(story["title"], story["status"])
    """
    results = client.get(f"tasks/{story_id}")
    return results[0]


def list_stories(
    client: WrikeClient,
    epic_id: str,
    *,
    include_completed: bool = True,
) -> list[dict[str, Any]]:
    """List all Stories (direct-child Tasks) inside an Epic.

    Sub-tasks are excluded; only top-level tasks belonging to the Epic are
    returned.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        epic_id: ID of the Epic (Project/folder).
        include_completed: If ``False``, only return non-completed Stories.

    Returns:
        List of Story dicts.

    Example::

        for story in list_stories(client, epic_id):
            print(story["id"], story["title"], story["status"])
    """
    params: dict[str, Any] = {"descendants": False}
    if not include_completed:
        params["status"] = "Active"

    return client.get(f"folders/{epic_id}/tasks", params=params)


def find_story(
    client: WrikeClient,
    epic_id: str,
    title: str,
) -> dict[str, Any] | None:
    """Find a Story by exact title within an Epic.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        epic_id: ID of the Epic to search.
        title: Exact title to match (case-sensitive).

    Returns:
        The first matching Story dict, or ``None`` if not found.

    Example::

        story = find_story(client, epic_id, "Login Page")
        if story:
            print(story["id"])
    """
    for story in list_stories(client, epic_id):
        if story.get("title") == title:
            return story
    return None


def update_story(
    client: WrikeClient,
    story_id: str,
    *,
    title: str | None = None,
    description: str | None = None,
    assignee_ids: list[str] | None = None,
    custom_status_id: str | None = None,
    importance: str | None = None,
    start_date: str | None = None,
    due_date: str | None = None,
    story_points: int | None = None,
    story_points_field_id: str | None = None,
    custom_fields: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Update an existing Story.

    Only the keyword arguments you pass will be modified.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        story_id: Wrike task ID of the Story to update.
        title: New title.
        description: New description.
        assignee_ids: Replace assignee list with these user IDs.
        custom_status_id: New workflow status ID.
        importance: ``High``, ``Normal``, or ``Low``.
        start_date: New start date in ``YYYY-MM-DD`` format.
        due_date: New due date in ``YYYY-MM-DD`` format.
        story_points: Updated story point estimate.
        story_points_field_id: Custom field ID for Story Points.
        custom_fields: Custom field overrides.

    Returns:
        The updated Story dict.

    Raises:
        ResourceNotFoundError: If the Story does not exist.

    Example::

        updated = update_story(
            client,
            "IEAD...",
            custom_status_id="IEAD...IN_PROGRESS",
            importance="High",
        )
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

    dates: dict[str, Any] = {}
    if start_date is not None:
        dates["start"] = start_date
    if due_date is not None:
        dates["due"] = due_date
    if dates:
        payload["dates"] = dates

    merged_fields: list[dict[str, str]] = list(custom_fields or [])
    if story_points is not None and story_points_field_id:
        merged_fields.append({"id": story_points_field_id, "value": str(story_points)})
    if merged_fields:
        payload["customFields"] = merged_fields

    results = client.put(f"tasks/{story_id}", payload)
    return results[0]


def delete_story(client: WrikeClient, story_id: str) -> None:
    """Delete a Story (moves it to Wrike's Recycle Bin).

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        story_id: Wrike task ID of the Story to delete.

    Raises:
        ResourceNotFoundError: If the Story does not exist.

    Example::

        delete_story(client, "IEAD...")
    """
    client.delete(f"tasks/{story_id}")
