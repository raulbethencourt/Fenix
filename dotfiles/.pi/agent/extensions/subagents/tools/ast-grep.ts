/**
 * AST-grep (sg) tool extension for subagents.
 * Provides structural code search using AST pattern matching.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createBashTool } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

function shellEscape(s: string): string {
	return "'" + s.replace(/'/g, "'\\''") + "'";
}

export default function (pi: ExtensionAPI) {
	const bashTool = createBashTool(process.cwd());

	pi.registerTool({
		name: "ast_grep",
		label: "AST Grep",
		description:
			"Structural code search using ast-grep (sg). Search for AST patterns in code, matching syntax structure rather than text. Supports all major languages.",
		promptSnippet: "Search code by AST structure, not text",
		promptGuidelines: [
			"Use ast_grep for structural code search — it matches syntax trees, not text",
			"Pattern examples: `console.log($MSG)`, `if ($COND) { $$$ }`, `function $NAME($$$) { $$$ }`",
			"$NAME matches a single AST node, $$$ matches zero or more nodes",
			"Specify --lang when searching mixed-language codebases for accuracy",
		],
		parameters: Type.Object({
			pattern: Type.String({
				description:
					"AST pattern to search for. Use $NAME for wildcards (e.g., `console.log($MSG)`, `if ($COND) { $$$ }`, `function $NAME($$$) { $$$ }`)",
			}),
			lang: Type.Optional(
				Type.String({
					description:
						"Language to parse (e.g., typescript, javascript, python, php, html, css, json, etc.)",
				}),
			),
			paths: Type.Optional(
				Type.Array(Type.String(), {
					description: "Paths to search. Defaults to current directory.",
				}),
			),
			rule: Type.Optional(
				Type.String({
					description: "Path to a YAML rule file for complex matching",
				}),
			),
			format: Type.Optional(
				Type.Union([Type.Literal("rich"), Type.Literal("json")], {
					description: "Output format. Default: rich",
				}),
			),
		}),
		async execute(toolCallId, params, signal, onUpdate) {
			const parts: string[] = ["/usr/bin/sg"];

			if (params.rule) {
				parts.push("run");
				parts.push("-r", shellEscape(params.rule));
			} else {
				parts.push("scan");
			}

			if (params.pattern) {
				parts.push("-p", shellEscape(params.pattern));
			}

			if (params.lang) {
				parts.push("-l", shellEscape(params.lang));
			}

			if (params.format) {
				parts.push("-f", params.format);
			}

			parts.push("--color", "never");

			if (params.paths && params.paths.length > 0) {
				for (const p of params.paths) {
					parts.push(shellEscape(p));
				}
			}

			const command = parts.join(" ");
			return bashTool.execute(toolCallId, { command, timeout: 30 }, signal, onUpdate);
		},
	});
}
