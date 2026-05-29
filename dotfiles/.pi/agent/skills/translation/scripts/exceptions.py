"""Exception hierarchy for the Translation skill."""


class TranslationError(Exception):
    """Base exception for all translation skill errors."""


class UnsupportedLanguageError(TranslationError):
    """Raised when a requested language code is not supported by the provider.

    Resolution: Use a valid BCP-47 / ISO 639-1 language code (e.g. 'fr', 'es', 'de').
    """


class ProviderError(TranslationError):
    """Raised when the translation provider returns an unexpected error.

    This wraps network errors, quota errors, and other provider-side failures.
    """


class FileNotFoundError(TranslationError):  # noqa: A001
    """Raised when the source file for translation does not exist.

    Resolution: Verify the file path is correct and the file is readable.
    """


class EmptyInputError(TranslationError):
    """Raised when a blank/whitespace-only string is passed where content is required."""


class OutputWriteError(TranslationError):
    """Raised when the translated content cannot be written to the destination path.

    Resolution: Verify the directory exists and you have write permissions.
    """
