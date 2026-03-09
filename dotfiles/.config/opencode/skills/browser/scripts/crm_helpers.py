"""SugarCRM Enterprise (v12-25) specific helper functions."""

import os
from typing import Dict, Any, List, Optional

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout


def get_crm_credentials() -> Dict[str, str]:
    """
    Get CRM credentials from environment variables.

    Returns:
        Dict with url, username, password

    Raises:
        ValueError: If required environment variables are not set
    """
    url: Optional[str] = os.environ.get("SUGARCRM_URL")
    username: Optional[str] = os.environ.get("SUGARCRM_USERNAME")
    password: Optional[str] = os.environ.get("SUGARCRM_PASSWORD")

    missing = []
    if not url:
        missing.append("SUGARCRM_URL")
    if not username:
        missing.append("SUGARCRM_USERNAME")
    if not password:
        missing.append("SUGARCRM_PASSWORD")

    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    assert url is not None
    assert username is not None
    assert password is not None

    return {"url": url, "username": username, "password": password}


def login(page: Page) -> Page:
    """
    Login to SugarCRM.

    Args:
        page: Playwright Page object

    Returns:
        Page object after login

    Example:
        >>> browser, page = launch(headless=False)
        >>> page = login(page)
    """
    creds = get_crm_credentials()

    page.goto(creds["url"])

    page.wait_for_selector("#user_name", timeout=30000)
    page.fill("#user_name", creds["username"])
    page.fill("#user_password", creds["password"])
    page.click("#login_button")

    try:
        page.wait_for_selector(".dashlet-toolbar", timeout=30000)
    except PlaywrightTimeout:
        pass

    return page


def logout(page: Page) -> None:
    """
    Logout from SugarCRM.

    Args:
        page: Playwright Page object
    """
    try:
        page.click(".userName", timeout=5000)
        page.wait_for_selector("a[href*='logout']", timeout=5000)
        page.click("a[href*='logout']")
    except PlaywrightTimeout:
        page.goto(f"{os.environ.get('SUGARCRM_URL')}?module=Users&action=Logout")


def open_module(page: Page, module_name: str) -> None:
    """
    Navigate to a SugarCRM module.

    Args:
        page: Playwright Page object
        module_name: Module name (e.g., "Accounts", "Contacts", "Leads")

    Example:
        >>> open_module(page, "Accounts")
        >>> open_module(page, "Contacts")
    """
    module_lower = module_name.lower()

    try:
        page.click(f'a[href*="module={module_lower}"]', timeout=5000)
    except PlaywrightTimeout:
        page.click(".navbar-toggle")
        page.wait_for_timeout(500)
        page.click(f'a[href*="module={module_lower}"]')

    page.wait_for_load_state("networkidle")
    wait_for_module_load(page, module_name)


def wait_for_module_load(page: Page, module_name: str, timeout: int = 30000) -> None:
    """
    Wait for a module to fully load.

    Args:
        page: Playwright Page object
        module_name: Module name
        timeout: Timeout in milliseconds
    """
    module_lower = module_name.lower()

    selectors = [
        f".{module_lower}-list",
        f".list.view",
        ".dashlet-toolbar",
        "table.list",
        ".moduleTitle",
    ]

    for sel in selectors:
        try:
            page.wait_for_selector(sel, timeout=5000)
            return
        except PlaywrightTimeout:
            continue

    page.wait_for_timeout(2000)


def create_record(
    page: Page,
    module: str,
    fields: Dict[str, str],
) -> Optional[str]:
    """
    Create a new record in a module.

    Args:
        page: Playwright Page object
        module: Module name (e.g., "Accounts", "Contacts")
        fields: Dict of field names to values

    Returns:
        Record ID if available, None otherwise

    Example:
        >>> create_record(page, "Accounts", {
        ...     "name": "Acme Corp",
        ...     "phone": "+1234567890",
        ...     "industry": "Technology"
        ... })
    """
    open_module(page, module)

    page.wait_for_timeout(1000)

    try:
        page.click("button[title='Create']", timeout=5000)
    except PlaywrightTimeout:
        page.click("a.create-record")

    page.wait_for_selector(".edit-view", timeout=10000)

    for field_name, value in fields.items():
        _fill_field(page, field_name, value)

    page.click("button[name='Save']")

    handle_notifications(page)

    try:
        record_link = page.wait_for_selector(".record-link", timeout=10000)
        if record_link:
            return record_link.get_attribute("href")
    except PlaywrightTimeout:
        pass

    return None


def _fill_field(page: Page, field_name: str, value: str) -> None:
    """
    Fill a form field in SugarCRM.

    Args:
        page: Playwright Page object
        field_name: Field name (will be converted to CSS selector)
        value: Value to fill
    """
    field_id = field_name.replace("_", "-")

    selectors = [
        f"input[name='{field_name}']",
        f"input[id='{field_id}']",
        f"input[placeholder*='{field_name}']",
        f"textarea[name='{field_name}']",
        f"select[name='{field_name}']",
    ]

    for sel in selectors:
        try:
            if page.locator(sel).is_visible():
                page.fill(sel, value)
                return
        except Exception:
            continue

    page.fill(f"input[placeholder*='{field_name}']", value)


