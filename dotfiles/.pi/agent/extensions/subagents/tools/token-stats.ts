/**
 * token_stats tool — queries the telemetry database for subagent spending analytics.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { getDb } from "../telemetry.ts";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "token_stats",
		label: "Token Stats",
		description: "Query subagent telemetry — spending, token usage, duration, and success rates.",
		parameters: Type.Object({
			period: Type.Optional(
				Type.String({
					description: 'Time period: "today", "week", "month", or "all" (default: "week")',
					default: "week",
				}),
			),
			agent: Type.Optional(Type.String({ description: "Filter by agent name" })),
			project: Type.Optional(Type.String({ description: "Filter by project path (substring match on cwd)" })),
			top: Type.Optional(Type.Number({ description: "Show top N most expensive runs" })),
			group_by: Type.Optional(
				Type.String({
					description: 'Aggregation axis: "agent", "model", "project", or "day"',
				}),
			),
		}),

		async execute(_toolCallId, params) {
			const db = getDb();
			if (!db) {
				return { content: [{ type: "text", text: "Telemetry database not available. Ensure Node.js v24+ with node:sqlite support." }] };
			}

			const period = params.period || "week";
			const conditions: string[] = [];
			const values: any[] = [];

			// Period filter
			if (period !== "all") {
				const now = new Date();
				let since: Date;
				switch (period) {
					case "today":
						since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
						break;
					case "month":
						since = new Date(now.getFullYear(), now.getMonth(), 1);
						break;
					default: // week
						since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				}
				conditions.push("timestamp >= ?");
				values.push(since.toISOString());
			}

			// Agent filter
			if (params.agent) {
				conditions.push("agent = ?");
				values.push(params.agent);
			}

			// Project filter
			if (params.project) {
				conditions.push("cwd LIKE ?");
				values.push(`%${params.project}%`);
			}

			const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

			// Top N most expensive
			if (params.top) {
				const rows = db.prepare(`SELECT agent, model, task_summary, cost_usd, input_tokens + output_tokens as total_tokens, duration_ms, exit_code, timestamp FROM runs ${where} ORDER BY cost_usd DESC LIMIT ?`).all(...values, params.top);
				if (rows.length === 0) return { content: [{ type: "text", text: "No runs found for the given filters." }] };
				let out = `## Top ${params.top} Most Expensive Runs (${period})\n\n`;
				out += "| # | Agent | Model | Cost | Tokens | Duration | Task |\n";
				out += "|---|-------|-------|------|--------|----------|------|\n";
				rows.forEach((r: any, i: number) => {
					out += `| ${i + 1} | ${r.agent} | ${r.model || "?"} | $${r.cost_usd.toFixed(4)} | ${formatTokens(r.total_tokens)} | ${formatDuration(r.duration_ms)} | ${(r.task_summary || "").slice(0, 40)}... |\n`;
				});
				return { content: [{ type: "text", text: out }] };
			}

			// Group by
			if (params.group_by) {
				const groupCol = getGroupColumn(params.group_by);
				if (!groupCol) return { content: [{ type: "text", text: `Invalid group_by: ${params.group_by}. Use: agent, model, project, day` }] };
				const rows = db.prepare(`SELECT ${groupCol} as grp, COUNT(*) as runs, SUM(cost_usd) as cost, SUM(input_tokens + output_tokens) as tokens, AVG(duration_ms) as avg_duration, SUM(CASE WHEN exit_code = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_pct FROM runs ${where} GROUP BY ${groupCol} ORDER BY cost DESC`).all(...values);
				if (rows.length === 0) return { content: [{ type: "text", text: "No runs found for the given filters." }] };
				let out = `## Stats by ${params.group_by} (${period})\n\n`;
				out += `| ${params.group_by} | Runs | Cost | Tokens | Avg Duration | Success% |\n`;
				out += "|---|---|---|---|---|---|\n";
				rows.forEach((r: any) => {
					out += `| ${r.grp || "unknown"} | ${r.runs} | $${r.cost.toFixed(4)} | ${formatTokens(r.tokens)} | ${formatDuration(r.avg_duration)} | ${r.success_pct.toFixed(0)}% |\n`;
				});
				return { content: [{ type: "text", text: out }] };
			}

			// Default: summary + per-agent breakdown
			const summary = db.prepare(`SELECT COUNT(*) as runs, SUM(cost_usd) as cost, SUM(input_tokens + output_tokens) as tokens, AVG(duration_ms) as avg_duration, SUM(CASE WHEN exit_code = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_pct FROM runs ${where}`).get(...values);
			if (!summary || summary.runs === 0) return { content: [{ type: "text", text: "No runs found for the given filters." }] };

			const byAgent = db.prepare(`SELECT agent, COUNT(*) as runs, SUM(cost_usd) as cost, SUM(input_tokens + output_tokens) as tokens, AVG(duration_ms) as avg_duration, SUM(CASE WHEN exit_code = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_pct FROM runs ${where} GROUP BY agent ORDER BY cost DESC`).all(...values);

			let out = `## Token Stats (${period})\n`;
			out += `Total: ${summary.runs} runs · $${summary.cost.toFixed(4)} · ${formatTokens(summary.tokens)} · ${summary.success_pct.toFixed(0)}% success · avg ${formatDuration(summary.avg_duration)}\n\n`;
			out += "| Agent | Runs | Cost | Tokens | Avg Duration | Success% |\n";
			out += "|---|---|---|---|---|---|\n";
			byAgent.forEach((r: any) => {
				out += `| ${r.agent} | ${r.runs} | $${r.cost.toFixed(4)} | ${formatTokens(r.tokens)} | ${formatDuration(r.avg_duration)} | ${r.success_pct.toFixed(0)}% |\n`;
			});
			return { content: [{ type: "text", text: out }] };
		},
	});
}

function getGroupColumn(groupBy: string): string | null {
	switch (groupBy) {
		case "agent": return "agent";
		case "model": return "model";
		case "project": return "cwd";
		case "day": return "date(timestamp)";
		default: return null;
	}
}

function formatTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
	return String(n);
}

function formatDuration(ms: number): string {
	if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
	if (ms >= 1_000) return `${(ms / 1_000).toFixed(0)}s`;
	return `${Math.round(ms)}ms`;
}
