import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createBashTool } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

function shellEscape(s: string): string {
	return "'" + s.replace(/'/g, "'\\''") + "'";
}

const AST_GREP_BIN =
	"/home/rabeta/.cache/opencode/packages/oh-my-openagent@latest/node_modules/@ast-grep/cli-linux-x64-gnu/ast-grep";

const RULES = {
	typescript: `id: defs
language: TypeScript
rule:
  any:
    - kind: function_declaration
    - kind: class_declaration
    - kind: interface_declaration
    - kind: type_alias_declaration
    - kind: enum_declaration
    - kind: method_definition
    - kind: abstract_method_signature`,
	javascript: `id: defs-js
language: JavaScript
rule:
  any:
    - kind: function_declaration
    - kind: class_declaration
    - kind: method_definition`,
	php: `id: defs-php
language: PHP
rule:
  any:
    - kind: function_definition
    - kind: class_declaration
    - kind: interface_declaration
    - kind: method_declaration`,
	python: `id: defs-py
language: Python
rule:
  any:
    - kind: function_definition
    - kind: class_definition`,
};

const FORMATTER_SCRIPT = `const fs = require("node:fs");
const maxLines = Math.max(1, parseInt(process.env.REPO_MAP_MAX_LINES || "200", 10) || 200);
const input = fs.readFileSync(0, "utf8");
const byFile = new Map();

for (const raw of input.split(/\\r?\\n/)) {
  if (!raw.trim()) continue;
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    continue;
  }

  const file = obj.file || obj.path;
  const start = obj.range && obj.range.start;
  if (!file || !start || typeof start.line !== "number") continue;

  const source = typeof obj.lines === "string" ? obj.lines : "";
  let sig = (source.split(/\\r?\\n/)[0] || "").trim();
  if (!sig) continue;
  if (sig.length > 100) sig = sig.slice(0, 97) + "...";

  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push({
    line: start.line + 1,
    col: typeof start.column === "number" ? start.column : 0,
    sig,
  });
}

if (byFile.size === 0) {
  console.log("No definitions found");
  process.exit(0);
}

const out = [];
const files = Array.from(byFile.keys()).sort((a, b) => a.localeCompare(b));
for (let i = 0; i < files.length; i++) {
  const file = files[i];
  out.push(file);

  const defs = byFile.get(file).sort((a, b) => a.line - b.line || a.col - b.col || a.sig.localeCompare(b.sig));
  for (const d of defs) {
    const nestedIndent = d.col > 0 ? "  " : "";
    out.push("  L" + d.line + " " + nestedIndent + d.sig);
  }

  if (i < files.length - 1) out.push("");
}

if (out.length > maxLines) {
  if (maxLines === 1) {
    console.log("... (truncated)");
  } else {
    console.log(out.slice(0, maxLines - 1).concat("... (truncated)").join("\\n"));
  }
} else {
  console.log(out.join("\\n"));
}`;

function normalizeLang(lang?: string): keyof typeof RULES | undefined {
	if (!lang) return undefined;
	const l = lang.toLowerCase();
	if (l === "typescript" || l === "ts") return "typescript";
	if (l === "javascript" || l === "js") return "javascript";
	if (l === "php") return "php";
	if (l === "python" || l === "py") return "python";
	return undefined;
}

export default function (pi: ExtensionAPI) {
	const bashTool = createBashTool(process.cwd());

	pi.registerTool({
		name: "repo_map",
		label: "Repo Map",
		description:
			"Generate a compact structural map of a codebase showing all definitions (functions, classes, interfaces, types, methods). Fits an entire repository's structure in ~1-2K tokens. Use for quick orientation in unfamiliar codebases.",
		promptSnippet: "Get a structural overview of any codebase in ~2K tokens",
		promptGuidelines: [
			"Use repo_map to quickly understand a codebase's structure before diving into specific files",
			"The map shows definitions only (functions, classes, interfaces, types) — no implementation details",
			"Use the lang parameter to focus on specific languages in polyglot repos",
			"Combine with grep/read for targeted investigation after seeing the structural overview",
		],
		parameters: Type.Object({
			path: Type.String({
				description: "Root directory to generate the map from",
			}),
			lang: Type.Optional(
				Type.String({
					description:
						"Limit to specific language. If omitted, detects from file extensions.",
				}),
			),
			maxLines: Type.Optional(
				Type.Number({
					description: "Maximum lines in the map output (default: 200)",
				}),
			),
			globs: Type.Optional(
				Type.Array(Type.String(), {
					description:
						"File glob patterns to include/exclude (prefix with ! to exclude)",
				}),
			),
		}),
		async execute(toolCallId, params, signal, onUpdate) {
			const lang = normalizeLang(params.lang);
			if (params.lang && !lang) {
				throw new Error(
					"Unsupported lang. Use one of: typescript|ts, javascript|js, php, python|py",
				);
			}

			const inlineRules = lang
				? RULES[lang]
				: [RULES.typescript, RULES.javascript, RULES.php, RULES.python].join("\n---\n");

			const globs = params.globs ?? [];
			const globFlags = globs.map((g) => `--globs ${shellEscape(g)}`).join(" ");
			const maxLines = Number.isFinite(params.maxLines)
				? Math.max(1, Math.floor(params.maxLines))
				: 200;

			const command = [
				`cd ${shellEscape(params.path)}`,
				"&&",
				`${shellEscape(AST_GREP_BIN)} scan --inline-rules ${shellEscape(inlineRules)} --json=stream${globFlags ? ` ${globFlags}` : ""} 2>/dev/null`,
				"|",
				`REPO_MAP_MAX_LINES=${maxLines} node -e ${shellEscape(FORMATTER_SCRIPT)}`,
			].join(" ");

			return bashTool.execute(toolCallId, { command, timeout: 60 }, signal, onUpdate);
		},
	});
}
