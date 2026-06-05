import path from "node:path";
import { homedir } from "node:os";

const SELECTOR_SUFFIX_RE = /:(?:\d+-\d+|raw|conflicts|sel)$/;
const URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

export function stripSelector(rawPath: string): string {
  return rawPath.replace(SELECTOR_SUFFIX_RE, "");
}

// Note: this resolver intentionally does not enforce any containment boundary relative to cwd.
// It accepts ~-relative paths, absolute paths, and relative paths that can escape via ../.. .
// Security therefore relies on the underlying read/write tools' own access controls.
// A future configurable allowlist root could harden this by constraining resolved paths.
export function resolveAbsolutePath(rawPath: string, cwd: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed.startsWith("pi://") || URL_RE.test(trimmed)) {
    return null;
  }

  if (trimmed === "~") {
    return homedir();
  }

  if (trimmed.startsWith("~/")) {
    return path.join(homedir(), trimmed.slice(2));
  }

  if (path.isAbsolute(trimmed)) {
    return trimmed;
  }

  return path.resolve(cwd, trimmed);
}

export function extractPathsFromEditInput(input: string, cwd: string): string[] {
  const resolvedPaths = new Set<string>();

  for (const line of input.split(/\r?\n/)) {
    if (!line.startsWith("¶")) {
      continue;
    }

    const hashIndex = line.lastIndexOf("#");
    const rawPath = hashIndex >= 1 ? line.slice(1, hashIndex) : line.slice(1);
    const absolutePath = resolveAbsolutePath(stripSelector(rawPath), cwd);
    if (absolutePath) {
      resolvedPaths.add(absolutePath);
    }
  }

  return [...resolvedPaths];
}
