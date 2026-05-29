"""Browser launcher for SugarCRM automation."""

import os
from pathlib import Path
from typing import Tuple

from playwright.sync_api import sync_playwright, Browser, Page, BrowserContext

from .browser import BrowserController


def _load_env_file() -> None:
    """Load environment variables from .env file if it exists."""
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key, value)


def _get_required_env(var_name: str) -> str:
    """Get required environment variable or raise error."""
    value = os.environ.get(var_name)
    if not value:
        raise ValueError(f"Required environment variable {var_name} is not set")
    return value


def launch(headless: bool = False) -> Tuple[Browser, Page]:
    """
    Launch a Chromium browser for SugarCRM automation.

    Args:
        headless: If True, run browser in headless mode. If False, show browser window.

    Returns:
        Tuple of (Browser, Page) objects.

    Raises:
        ValueError: If required environment variables are not set.

    Example:
        >>> browser, page = launch(headless=False)
        >>> page.goto("https://example.com")
        >>> browser.close()
    """
    _load_env_file()

    _ = _get_required_env("SUGARCRM_URL")
    _ = _get_required_env("SUGARCRM_USERNAME")
    _ = _get_required_env("SUGARCRM_PASSWORD")

    playwright = sync_playwright().start()

    browser = playwright.chromium.launch(
        headless=headless,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ],
    )

    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    )

    page = context.new_page()

    return browser, page


def launch_controller(headless: bool = False) -> Tuple[BrowserController, Browser, Page]:
    """
    Launch browser with a convenient controller wrapper.

    Args:
        headless: If True, run browser in headless mode.

    Returns:
        Tuple of (BrowserController, Browser, Page)

    Example:
        >>> controller, browser, page = launch_controller(headless=False)
        >>> controller.goto("https://example.com")
        >>> controller.click("text=Submit")
        >>> browser.close()
    """
    browser, page = launch(headless=headless)
    controller = BrowserController(page)
    return controller, browser, page


__all__ = ["launch", "launch_controller"]
