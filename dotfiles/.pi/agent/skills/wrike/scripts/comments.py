"""Comment helpers — add, list, update, and delete comments on tasks/stories.

Comments can be attached to any Wrike Task (Stories and sub-tasks both qualify).
The API supports plain-text and HTML bodies; all functions here default to
plain-text for safety.

Typical usage::

    from scripts.client import WrikeClient
    from scripts import comments

    client = WrikeClient()

    # Add a comment to a Story or Task
    comment = comments.add_comment(client, task_id="IEAD...", text="LGTM, merging.")

    # List all comments on a task
    for c in comments.list_comments(client, task_id="IEAD..."):
        print(c["authorId"], c["text"])

    # Update and delete
    comments.update_comment(client, comment["id"], text="LGTM — merged.")
    comments.delete_comment(client, comment["id"])
"""

from typing import Any

from .client import WrikeClient


def add_comment(
    client: WrikeClient,
    task_id: str,
    text: str,
    *,
    plain_text: bool = True,
) -> dict[str, Any]:
    """Add a comment to a Story or Task.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        task_id: Wrike task ID of the Story or Task to comment on.
        text: Comment body.  Plain text by default; pass ``plain_text=False``
            to send HTML.
        plain_text: If ``True`` (default), the ``text`` is treated as plain
            text by the Wrike API.  Set to ``False`` to send HTML markup.

    Returns:
        The created comment dict, including ``id``, ``authorId``,
        ``text``, and ``createdDate``.

    Raises:
        ResourceNotFoundError: If the task does not exist.
        WrikeAPIError: On any other API failure.

    Example::

        comment = add_comment(client, "IEAD...", "Needs more tests before merge.")
        print(comment["id"])
    """
    payload: dict[str, Any] = {
        "text": text,
        "plainText": plain_text,
    }
    results = client.post(f"tasks/{task_id}/comments", payload)
    return results[0]


def list_comments(
    client: WrikeClient,
    task_id: str,
    *,
    plain_text: bool = True,
) -> list[dict[str, Any]]:
    """List all comments on a Story or Task, oldest first.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        task_id: Wrike task ID of the Story or Task.
        plain_text: If ``True`` (default), the API returns comment bodies
            as plain text.  Set to ``False`` to receive HTML.

    Returns:
        List of comment dicts ordered by creation date ascending.

    Example::

        for c in list_comments(client, "IEAD..."):
            print(c["createdDate"], c["text"])
    """
    params: dict[str, Any] = {"plainText": plain_text}
    return client.get(f"tasks/{task_id}/comments", params=params)


def update_comment(
    client: WrikeClient,
    comment_id: str,
    text: str,
    *,
    plain_text: bool = True,
) -> dict[str, Any]:
    """Update the text of an existing comment.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        comment_id: ID of the comment to update.
        text: New comment body.
        plain_text: If ``True`` (default), treats ``text`` as plain text.

    Returns:
        The updated comment dict.

    Raises:
        ResourceNotFoundError: If the comment does not exist.
        PermissionError: If the authenticated user did not author the comment.

    Example::

        updated = update_comment(client, "IEAD...", "Updated note after review.")
    """
    payload: dict[str, Any] = {
        "text": text,
        "plainText": plain_text,
    }
    results = client.put(f"comments/{comment_id}", payload)
    return results[0]


def delete_comment(client: WrikeClient, comment_id: str) -> None:
    """Delete a comment permanently.

    Unlike tasks/folders, comments are not moved to the Recycle Bin —
    deletion is immediate and irreversible.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        comment_id: ID of the comment to delete.

    Raises:
        ResourceNotFoundError: If the comment does not exist.
        PermissionError: If the authenticated user did not author the comment.

    Example::

        delete_comment(client, "IEAD...")
    """
    client.delete(f"comments/{comment_id}")
