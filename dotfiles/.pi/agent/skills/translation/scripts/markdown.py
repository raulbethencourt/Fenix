"""Markdown file translation utilities.

Translates Markdown documents paragraph-by-paragraph, preserving:
- Fenced code blocks (``` ... ```)
- Indented code blocks (4-space / tab indented)
- HTML comment blocks
- YAML/TOML front-matter (--- ... ---)
- Inline code spans (``...``)  — kept as-is inside translated text

Usage example::

    import sys; sys.path.insert(0, "/path/to/translation_skill")
    from scripts.translator import Translator
    from scripts import markdown

    t = Translator(target="fr")
    markdown.translate_file(t, "docs/guide.md", "docs/guide-fr.md")

    # Batch — translate a whole directory
    results = markdown.translate_directory(t, "docs/", "docs-fr/", pattern="*.md")
    for src, dst in results:
        print(f"  {src} → {dst}")
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Generator

from scripts.exceptions import FileNotFoundError, OutputWriteError
from scripts.translator import Translator

# ---------------------------------------------------------------------------
# Patterns for blocks that must NOT be translated
# ---------------------------------------------------------------------------

# Fenced code block: lines that start a code fence (``` or ~~~) until a matching close.
_FENCED_CODE_OPEN = re.compile(r"^(`{3,}|~{3,})", re.MULTILINE)

# YAML / TOML front-matter: document begins with --- on its own line.
_FRONTMATTER_RE = re.compile(r"\A(---\n.*?\n---\n?)", re.DOTALL)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def translate_file(
    translator: Translator,
    src: str | Path,
    dst: str | Path,
    *,
    verbose: bool = True,
) -> Path:
    """Translate a single Markdown file.

    Args:
        translator: A configured :class:`~scripts.translator.Translator` instance.
        src: Path to the source Markdown file.
        dst: Path for the translated output file.
        verbose: If ``True``, print progress to stdout.

    Returns:
        The resolved path of the written output file.

    Raises:
        FileNotFoundError: If *src* does not exist or is not a file.
        OutputWriteError: If *dst* cannot be written.
    """
    src_path = Path(src).resolve()
    dst_path = Path(dst).resolve()

    if not src_path.exists():
        raise FileNotFoundError(f"Source file not found: {src_path}")
    if not src_path.is_file():
        raise FileNotFoundError(f"Source path is not a file: {src_path}")

    if verbose:
        print(f"Translating  {src_path}  →  {dst_path} …")

    text = src_path.read_text(encoding="utf-8")
    translated = translate_text(translator, text)

    try:
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        dst_path.write_text(translated, encoding="utf-8")
    except OSError as exc:
        raise OutputWriteError(f"Cannot write to {dst_path}: {exc}") from exc

    if verbose:
        print(f"Done         {dst_path}")

    return dst_path


def translate_directory(
    translator: Translator,
    src_dir: str | Path,
    dst_dir: str | Path,
    *,
    pattern: str = "*.md",
    verbose: bool = True,
) -> list[tuple[Path, Path]]:
    """Translate all Markdown files in *src_dir* and write them to *dst_dir*.

    The relative directory hierarchy is preserved.

    Args:
        translator: A configured :class:`~scripts.translator.Translator` instance.
        src_dir: Root directory containing source Markdown files.
        dst_dir: Root directory for translated output files.
        pattern: Glob pattern to match files (default: ``"*.md"``).
        verbose: If ``True``, print progress to stdout.

    Returns:
        List of ``(src_path, dst_path)`` tuples for every file processed.

    Raises:
        FileNotFoundError: If *src_dir* does not exist or is not a directory.
    """
    src_root = Path(src_dir).resolve()
    dst_root = Path(dst_dir).resolve()

    if not src_root.exists():
        raise FileNotFoundError(f"Source directory not found: {src_root}")
    if not src_root.is_dir():
        raise FileNotFoundError(f"Source path is not a directory: {src_root}")

    results: list[tuple[Path, Path]] = []
    for src_file in sorted(src_root.rglob(pattern)):
        relative = src_file.relative_to(src_root)
        dst_file = dst_root / relative
        translate_file(translator, src_file, dst_file, verbose=verbose)
        results.append((src_file, dst_file))

    return results


def translate_text(translator: Translator, text: str) -> str:
    """Translate the content of a Markdown string, preserving code blocks.

    Args:
        translator: A configured :class:`~scripts.translator.Translator` instance.
        text: Full Markdown document as a string.

    Returns:
        Translated Markdown string.
    """
    # 1. Extract and preserve front-matter unchanged.
    frontmatter = ""
    body = text
    fm_match = _FRONTMATTER_RE.match(text)
    if fm_match:
        frontmatter = fm_match.group(1)
        body = text[fm_match.end():]

    # 2. Split body into segments: translatable vs. verbatim.
    segments = list(_split_into_segments(body))

    # 3. Translate only prose segments.
    translated_segments: list[str] = []
    for seg_text, is_code in segments:
        if is_code:
            translated_segments.append(seg_text)
        else:
            translated_segments.append(_translate_paragraphs(translator, seg_text))

    return frontmatter + "".join(translated_segments)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _split_into_segments(text: str) -> Generator[tuple[str, bool], None, None]:
    """Yield ``(segment_text, is_verbatim)`` pairs.

    Verbatim segments are fenced code blocks (``` / ~~~) and indented code
    blocks (lines starting with 4 spaces or a tab).

    Args:
        text: Markdown body (without front-matter).

    Yields:
        ``(segment_text, is_verbatim)`` tuples.
    """
    pos = 0
    length = len(text)

    while pos < length:
        # Try to find the next fenced code block.
        fence_match = _FENCED_CODE_OPEN.search(text, pos)

        if fence_match is None:
            # No more fenced blocks — yield the rest as prose.
            yield text[pos:], False
            return

        fence_start = fence_match.start()
        fence_char = fence_match.group(1)[0]  # '`' or '~'
        fence_len = len(fence_match.group(1))
        closing_pattern = re.compile(
            r"^" + re.escape(fence_char * fence_len) + r"+\s*$", re.MULTILINE
        )

        # Yield prose before the fence.
        if fence_start > pos:
            yield text[pos:fence_start], False

        # Find the closing fence.
        close_match = closing_pattern.search(text, fence_match.end())
        if close_match is None:
            # Unclosed code block — treat the rest as verbatim.
            yield text[fence_start:], True
            return

        fence_end = close_match.end()
        yield text[fence_start:fence_end], True
        pos = fence_end


def _translate_paragraphs(translator: Translator, prose: str) -> str:
    """Translate a prose segment paragraph-by-paragraph.

    Paragraphs are separated by blank lines (``\\n\\n``).  Indented code
    blocks (4-space / tab prefix on every line) within a paragraph are
    kept verbatim.

    Args:
        translator: Active :class:`~scripts.translator.Translator`.
        prose: Plain Markdown prose (no fenced code blocks).

    Returns:
        Translated prose with paragraph separators preserved.
    """
    paragraphs = prose.split("\n\n")
    translated: list[str] = []

    for para in paragraphs:
        if _is_indented_code_block(para):
            translated.append(para)
        else:
            translated.append(translator.translate(para))

    return "\n\n".join(translated)


def _is_indented_code_block(para: str) -> bool:
    """Return ``True`` if every non-empty line in *para* is indented code.

    A paragraph is considered an indented code block when **all** of its
    non-blank lines start with four spaces or a tab character.

    Args:
        para: A single Markdown paragraph.
    """
    lines = para.splitlines()
    non_empty = [ln for ln in lines if ln.strip()]
    if not non_empty:
        return False
    return all(ln.startswith("    ") or ln.startswith("\t") for ln in non_empty)
