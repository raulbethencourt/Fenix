"""Epic helpers — Epics map to Wrike Projects (folders with project metadata).

An Epic is a Wrike Project living inside a Space or parent folder.  It carries
owners, start/end dates, and a project status (Green / Yellow / Red /
Completed / OnHold / Cancelled) on top of the standard folder fields.

Typical usage::

    from scripts.client import WrikeClient
    from scripts import epics

    client = WrikeClient()

    # List all spaces, pick one
    spaces = epics.get_spaces(client)
    space_id = spaces[0]["id"]

    # Create an Epic
    epic = epics.create_epic(
        client,
        space_id,
        "User Authentication",
        description="Everything auth-related",
        start_date="2026-04-01",
        end_date="2026-06-30",
    )

    # Fetch, update, delete
    epic = epics.get_epic(client, epic["id"])
    epics.update_epic(client, epic["id"], title="Auth & Authorisation")
    epics.delete_epic(client, epic["id"])
"""

from typing import Any

from .client import WrikeClient

# ---------------------------------------------------------------------------
# Spaces (utility — needed to locate where to create epics)
# ---------------------------------------------------------------------------


def get_spaces(client: WrikeClient) -> list[dict[str, Any]]:
    """Return all Spaces the authenticated user can access.

    Args:
        client: Authenticated :class:`WrikeClient` instance.

    Returns:
        List of space dicts, each containing at minimum ``id`` and ``title``.

    Example::

        spaces = get_spaces(client)
        for s in spaces:
            print(s["id"], s["title"])
    """
    return client.get("spaces")


def get_workflows(client: WrikeClient) -> list[dict[str, Any]]:
    """Return all workflows and their custom statuses.

    Useful for resolving a human-readable status name to a ``customStatusId``
    before calling :func:`update_epic` or :func:`stories.update_story`.

    Args:
        client: Authenticated :class:`WrikeClient` instance.

    Returns:
        List of workflow dicts, each with ``id``, ``name``, and
        ``customStatuses`` (list of status objects).

    Example::

        workflows = get_workflows(client)
        for wf in workflows:
            for status in wf["customStatuses"]:
                print(status["id"], status["name"])
    """
    return client.get("workflows")


def get_custom_fields(client: WrikeClient) -> list[dict[str, Any]]:
    """Return all custom field definitions in the account.

    Args:
        client: Authenticated :class:`WrikeClient` instance.

    Returns:
        List of custom field dicts, each with ``id``, ``title``, and ``type``.

    Example::

        fields = get_custom_fields(client)
        sp_field = next(f for f in fields if f["title"] == "Story Points")
        print(sp_field["id"])
    """
    return client.get("customfields")


# ---------------------------------------------------------------------------
# Epics CRUD
# ---------------------------------------------------------------------------


