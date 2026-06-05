import path from "node:path";
import { computeFileHash, normalizeToLF } from "./hash.ts";
import { readTextFile, writeTextFile } from "./filesystem.ts";
import type { SnapshotStore } from "./snapshot-store.ts";
import { resolveAbsolutePath, stripSelector } from "./path-utils.ts";

export interface PatchSection {
  path: string;
  tag: string;
  search: string;
  replace: string;
}

export interface PatchResult {
  path: string;
  diff: string;
}

export type PatchError =
  | { type: "mismatch"; path: string; message: string }
  | { type: "not_found"; path: string; message: string }
  | { type: "parse_error"; message: string };

type ParsedSection = PatchSection & {
  relativePath?: string;
};

function parseHeader(line: string, cwd: string):
  | { path: string; rawPath: string; tag: string }
  | { error: string } {
  const hashIndex = line.lastIndexOf("#");
  if (!line.startsWith("¶") || hashIndex <= 1 || hashIndex === line.length - 1) {
    return { error: `Invalid hashline header: ${line}` };
  }

  const rawPath = stripSelector(line.slice(1, hashIndex).trim());
  const absolutePath = resolveAbsolutePath(rawPath, cwd);
  if (!absolutePath) {
    return { error: `Invalid path in hashline header: ${rawPath}` };
  }

  return {
    path: absolutePath,
    rawPath,
    tag: line.slice(hashIndex + 1).trim().toUpperCase(),
  };
}

function normalizeDiffLines(text: string): string[] {
  if (text.length === 0) {
    return [];
  }

  const lines = normalizeToLF(text).split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function formatDiff(search: string, replace: string): string {
  const removed = normalizeDiffLines(search).map((line) => `- ${line}`);
  const added = normalizeDiffLines(replace).map((line) => `+ ${line}`);
  return [...removed, ...added].join("\n");
}

function getRelativePath(section: PatchSection): string {
  return (section as ParsedSection).relativePath
    ?? path.relative(process.cwd(), section.path)
    ?? section.path;
}

function validateTag(section: PatchSection, currentContent: string): PatchError | undefined {
  const currentTag = computeFileHash(currentContent);
  if (currentTag === section.tag.toUpperCase()) {
    return undefined;
  }

  return {
    type: "mismatch",
    path: section.path,
    message: `Tag mismatch for ¶${getRelativePath(section)}. The file may have changed since your last read, or a previous section in this edit already modified it. Please re-read the file.`,
  };
}

export async function validatePatch(section: PatchSection): Promise<PatchError | undefined> {
  const currentContent = normalizeToLF(await readTextFile(section.path));
  return validateTag(section, currentContent);
}

export function parseHashlineInput(input: string, cwd: string): PatchSection[] | { error: string } {
  const normalizedInput = normalizeToLF(input);
  const lines = normalizedInput.split("\n");
  const sections: ParsedSection[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (!line.startsWith("¶")) {
      return { error: "Missing ¶path#tag header before SEARCH/REPLACE block." };
    }

    const header = parseHeader(line, cwd);
    if ("error" in header) {
      return header;
    }
    index += 1;

    if (lines[index] !== "<<<<<<< SEARCH") {
      return { error: `Expected <<<<<<< SEARCH after ${line}` };
    }
    index += 1;

    const searchLines: string[] = [];
    while (index < lines.length && lines[index] !== "=======") {
      searchLines.push(lines[index] ?? "");
      index += 1;
    }

    if (index >= lines.length) {
      return { error: `Missing ======= block separator for ${line}` };
    }
    index += 1;

    const replaceLines: string[] = [];
    while (index < lines.length && lines[index] !== ">>>>>>> REPLACE") {
      replaceLines.push(lines[index] ?? "");
      index += 1;
    }

    if (index >= lines.length) {
      return { error: `Missing >>>>>>> REPLACE block terminator for ${line}` };
    }
    index += 1;

    const section: ParsedSection = {
      path: header.path,
      tag: header.tag,
      search: searchLines.join("\n"),
      replace: replaceLines.join("\n"),
    };
    Object.defineProperty(section, "relativePath", {
      value: header.rawPath,
      enumerable: false,
      configurable: true,
      writable: false,
    });
    sections.push(section);
  }

  if (sections.length === 0) {
    return { error: "Missing ¶path#tag header before SEARCH/REPLACE block." };
  }

  return sections;
}

export async function applyPatch(section: PatchSection, store: SnapshotStore): Promise<PatchResult | PatchError> {
  const search = normalizeToLF(section.search);
  if (search.trim() === "") {
    return {
      type: "parse_error",
      message: "SEARCH block cannot be empty.",
    };
  }

  const currentContent = normalizeToLF(await readTextFile(section.path));
  const validationError = validateTag(section, currentContent);
  if (validationError) {
    return validationError;
  }

  const replace = normalizeToLF(section.replace);
  const matchIndex = currentContent.indexOf(search);
  if (matchIndex === -1) {
    return {
      type: "not_found",
      path: section.path,
      message: "Search block not found in file. Please re-read the file.",
    };
  }

  const occurrences = currentContent.split(search).length - 1;
  const nextContent = currentContent.slice(0, matchIndex) + replace + currentContent.slice(matchIndex + search.length);
  await writeTextFile(section.path, nextContent);
  store.set(section.path, nextContent);

  const warning = occurrences > 1
    ? `⚠ Search text matched ${occurrences} occurrences — only the first was replaced.`
    : "";

  return {
    path: section.path,
    diff: [formatDiff(search, replace), warning].filter(Boolean).join("\n"),
  };
}
