"""Attachment helpers — upload, list, download, and delete file attachments.

Attachments can be added to any Wrike Task (Stories and sub-tasks both qualify).
Uploading uses multipart/form-data via :meth:`WrikeClient.post_multipart`;
downloading fetches a temporary signed URL and streams the content to disk.

Typical usage::

    from scripts.client import WrikeClient
    from scripts import attachments

    client = WrikeClient()

    # Upload a file to a Story or Task
    attachment = attachments.upload_attachment(
        client,
        task_id="IEAD...",
        filepath="/path/to/spec.pdf",
    )

    # List all attachments on a task
    for a in attachments.list_attachments(client, task_id="IEAD..."):
        print(a["id"], a["name"], a["size"])

    # Download to a local path
    attachments.download_attachment(client, attachment["id"], dest="/tmp/spec.pdf")

    # Delete
    attachments.delete_attachment(client, attachment["id"])
"""

import os
from pathlib import Path
from typing import Any

import requests

from .client import WrikeClient
from .exceptions import WrikeAPIError


def upload_attachment(
    client: WrikeClient,
    task_id: str,
    filepath: str | Path,
    *,
    filename: str | None = None,
) -> dict[str, Any]:
    """Upload a file as an attachment to a Story or Task.

    The file is sent as ``multipart/form-data``.  Wrike requires the
    ``X-Requested-With`` and ``X-File-Name`` headers alongside the binary
    body.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        task_id: Wrike task ID of the Story or Task to attach the file to.
        filepath: Absolute or relative path to the local file.
        filename: Override the filename shown in Wrike.  Defaults to the
            basename of ``filepath``.

    Returns:
        The created attachment dict, including ``id``, ``name``, ``size``,
        ``contentType``, and ``createdDate``.

    Raises:
        FileNotFoundError: If ``filepath`` does not exist.
        ResourceNotFoundError: If the task does not exist.
        WrikeAPIError: On any other API failure.

    Example::

        att = upload_attachment(client, "IEAD...", "/tmp/design.png")
        print(att["id"], att["name"])
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    name = filename or path.name
    extra_headers = {
        "X-Requested-With": "XMLHttpRequest",
        "X-File-Name": name,
    }

    with open(path, "rb") as fh:
        files = {"file": (name, fh, _guess_content_type(path))}
        results = client.post_multipart(
            f"tasks/{task_id}/attachments",
            files=files,
            headers=extra_headers,
        )

    return results[0]


def list_attachments(
    client: WrikeClient,
    task_id: str,
    *,
    versions: bool = False,
) -> list[dict[str, Any]]:
    """List all attachments on a Story or Task.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        task_id: Wrike task ID.
        versions: If ``True``, include all historical versions of each
            attachment.  Defaults to ``False`` (latest version only).

    Returns:
        List of attachment dicts, each with ``id``, ``name``, ``size``,
        ``contentType``, ``createdDate``, and ``version``.

    Example::

        for a in list_attachments(client, "IEAD..."):
            print(a["name"], a["size"])
    """
    params: dict[str, Any] = {"versions": versions}
    return client.get(f"tasks/{task_id}/attachments", params=params)


def get_attachment(client: WrikeClient, attachment_id: str) -> dict[str, Any]:
    """Fetch metadata for a single attachment by its ID.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        attachment_id: Wrike attachment ID.

    Returns:
        The attachment metadata dict.

    Raises:
        ResourceNotFoundError: If the attachment does not exist.

    Example::

        meta = get_attachment(client, "IEAD...")
        print(meta["name"], meta["contentType"])
    """
    results = client.get(f"attachments/{attachment_id}")
    return results[0]


def download_attachment(
    client: WrikeClient,
    attachment_id: str,
    dest: str | Path,
) -> Path:
    """Download an attachment to a local file.

    Fetches a temporary signed download URL from the Wrike API, then
    streams the file content to ``dest``.  The destination directory must
    already exist.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        attachment_id: Wrike attachment ID.
        dest: Local file path to write the downloaded content to.  If a
            directory is given, the original filename is appended.

    Returns:
        The resolved :class:`pathlib.Path` of the downloaded file.

    Raises:
        ResourceNotFoundError: If the attachment does not exist.
        WrikeAPIError: If the download URL cannot be fetched or the
            download itself fails.

    Example::

        saved = download_attachment(client, "IEAD...", "/tmp/")
        print(f"Saved to {saved}")
    """
    # Step 1: get the temporary download URL
    url_data = client.get(f"attachments/{attachment_id}/url")
    if not url_data:
        raise WrikeAPIError(f"Could not retrieve download URL for attachment {attachment_id}")

    download_url: str = url_data[0].get("url", "")
    if not download_url:
        raise WrikeAPIError(f"Empty download URL returned for attachment {attachment_id}")

    # Step 2: resolve destination path
    dest_path = Path(dest)
    if dest_path.is_dir():
        # Append the original filename obtained from metadata
        meta = get_attachment(client, attachment_id)
        dest_path = dest_path / meta.get("name", attachment_id)

    # Step 3: stream download (no auth header needed — URL is pre-signed)
    try:
        with requests.get(download_url, stream=True, timeout=120) as resp:
            resp.raise_for_status()
            with open(dest_path, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=65536):
                    fh.write(chunk)
    except requests.RequestException as exc:
        raise WrikeAPIError(f"Download failed: {exc}") from exc

    return dest_path.resolve()


def delete_attachment(client: WrikeClient, attachment_id: str) -> None:
    """Delete an attachment permanently.

    Unlike tasks/folders, attachments are not moved to the Recycle Bin —
    deletion is immediate and irreversible.

    Args:
        client: Authenticated :class:`WrikeClient` instance.
        attachment_id: Wrike attachment ID to delete.

    Raises:
        ResourceNotFoundError: If the attachment does not exist.

    Example::

        delete_attachment(client, "IEAD...")
    """
    client.delete(f"attachments/{attachment_id}")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_CONTENT_TYPES: dict[str, str] = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".json": "application/json",
    ".zip": "application/zip",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}


def _guess_content_type(path: Path) -> str:
    """Return a MIME type for the given file path based on its extension.

    Falls back to ``application/octet-stream`` for unknown extensions.
    """
    return _CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream")
