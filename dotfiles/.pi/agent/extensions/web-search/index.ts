import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { Text } from "@mariozechner/pi-tui";
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ── Python script ────────────────────────────────────────────────────

const PY_SCRIPT = `
import json, sys
from ddgs import DDGS
query = sys.argv[1]
max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 8
results = list(DDGS().text(query, max_results=max_results))
print(json.dumps(results))
`.trimStart();

// ── Result type ──────────────────────────────────────────────────────

interface SearchResult {
	title: string;
	href: string;
	body: string;
}

// ── Extension Registration ───────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description:
			"Search the web using DuckDuckGo. Returns titles, URLs, and snippets for matching pages.",
		promptSnippet: "Search the web for information",

		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			maxResults: Type.Optional(
				Type.Number({
					description: "Maximum number of results to return (default: 8)",
				}),
			),
		}),

		async execute(_toolCallId, params) {
			const query = params.query as string;
			const maxResults = (params.maxResults as number | undefined) ?? 8;

			// Write Python script to a temp file
			const tmpDir = mkdtempSync(join(tmpdir(), "pi-search-"));
			const scriptPath = join(tmpDir, "search.py");
			writeFileSync(scriptPath, PY_SCRIPT);

			let proc;
			try {
				proc = spawnSync(
					"python3",
					[scriptPath, query, String(maxResults)],
					{
						encoding: "utf-8",
						timeout: 30000,
						env: { ...process.env },
					},
				);
			} finally {
				try { unlinkSync(scriptPath); } catch { /* ignore */ }
				try { require("fs").rmdirSync(tmpDir); } catch { /* ignore */ }
			}

			if (proc.error) {
				throw new Error(`Failed to spawn Python: ${proc.error.message}`);
			}

			if (proc.status !== 0) {
				const stderr = proc.stderr?.trim() || "Unknown error";
				throw new Error(`Python search failed:\n${stderr}`);
			}

			let results: SearchResult[];
			try {
				results = JSON.parse(proc.stdout) as SearchResult[];
			} catch {
				throw new Error(
					`Failed to parse search results. Raw output:\n${proc.stdout.slice(0, 500)}`,
				);
			}

			if (!Array.isArray(results) || results.length === 0) {
				throw new Error(`No results found for: ${query}`);
			}

			// Format as markdown
			const lines: string[] = [
				`## Search Results for: ${query}`,
				"",
			];

			results.forEach((r, i) => {
				lines.push(`${i + 1}. **${r.title}**`);
				lines.push(`   URL: ${r.href}`);
				lines.push(`   ${r.body}`);
				lines.push("");
			});

			return {
				content: [
					{
						type: "text" as const,
						text: lines.join("\n"),
					},
				],
				details: {
					query,
					count: results.length,
				},
			};
		},

		renderCall(args, theme, context) {
			const text =
				(context.lastComponent as Text | undefined) ??
				new Text("", 0, 0);
			const { query } = args as { query?: string };
			if (!query) {
				text.setText(
					theme.fg("toolTitle", theme.bold("web_search ")) +
						theme.fg("error", "(no query)"),
				);
				return text;
			}
			const display =
				query.length > 60 ? query.slice(0, 57) + "..." : query;
			text.setText(
				theme.fg("toolTitle", theme.bold("web_search ")) +
					theme.fg("accent", `"${display}"`),
			);
			return text;
		},

		renderResult(result, { isPartial }, theme, context) {
			const text =
				(context.lastComponent as Text | undefined) ??
				new Text("", 0, 0);

			if (isPartial) {
				text.setText(theme.fg("warning", "Searching…"));
				return text;
			}

			if (context.isError) {
				const msg =
					result.content.find((c) => c.type === "text")?.text ||
					"Error";
				text.setText(theme.fg("error", msg));
				return text;
			}

			const details = result.details as {
				query?: string;
				count?: number;
			};
			const count = details?.count ?? 0;
			text.setText(
				theme.fg("success", `Found ${count} result${count === 1 ? "" : "s"}`) +
					theme.fg("muted", ` for "${details?.query ?? ""}"`),
			);
			return text;
		},
	});
}
