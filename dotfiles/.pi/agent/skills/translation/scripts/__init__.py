"""Translation Skill — public API.

Import this package to access the full translation surface:

    import sys; sys.path.insert(0, "/path/to/translation_skill")
    from scripts import markdown
    from scripts.translator import Translator

    t = Translator(target="fr")
    markdown.translate_file(t, "docs/guide.md", "docs/guide-fr.md")
"""

from . import markdown
from .exceptions import (
    EmptyInputError,
    FileNotFoundError,
    OutputWriteError,
    ProviderError,
    TranslationError,
    UnsupportedLanguageError,
)
from .translator import Translator

__all__ = [
    # Modules
    "markdown",
    # Core class
    "Translator",
    # Exceptions
    "TranslationError",
    "UnsupportedLanguageError",
    "ProviderError",
    "FileNotFoundError",
    "EmptyInputError",
    "OutputWriteError",
]
