"""Core Playwright wrapper for browser automation."""

import os
from typing import Optional, Union, List, Dict, Any
from pathlib import Path

from playwright.sync_api import Page, Locator, TimeoutError as PlaywrightTimeout


class BrowserController:
    """
    High-level controller for browser automation actions.
    Wraps Playwright Page with convenient methods.
    """

    def __init__(self, page: Page):
        """
        Initialize controller with a Playwright Page.

        Args:
            page: Playwright Page object
        """
        self.page = page

    def goto(self, url: str, timeout: int = 30000) -> None:
        """
        Navigate to a URL.

        Args:
            url: The URL to navigate to
            timeout: Navigation timeout in milliseconds
        """
        self.page.goto(url, timeout=timeout)

    def click(
        self,
        selector: str,
        timeout: int = 10000,
        force: bool = False,
    ) -> None:
        """
        Click an element.

        Args:
            selector: CSS selector or text selector
            timeout: Timeout in milliseconds
            force: Whether to force the click even if element is not visible
        """
        self.page.click(selector, timeout=timeout, force=force)

    def fill(
        self,
        selector: str,
        value: str,
        timeout: int = 10000,
    ) -> None:
        """
        Fill an input field.

        Args:
            selector: CSS selector for the input
            value: Value to fill
            timeout: Timeout in milliseconds
        """
        self.page.fill(selector, value, timeout=timeout)

    def type(
        self,
        selector: str,
        value: str,
        delay: int = 50,
        timeout: int = 10000,
    ) -> None:
        """
        Type text into an element with a delay between keystrokes.

        Args:
            selector: CSS selector for the input
            value: Text to type
            delay: Delay between keystrokes in milliseconds
            timeout: Timeout in milliseconds
        """
        self.page.type(selector, value, delay=delay, timeout=timeout)

    def select_option(
        self,
        selector: str,
        value: Optional[Union[str, List[str]]] = None,
        label: Optional[str] = None,
        timeout: int = 10000,
    ) -> List[str]:
        """
        Select option(s) from a dropdown.

        Args:
            selector: CSS selector for the select element
            value: Option value(s) to select
            label: Option label to select (alternative to value)
            timeout: Timeout in milliseconds

        Returns:
            List of selected values
        """
        options: Dict[str, Any] = {}
        if value is not None:
            options["value"] = value
        elif label is not None:
            options["label"] = label

        return self.page.select_option(selector, **options, timeout=timeout)

    def wait_for_selector(
        self,
        selector: str,
        state: str = "visible",
        timeout: int = 30000,
    ) -> Optional[Locator]:
        """
        Wait for an element to appear.

        Args:
            selector: CSS selector
            state: "visible", "hidden", "attached", or "detached"
            timeout: Timeout in milliseconds

        Returns:
            Locator if found, None if timeout
        """
        try:
            return self.page.wait_for_selector(selector, state=state, timeout=timeout)
        except PlaywrightTimeout:
            return None

    def wait_for_text(
        self,
        text: str,
        timeout: int = 30000,
    ) -> bool:
        """
        Wait for text to appear on the page.

        Args:
            text: Text to wait for
            timeout: Timeout in milliseconds

        Returns:
            True if text found, False if timeout
        """
        try:
            self.page.wait_for_selector(f"text={text}", timeout=timeout)
            return True
        except PlaywrightTimeout:
            return False

    def wait_for_url(
        self,
        url_pattern: str,
        timeout: int = 30000,
    ) -> None:
        """
        Wait for URL to match a pattern.

        Args:
            url_pattern: URL pattern (supports wildcards with **)
            timeout: Timeout in milliseconds
        """
        self.page.wait_for_url(url_pattern, timeout=timeout)

    def wait_for_load_state(
        self,
        state: str = "networkidle",
        timeout: int = 30000,
    ) -> None:
        """
        Wait for page load state.

        Args:
            state: "load", "domcontentloaded", or "networkidle"
            timeout: Timeout in milliseconds
        """
        self.page.wait_for_load_state(state, timeout=timeout)

    def screenshot(
        self,
        path: Optional[str] = None,
        full_page: bool = False,
        element: Optional[str] = None,
    ) -> Optional[bytes]:
        """
        Take a screenshot.

        Args:
            path: File path to save screenshot (optional)
            full_page: If True, capture entire scrollable page
            element: CSS selector for element to screenshot (optional)

        Returns:
            Screenshot bytes if path is None, otherwise None
        """
        if element:
            locator = self.page.locator(element)
            return locator.screenshot(path=path, full_page=full_page)
        return self.page.screenshot(path=path, full_page=full_page)

    def inner_text(self, selector: str, timeout: int = 10000) -> str:
        """
        Get inner text of an element.

        Args:
            selector: CSS selector
            timeout: Timeout in milliseconds

        Returns:
            Element's inner text
        """
        return self.page.locator(selector).inner_text(timeout=timeout)

    def text_content(self, selector: str, timeout: int = 10000) -> Optional[str]:
        """
        Get text content of an element.

        Args:
            selector: CSS selector
            timeout: Timeout in milliseconds

        Returns:
            Element's text content or None
        """
        try:
            return self.page.locator(selector).text_content(timeout=timeout)
        except PlaywrightTimeout:
            return None

    def get_attribute(
        self,
        selector: str,
        attribute: str,
        timeout: int = 10000,
    ) -> Optional[str]:
        """
        Get an attribute value from an element.

        Args:
            selector: CSS selector
            attribute: Attribute name
            timeout: Timeout in milliseconds

        Returns:
            Attribute value or None
        """
        try:
            return self.page.locator(selector).get_attribute(attribute, timeout=timeout)
        except PlaywrightTimeout:
            return None

    def evaluate(self, script: str, *args: Any) -> Any:
        """
        Evaluate JavaScript in the page context.

        Args:
            script: JavaScript code (can use (arg) => format)
            *args: Arguments to pass to the script

        Returns:
            Result of script evaluation
        """
        return self.page.evaluate(script, *args)

    def html(self, selector: Optional[str] = None) -> str:
        """
        Get HTML content.

        Args:
            selector: Optional CSS selector. If None, returns full page HTML.

        Returns:
            HTML content
        """
        if selector:
            return self.page.locator(selector).inner_html()
        return self.page.content()

    def is_visible(self, selector: str) -> bool:
        """
        Check if element is visible.

        Args:
            selector: CSS selector

        Returns:
            True if element is visible
        """
        return self.page.locator(selector).is_visible()

    def is_enabled(self, selector: str) -> bool:
        """
        Check if element is enabled.

        Args:
            selector: CSS selector

        Returns:
            True if element is enabled
        """
        return self.page.locator(selector).is_enabled()

    def count(self, selector: str) -> int:
        """
        Count elements matching selector.

        Args:
            selector: CSS selector

        Returns:
            Number of matching elements
        """
        return self.page.locator(selector).count()

    def wait_for_timeout(self, milliseconds: int) -> None:
        """
        Wait for a specified time.

        Args:
            milliseconds: Time to wait in milliseconds
        """
        self.page.wait_for_timeout(milliseconds)

    @property
    def url(self) -> str:
        """Get current page URL."""
        return self.page.url

    @property
    def title(self) -> str:
        """Get page title."""
        return self.page.title()


__all__ = ["BrowserController"]
