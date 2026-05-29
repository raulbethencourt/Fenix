import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createBashTool } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

function shellEscape(s: string): string {
	return "'" + s.replace(/'/g, "'\\''") + "'";
}

export default function (pi: ExtensionAPI) {
	const bashTool = createBashTool(process.cwd());

	pi.registerTool({
		name: "repomix",
		label: "Repomix",
		description:
			"Pack a subset of the codebase into a single AI-optimized document. Uses tree-sitter compression (~70% token reduction) to give full module context in one shot. Best for understanding 5-20 related files holistically.",
		promptSnippet: "Get full compressed context of a module or directory for holistic understanding",
		promptGuidelines: [
			"Use repomix when you need to understand an entire module/directory holistically (5-20 files)",
			"Always use --include to scope to the relevant subset — never pack an entire large repo",
			"Prefer repo_map for structural overview, use repomix when you need actual implementation details",
			"For single files, use read instead — repomix is for multi-file understanding",
			"Use for: cross-file refactoring context, module architecture understanding, pre-planning analysis",
		],
		parameters: Type.Object({
			path: Type.Optional(
				Type.String({
					description: "Directory to pack. Defaults to current working directory.",
				}),
			),
			include: Type.Optional(
				Type.Array(Type.String(), {
					description: "Glob patterns to include (e.g., ['src/auth/**', 'src/middleware/**']). Strongly recommended.",
				}),
			),
			ignore: Type.Optional(
				Type.Array(Type.String(), {
					description: "Additional glob patterns to exclude beyond .gitignore",
				}),
			),
			compress: Type.Optional(
				Type.Boolean({
					description: "Use tree-sitter compression for ~70% token reduction. Default: true.",
				}),
			),
			style: Type.Optional(
				Type.Union(
					[Type.Literal("markdown"), Type.Literal("xml"), Type.Literal("plain")],
					{ description: "Output format. Default: markdown." },
				),
			),
			includeDiffs: Type.Optional(
				Type.Boolean({
					description: "Include uncommitted git changes in the output",
				}),
			),
			removeComments: Type.Optional(
				Type.Boolean({
					description: "Strip comments from code to reduce tokens further",
				}),
			),
			tokenCountTree: Type.Optional(
				Type.Boolean({
					description: "Show hierarchical token usage instead of packing content. Useful for budgeting.",
				}),
			),
		}),
		async execute(toolCallId, params, signal, onUpdate) {
			const parts: string[] = ["repomix"];

			// Target directory
			if (params.path) {
				parts.push(shellEscape(params.path));
			}

			// Include patterns
			if (params.include && params.include.length > 0) {
				parts.push("--include", shellEscape(params.include.join(",")));
			}

			// Ignore patterns
			if (params.ignore && params.ignore.length > 0) {
				parts.push("--ignore", shellEscape(params.ignore.join(",")));
			}

			// Compression (default true)
			if (params.compress !== false) {
				parts.push("--compress");
			}

			// Style (default markdown)
			parts.push("--style", params.style || "markdown");

			// Optional flags
			if (params.includeDiffs) {
				parts.push("--include-diffs");
			}
			if (params.removeComments) {
				parts.push("--remove-comments");
			}
			if (params.tokenCountTree) {
				parts.push("--token-count-tree");
			}

			// Output to stdout
			parts.push("--output", "/dev/stdout");

			// Suppress progress/info
			parts.push("--no-file-summary", "--no-directory-structure");

			const command = parts.join(" ");
			return bashTool.execute(toolCallId, { command, timeout: 120 }, signal, onUpdate);
		},
	});
}
