"""Core translation engine wrapping deep-translator's GoogleTranslator.

Usage example::

    import sys; sys.path.insert(0, "/path/to/translation_skill")
    from scripts.translator import Translator

    t = Translator(target="fr")
    print(t.translate("Hello, world!"))   # "Bonjour le monde !"

Supported language codes: any code accepted by Google Translate (BCP-47 / ISO 639-1),
e.g. 'fr', 'es', 'de', 'pt', 'zh-CN', 'ar', 'ja'.
"""

from __future__ import annotations

from scripts.exceptions import EmptyInputError, ProviderError, UnsupportedLanguageError

# Lazy import so the library is only required at runtime, not import time.
try:
    from deep_translator import GoogleTranslator  # type: ignore[import-untyped]
    from deep_translator.exceptions import (  # type: ignore[import-untyped]
        LanguageNotSupportedException,
        RequestError,
    )

    _DEEP_TRANSLATOR_AVAILABLE = True
except ImportError:  # pragma: no cover
    _DEEP_TRANSLATOR_AVAILABLE = False


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_TARGET_LANG = "fr"
DEFAULT_SOURCE_LANG = "auto"

# GoogleTranslator has a ~5 000-character limit per call.
_CHUNK_SIZE = 4_500


class Translator:
    """Thin wrapper around GoogleTranslator with error normalisation.

    Args:
        target: BCP-47 / ISO 639-1 target language code (default: ``"fr"``).
        source: Source language code or ``"auto"`` for auto-detect (default: ``"auto"``).

    Raises:
        UnsupportedLanguageError: If *target* or *source* are not accepted by the provider.
        ImportError: If ``deep-translator`` is not installed.
    """

    def __init__(
        self,
        target: str = DEFAULT_TARGET_LANG,
        source: str = DEFAULT_SOURCE_LANG,
    ) -> None:
        if not _DEEP_TRANSLATOR_AVAILABLE:
            raise ImportError(
                "deep-translator is required. Install it with: pip install deep-translator"
            )

        self.target = target
        self.source = source
        self._translator = self._build_translator()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def translate(self, text: str) -> str:
        """Translate *text* from source to target language.

        Args:
            text: The string to translate. May contain newlines.

        Returns:
            Translated string.  If *text* is blank/whitespace-only the
            original string is returned unchanged.

        Raises:
            EmptyInputError: If *text* is ``None``.
            ProviderError: If the provider returns an error.
        """
        if text is None:
            raise EmptyInputError("translate() received None; pass a string.")

        if not text.strip():
            return text

        # Split into chunks to stay under provider limits.
        if len(text) > _CHUNK_SIZE:
            return self._translate_chunked(text)

        return self._call_provider(text)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_translator(self) -> "GoogleTranslator":
        """Instantiate and validate a GoogleTranslator.

        Raises:
            UnsupportedLanguageError: If language codes are invalid.
        """
        try:
            return GoogleTranslator(source=self.source, target=self.target)
        except LanguageNotSupportedException as exc:
            raise UnsupportedLanguageError(
                f"Language not supported: {exc}. "
                "Use a valid BCP-47 code such as 'fr', 'es', 'de', 'pt', 'zh-CN'."
            ) from exc

    def _call_provider(self, text: str) -> str:
        """Send a single request to the provider.

        Args:
            text: Text to translate (must be within provider size limit).

        Returns:
            Translated string, or the original *text* if provider returns ``None``.

        Raises:
            ProviderError: On network or provider-side failures.
        """
        try:
            result = self._translator.translate(text)
            return result if result is not None else text
        except LanguageNotSupportedException as exc:
            raise UnsupportedLanguageError(str(exc)) from exc
        except RequestError as exc:
            raise ProviderError(f"Translation request failed: {exc}") from exc
        except Exception as exc:  # noqa: BLE001
            raise ProviderError(f"Unexpected provider error: {exc}") from exc

    def _translate_chunked(self, text: str) -> str:
        """Translate text that exceeds the provider chunk size.

        Splits on paragraph boundaries (``\\n\\n``) first; if a single paragraph
        is still too large it splits on sentences (``\\n``).

        Args:
            text: Long text to translate.

        Returns:
            Concatenated translated text with original whitespace structure preserved.
        """
        paragraphs = text.split("\n\n")
        translated: list[str] = []

        for para in paragraphs:
            if len(para) <= _CHUNK_SIZE:
                translated.append(self._call_provider(para) if para.strip() else para)
            else:
                # Paragraph itself is too large — split on single newlines.
                lines = para.split("\n")
                translated_lines: list[str] = []
                for line in lines:
                    translated_lines.append(
                        self._call_provider(line) if line.strip() else line
                    )
                translated.append("\n".join(translated_lines))

        return "\n\n".join(translated)