def search(page: Page, query: str) -> List[str]:
    """
    Search for records in SugarCRM.

    Args:
        page: Playwright Page object
        query: Search query

    Returns:
        List of matching record names

    Example:
        >>> results = search(page, "Acme")
        >>> print(results)
        ['Acme Corp', 'Acme Inc']
    """
    search_input = page.locator("input.search-name, input[name='name']")

    if not search_input.is_visible():
        page.click(".search-toggle")

    search_input.fill(query)
    page.keyboard.press("Enter")

    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    results = []
    try:
        rows = page.locator("table.list tr.clickableRow, .list tr[data-id]")
        count = rows.count()
        for i in range(min(count, 20)):
            name_cell = rows.nth(i).locator("td:first-child, .name")
            if name_cell.is_visible():
                text = name_cell.inner_text()
                if text:
                    results.append(text.strip())
    except Exception:
        pass

    return results


def handle_notifications(page: Page) -> None:
    """
    Handle and dismiss SugarCRM toast notifications.

    Args:
        page: Playwright Page object
    """
    try:
        page.wait_for_selector(".notification, .sugar-notification", timeout=3000)
        page.wait_for_timeout(1000)
        page.keyboard.press("Escape")
    except PlaywrightTimeout:
        pass

    try:
        page.wait_for_selector(".alert-success, .alert-warning", timeout=2000)
        page.wait_for_timeout(500)
        close_buttons = page.locator(".alert .close, .notification .close, .sugar-notification .close")
        if close_buttons.is_visible():
            close_buttons.click()
    except PlaywrightTimeout:
        pass


def get_record_id(page: Page) -> Optional[str]:
    """
    Get the current record ID from URL.

    Args:
        page: Playwright Page object

    Returns:
        Record ID if in record view, None otherwise
    """
    import re

    url = page.url
    match = re.search(r"record\/([a-f0-9-]+)", url, re.IGNORECASE)
    if match:
        return match.group(1)

    match = re.search(r"id=([a-f0-9-]+)", url, re.IGNORECASE)
    if match:
        return match.group(1)

    return None


def click_action_menu_item(page: Page, action: str) -> None:
    """
    Click an action menu item in record view.

    Args:
        page: Playwright Page object
        action: Action name (e.g., "Edit", "Delete", "Duplicate")
    """
    try:
        page.click(".actionmenu", timeout=5000)
        page.wait_for_selector(".dropdown-menu", timeout=3000)
        page.click(f".dropdown-menu a[title*='{action}']")
    except PlaywrightTimeout:
        page.click(f"button[{action.lower()}]")


def switch_to_detail_view(page: Page) -> None:
    """
    Switch from edit view back to detail view.

    Args:
        page: Playwright Page object
    """
    try:
        page.click("button[name='Cancel']", timeout=5000)
    except PlaywrightTimeout:
        page.keyboard.press("Escape")

    page.wait_for_timeout(1000)


def get_field_value(page: Page, field_name: str) -> Optional[str]:
    """
    Get the value of a field in detail view.

    Args:
        page: Playwright Page object
        field_name: Field name

    Returns:
        Field value or None
    """
    field_id = field_name.replace("_", "-")

    selectors = [
        f".[field-name='{field_name}'] .value",
        f"#{field_id} .value",
        f"span[field='{field_name}']",
    ]

    for sel in selectors:
        try:
            if page.locator(sel).is_visible():
                return page.locator(sel).inner_text(timeout=3000)
        except Exception:
            continue

    return None


def edit_record(page: Page) -> None:
    """
    Switch a record to edit mode.

    Args:
        page: Playwright Page object
    """
    try:
        page.click("button[title='Edit']", timeout=5000)
    except PlaywrightTimeout:
        page.click(".edit_action")

    page.wait_for_selector(".edit-view", timeout=10000)


def save_record(page: Page) -> None:
    """
    Save the current record.

    Args:
        page: Playwright Page object
    """
    page.click("button[name='Save']")
    handle_notifications(page)
    page.wait_for_selector(".detail-view", timeout=15000)


def delete_record(page: Page, confirm: bool = True) -> None:
    """
    Delete the current record.

    Args:
        page: Playwright Page object
        confirm: Whether to confirm the deletion
    """
    click_action_menu_item(page, "Delete")

    if confirm:
        try:
            page.wait_for_selector(".confirmation, .modal", timeout=3000)
            page.click("button[title='Delete'], button:has-text('Delete')")
        except PlaywrightTimeout:
            page.keyboard.press("Enter")

    page.wait_for_timeout(2000)


__all__ = [
    "login",
    "logout",
    "open_module",
    "create_record",
    "search",
    "handle_notifications",
    "wait_for_module_load",
    "get_record_id",
    "click_action_menu_item",
    "switch_to_detail_view",
    "get_field_value",
    "edit_record",
    "save_record",
    "delete_record",
    "get_crm_credentials",
]
