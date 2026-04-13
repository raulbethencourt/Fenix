"""Wrike Connector Skill — public API.

Import everything you need from this package::

    from scripts import epics, stories, tasks, comments, attachments
    from scripts.client import WrikeClient

    client = WrikeClient()

    # --- Utility ---
    spaces        = epics.get_spaces(client)
    workflows     = epics.get_workflows(client)
    custom_fields = epics.get_custom_fields(client)

    # --- Epics ---
    epic  = epics.create_epic(client, space_id, "My Epic")
    epic  = epics.get_epic(client, epic_id)
    all_  = epics.list_epics(client, space_id)
    found = epics.find_epic(client, space_id, "My Epic")
    epic  = epics.update_epic(client, epic_id, project_status="Completed")
    epics.delete_epic(client, epic_id)

    # --- Stories ---
    story  = stories.create_story(client, epic_id, "My Story")
    story  = stories.get_story(client, story_id)
    all_   = stories.list_stories(client, epic_id)
    found  = stories.find_story(client, epic_id, "My Story")
    story  = stories.update_story(client, story_id, custom_status_id="...")
    stories.delete_story(client, story_id)

    # --- Tasks (sub-tasks) ---
    task  = tasks.create_task(client, story_id, epic_id, "My Task")
    task  = tasks.get_task(client, task_id)
    all_  = tasks.list_tasks(client, story_id)
    task  = tasks.update_task(client, task_id, importance="High")
    tasks.delete_task(client, task_id)

    # --- Comments ---
    comment = comments.add_comment(client, task_id, "Looks good!")
    all_    = comments.list_comments(client, task_id)
    comment = comments.update_comment(client, comment["id"], "Updated note.")
    comments.delete_comment(client, comment["id"])

    # --- Attachments ---
    att   = attachments.upload_attachment(client, task_id, "/path/to/file.pdf")
    all_  = attachments.list_attachments(client, task_id)
    meta  = attachments.get_attachment(client, att["id"])
    saved = attachments.download_attachment(client, att["id"], "/tmp/")
    attachments.delete_attachment(client, att["id"])
"""

from . import attachments, comments, epics, stories, tasks
from .client import WrikeClient
from .exceptions import (
    AuthenticationError,
    PermissionError,
    RateLimitError,
    ResourceNotFoundError,
    ServerError,
    ValidationError,
    WrikeAPIError,
)

__all__ = [
    # Sub-modules
    "epics",
    "stories",
    "tasks",
    "comments",
    "attachments",
    # Client
    "WrikeClient",
    # Exceptions
    "WrikeAPIError",
    "AuthenticationError",
    "PermissionError",
    "RateLimitError",
    "ResourceNotFoundError",
    "ServerError",
    "ValidationError",
]
