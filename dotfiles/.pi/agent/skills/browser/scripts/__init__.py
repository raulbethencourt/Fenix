"""Browser automation skill for SugarCRM testing."""

from .launcher import launch
from .browser import BrowserController
from .crm_helpers import (
    login,
    logout,
    open_module,
    create_record,
    search,
    handle_notifications,
    wait_for_module_load,
)

__all__ = [
    "launch",
    "BrowserController",
    "login",
    "logout",
    "open_module",
    "create_record",
    "search",
    "handle_notifications",
    "wait_for_module_load",
]
