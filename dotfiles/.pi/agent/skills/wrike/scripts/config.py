"""Identity and workspace configuration for the Wrike Connector Skill.

Add known team members here so that "my tasks" queries work without
having to look up user IDs each time.

The active user is resolved in this order:
  1. ``WRIKE_ME_ID`` environment variable
  2. ``DEFAULT_ME_ID`` constant below
"""

import os
from typing import Any

# ---------------------------------------------------------------------------
# Known users
# ---------------------------------------------------------------------------

KNOWN_USERS: dict[str, dict[str, str]] = {
    "KUALBZKV": {
        "id": "KUALBZKV",
        "name": "Raul Bethencourt",
        "email": "raul.bethencourt@bluenote-systems.com",
        "title": "Développeur senior",
    },
}

# Default "me" — used when WRIKE_ME_ID env var is not set.
DEFAULT_ME_ID = "KUALBZKV"

# ---------------------------------------------------------------------------
# Known custom field IDs (account IEAEYVE4)
# ---------------------------------------------------------------------------

CUSTOM_FIELD_IDS: dict[str, str] = {
    "IEAEYVE4JUAKLKOE": "Story Points",
    "IEAEYVE4JUAKLPHQ": "Priority",
    "IEAEYVE4JUAKMIFR": "Client",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_me_id() -> str:
    """Return the active user ID.

    Checks ``WRIKE_ME_ID`` env var first, falls back to ``DEFAULT_ME_ID``.

    Returns:
        Wrike user ID string.

    Example::

        from scripts.config import get_me_id
        my_id = get_me_id()   # "KUALBZKV"
    """
    return os.environ.get("WRIKE_ME_ID", DEFAULT_ME_ID)


def get_me_info() -> dict[str, Any]:
    """Return identity dict for the active user, or a minimal stub.

    Returns:
        Dict with at least ``id`` and optionally ``name``, ``email``.

    Example::

        info = get_me_info()
        print(info["name"])   # "Raul Bethencourt"
    """
    me_id = get_me_id()
    return KNOWN_USERS.get(me_id, {"id": me_id, "name": "Unknown"})