def create_epic(
    client: WrikeClient,
    space_id: str,
    title: str,
    *,
    description: str = "",
    owner_ids: list[str] | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    project_status: str = "Green",
    custom_fields: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Create a new Epic (Wrike Project) inside a Space.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        space_id: ID of the Space where the Epic will be created.
        title: Epic title.
        description: Optional HTML or plain-text description.
        owner_ids: List of Wrike user IDs to set as Epic owners.
        start_date: Project start date in ``YYYY-MM-DD`` format.
        end_date: Project end date in ``YYYY-MM-DD`` format.
        project_status: One of ``Green``, ``Yellow``, ``Red``,
            ``Completed``, ``OnHold``, ``Cancelled``. Defaults to ``Green``.
        custom_fields: List of ``{"id": "<fieldId>", "value": "<val>"}`` dicts.

    Returns:
        The created Epic dict from the Wrike API.

    Raises:
        ValidationError: If required fields are missing or malformed.
        WrikeAPIError: On any other API failure.

    Example::

        epic = create_epic(
            client,
            space_id="IEAD...",
            title="Auth System",
            start_date="2026-04-01",
            end_date="2026-06-30",
            owner_ids=["KUA..."],
        )
        print(epic["id"])
    """
    project: dict[str, Any] = {}
    if owner_ids:
        project["ownerIds"] = owner_ids
    if start_date:
        project["startDate"] = start_date
    if end_date:
        project["endDate"] = end_date

    payload: dict[str, Any] = {
        "title": title,
        "project": project,
    }
    if description:
        payload["description"] = description
    if custom_fields:
        payload["customFields"] = custom_fields

    results = client.post(f"folders/{space_id}/folders", payload)
    return results[0]


def get_epic(client: WrikeClient, epic_id: str) -> dict[str, Any]:
    """Fetch a single Epic by its ID.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        epic_id: Wrike folder/project ID of the Epic.

    Returns:
        The Epic dict.

    Raises:
        ResourceNotFoundError: If the Epic does not exist.

    Example::

        epic = get_epic(client, "IEAD...")
        print(epic["title"], epic["project"]["status"])
    """
    results = client.get(f"folders/{epic_id}")
    return results[0]


def list_epics(
    client: WrikeClient,
    space_id: str,
    *,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    """List all Epics (Projects) in a Space.

    Only returns direct children that have a ``project`` key (i.e. are
    Projects, not plain folders).

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        space_id: ID of the Space to query.
        include_archived: If ``True``, include archived projects.

    Returns:
        List of Epic dicts that have a ``project`` property.

    Example::

        for epic in list_epics(client, space_id):
            print(epic["id"], epic["title"])
    """
    params: dict[str, Any] = {"project": True}
    if not include_archived:
        params["archived"] = False

    folders = client.get(f"spaces/{space_id}/folders", params=params)
    # Filter to only actual projects (have the "project" metadata block)
    return [f for f in folders if "project" in f]


def find_epic(
    client: WrikeClient,
    space_id: str,
    title: str,
) -> dict[str, Any] | None:
    """Find an Epic by exact title within a Space.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        space_id: ID of the Space to search.
        title: Exact title to match (case-sensitive).

    Returns:
        The first matching Epic dict, or ``None`` if not found.

    Example::

        epic = find_epic(client, space_id, "Auth System")
        if epic:
            print(epic["id"])
    """
    for epic in list_epics(client, space_id):
        if epic.get("title") == title:
            return epic
    return None


def update_epic(
    client: WrikeClient,
    epic_id: str,
    *,
    title: str | None = None,
    description: str | None = None,
    owner_ids: list[str] | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    project_status: str | None = None,
    custom_fields: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Update an existing Epic.

    Only the fields you pass will be changed; omitted fields are left as-is.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        epic_id: Wrike folder/project ID of the Epic.
        title: New title.
        description: New description (HTML or plain text).
        owner_ids: Replace owner list with these user IDs.
        start_date: New start date in ``YYYY-MM-DD`` format.
        end_date: New end date in ``YYYY-MM-DD`` format.
        project_status: One of ``Green``, ``Yellow``, ``Red``,
            ``Completed``, ``OnHold``, ``Cancelled``.
        custom_fields: List of ``{"id": "<fieldId>", "value": "<val>"}`` dicts.

    Returns:
        The updated Epic dict.

    Raises:
        ResourceNotFoundError: If the Epic does not exist.

    Example::

        updated = update_epic(
            client,
            "IEAD...",
            project_status="Completed",
            end_date="2026-05-15",
        )
    """
    payload: dict[str, Any] = {}

    if title is not None:
        payload["title"] = title
    if description is not None:
        payload["description"] = description
    if custom_fields is not None:
        payload["customFields"] = custom_fields

    project: dict[str, Any] = {}
    if owner_ids is not None:
        project["ownerIds"] = owner_ids
    if start_date is not None:
        project["startDate"] = start_date
    if end_date is not None:
        project["endDate"] = end_date
    if project_status is not None:
        project["status"] = project_status
    if project:
        payload["project"] = project

    results = client.put(f"folders/{epic_id}", payload)
    return results[0]


def delete_epic(client: WrikeClient, epic_id: str) -> None:
    """Delete an Epic (moves it to Wrike's Recycle Bin).

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        epic_id: Wrike folder/project ID of the Epic to delete.

    Raises:
        ResourceNotFoundError: If the Epic does not exist.

    Example::

        delete_epic(client, "IEAD...")
    """
    client.delete(f"folders/{epic_id}")
