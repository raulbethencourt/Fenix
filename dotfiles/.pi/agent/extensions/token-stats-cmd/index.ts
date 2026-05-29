import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { matchesKey, Key, truncateToWidth } from "@mariozechner/pi-tui";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const DB_PATH = path.join(os.homedir(), ".pi", "data", "analytics.db");

type Period = "today" | "week" | "month" | "all";

export default function (pi: ExtensionAPI) {
    pi.registerCommand("token_stats", {
        description: "Show token spending analytics dashboard",
        handler: async (args, ctx) => {
            const theme = ctx.ui.theme;
            const bold = theme.bold ?? ((s: string) => s);
            const heading = (text: string) => theme.fg("accent", bold(text));
            const label = (text: string) => theme.fg("muted", text);
            const value = (text: string) => theme.fg("text", text);
            const success = (text: string) => theme.fg("success", text);
            const dim = (text: string) => theme.fg("dim", text);

            const parsed = parsePeriod(args ?? "");
            const period = parsed.period;
            const where = buildWhere(period);

            const lines: string[] = [];
            lines.push(heading(`  Token Spending Analytics (${period})`));
            lines.push("");

            if (parsed.warning) {
                lines.push(`  ${dim(parsed.warning)}`);
                lines.push("");
            }

            if (!fs.existsSync(DB_PATH)) {
                lines.push(`  ${dim("No telemetry data — database not found at ~/.pi/data/analytics.db")}`);
                return showScrollableUi(ctx, lines);
            }

            let db: any = null;
            try {
                const { DatabaseSync } = require("node:sqlite");
                db = new DatabaseSync(DB_PATH);

                const summary = db.prepare(`
                    SELECT
                        COUNT(*) AS runs,
                        COALESCE(SUM(cost_usd), 0) AS cost,
                        COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
                        COALESCE(SUM(cache_read + cache_write), 0) AS cache_savings,
                        COALESCE(AVG(duration_ms), 0) AS avg_duration,
                        CASE WHEN COUNT(*) > 0
                            THEN SUM(CASE WHEN exit_code = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                            ELSE 0 END AS success_pct
                    FROM runs
                    ${where.sql}
                `).get(...where.params);

                if (!summary || Number(summary.runs) === 0) {
                    lines.push(`  ${dim("No telemetry data for selected period")}`);
                    return showScrollableUi(ctx, lines);
                }

                const byAgent = db.prepare(`
                    SELECT
                        agent,
                        COUNT(*) AS runs,
                        COALESCE(SUM(cost_usd), 0) AS cost,
                        COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
                        COALESCE(AVG(duration_ms), 0) AS avg_duration,
                        SUM(CASE WHEN exit_code = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS success_pct
                    FROM runs
                    ${where.sql}
                    GROUP BY agent
                    ORDER BY cost DESC
                `).all(...where.params);

                const byModel = db.prepare(`
                    SELECT
                        COALESCE(model, 'unknown') AS model,
                        COUNT(*) AS runs,
                        COALESCE(SUM(cost_usd), 0) AS cost,
                        COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
                        COALESCE(AVG(duration_ms), 0) AS avg_duration,
                        SUM(CASE WHEN exit_code = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS success_pct
                    FROM runs
                    ${where.sql}
                    GROUP BY COALESCE(model, 'unknown')
                    ORDER BY cost DESC
                `).all(...where.params);

                const byProjectRaw = db.prepare(`
                    SELECT
                        COALESCE(cwd, '') AS cwd,
                        COUNT(*) AS runs,
                        COALESCE(SUM(cost_usd), 0) AS cost
                    FROM runs
                    ${where.sql}
                    GROUP BY COALESCE(cwd, '')
                    ORDER BY cost DESC
                `).all(...where.params);

                const byDayRaw = db.prepare(`
                    SELECT
                        date(timestamp) AS day,
                        COUNT(*) AS runs,
                        COALESCE(SUM(cost_usd), 0) AS cost
                    FROM runs
                    ${where.sql}
                    GROUP BY date(timestamp)
                    ORDER BY day ASC
                `).all(...where.params);

                const top5 = db.prepare(`
                    SELECT
                        agent,
                        COALESCE(model, 'unknown') AS model,
                        COALESCE(cost_usd, 0) AS cost,
                        COALESCE(input_tokens + output_tokens, 0) AS tokens,
                        COALESCE(task_summary, '') AS task_summary
                    FROM runs
                    ${where.sql}
                    ORDER BY cost DESC
                    LIMIT 5
                `).all(...where.params);

                // Summary
                lines.push(heading("  Summary"));
                lines.push("");
                lines.push(`  ${label("Total runs:")}      ${value(String(summary.runs))}`);
                lines.push(`  ${label("Total cost:")}      ${value(formatCost(Number(summary.cost)))}`);
                lines.push(`  ${label("Total tokens:")}    ${value(formatTokens(Number(summary.tokens)))}`);
                lines.push(`  ${label("Cache savings:")}   ${value(formatTokens(Number(summary.cache_savings)))}`);
                lines.push(`  ${label("Success rate:")}    ${success(`${Number(summary.success_pct).toFixed(1)}%`)}`);
                lines.push(`  ${label("Avg duration:")}    ${value(formatDuration(Number(summary.avg_duration)))}`);
                lines.push("");

                // By Agent
                lines.push(heading("  By Agent"));
                lines.push("");
                lines.push(`  ${label(padRight("Agent", 16))} ${label(padLeft("Runs", 5))} ${label(padLeft("Cost", 10))} ${label(padLeft("Tokens", 10))} ${label(padLeft("Avg", 7))} ${label(padLeft("Success", 8))}`);
                lines.push(`  ${dim("─".repeat(62))}`);
                for (const row of byAgent) {
                    lines.push(
                        `  ${value(padRight(String(row.agent || "unknown"), 16))} ${value(padLeft(String(row.runs), 5))} ${value(padLeft(formatCost(Number(row.cost)), 10))} ${value(padLeft(formatTokens(Number(row.tokens)), 10))} ${value(padLeft(formatDuration(Number(row.avg_duration)), 7))} ${success(padLeft(`${Number(row.success_pct).toFixed(0)}%`, 8))}`,
                    );
                }
                lines.push("");

                // By Model
                lines.push(heading("  By Model"));
                lines.push("");
                lines.push(`  ${label(padRight("Model", 22))} ${label(padLeft("Runs", 5))} ${label(padLeft("Cost", 10))} ${label(padLeft("Tokens", 10))} ${label(padLeft("Avg", 7))} ${label(padLeft("Success", 8))}`);
                lines.push(`  ${dim("─".repeat(68))}`);
                for (const row of byModel) {
                    lines.push(
                        `  ${value(padRight(String(row.model || "unknown"), 22))} ${value(padLeft(String(row.runs), 5))} ${value(padLeft(formatCost(Number(row.cost)), 10))} ${value(padLeft(formatTokens(Number(row.tokens)), 10))} ${value(padLeft(formatDuration(Number(row.avg_duration)), 7))} ${success(padLeft(`${Number(row.success_pct).toFixed(0)}%`, 8))}`,
                    );
                }
                lines.push("");

                // By Day
                const byDay = normalizeDays(byDayRaw, period);
                const maxDailyCost = byDay.reduce((m, d) => Math.max(m, Number(d.cost)), 0);
                lines.push(heading("  By Day"));
                lines.push("");
                for (const day of byDay) {
                    const cost = Number(day.cost);
                    const bar = makeBar(cost, maxDailyCost, 24);
                    lines.push(`  ${value(day.day)}  ${theme.fg("accent", bar)} ${value(padLeft(formatCost(cost), 9))} ${dim(`(${day.runs} runs)`)}`);
                }
                lines.push("");

                // Top 5
                lines.push(heading("  Top 5 Expensive Runs"));
                lines.push("");
                lines.push(`  ${label(padRight("Agent", 12))} ${label(padRight("Model", 16))} ${label(padLeft("Cost", 10))} ${label(padLeft("Tokens", 10))} ${label("Task")}`);
                lines.push(`  ${dim("─".repeat(86))}`);
                for (const row of top5) {
                    lines.push(
                        `  ${value(padRight(String(row.agent || "unknown"), 12))} ${value(padRight(String(row.model || "unknown"), 16))} ${value(padLeft(formatCost(Number(row.cost)), 10))} ${value(padLeft(formatTokens(Number(row.tokens)), 10))} ${dim(truncate(row.task_summary, 34))}`,
                    );
                }
                lines.push("");

                // By Project
                lines.push(heading("  By Project"));
                lines.push("");
                lines.push(`  ${label(padRight("Project", 24))} ${label(padLeft("Runs", 5))} ${label(padLeft("Cost", 10))}`);
                lines.push(`  ${dim("─".repeat(44))}`);
                for (const row of byProjectRaw) {
                    const project = basenameOrUnknown(String(row.cwd || ""));
                    lines.push(
                        `  ${value(padRight(project, 24))} ${value(padLeft(String(row.runs), 5))} ${value(padLeft(formatCost(Number(row.cost)), 10))}`,
                    );
                }
                lines.push("");

                // By Tool
                const byTool = db.prepare(`
                    SELECT
                        tc.tool,
                        SUM(tc.count) AS total_calls,
                        COUNT(DISTINCT tc.run_id) AS runs_used
                    FROM tool_calls tc
                    JOIN runs r ON r.id = tc.run_id
                    ${where.sql}
                    GROUP BY tc.tool
                    ORDER BY total_calls DESC
                `).all(...where.params);

                if (byTool.length > 0) {
                    lines.push(heading("  By Tool"));
                    lines.push("");
                    lines.push(`  ${label(padRight("Tool", 20))} ${label(padLeft("Calls", 8))} ${label(padLeft("Runs", 6))}`);
                    lines.push(`  ${dim("─".repeat(38))}`);
                    for (const row of byTool) {
                        lines.push(
                            `  ${value(padRight(String(row.tool || "unknown"), 20))} ${value(padLeft(String(row.total_calls), 8))} ${value(padLeft(String(row.runs_used), 6))}`,
                        );
                    }
                    lines.push("");
                }

                lines.push(`  ${dim("Use: /token_stats [today|week|month|all]")}`);
            } catch {
                lines.push(`  ${dim("No telemetry data — unable to read analytics database")}`);
            } finally {
                try {
                    db?.close?.();
                } catch {
                    // ignore
                }
            }

            await showScrollableUi(ctx, lines);
        },
    });
}

async function showScrollableUi(ctx: any, lines: string[]) {
    await ctx.ui.custom<void>((tui: any, theme: any, _kb: any, done: () => void) => {
        let scrollOffset = 0;
        const termRows = process.stdout.rows ?? 30;
        const viewHeight = Math.min(lines.length, Math.max(10, termRows - 5));
        const maxScroll = Math.max(0, lines.length - viewHeight);

        return {
            render(width: number): string[] {
                const borderFn = (s: string) => theme.fg("accent", s);
                const topBorder = borderFn("─".repeat(width));
                const bottomBorder = borderFn("─".repeat(width));
                const visible = lines.slice(scrollOffset, scrollOffset + viewHeight);
                const truncated = visible.map((l) => truncateToWidth(l, width));
                const scrollInfo = lines.length > viewHeight
                    ? theme.fg("dim", `  ↑↓ scroll • q/esc close  (${scrollOffset + 1}-${Math.min(scrollOffset + viewHeight, lines.length)}/${lines.length})`)
                    : theme.fg("dim", "  q/esc close");
                return [topBorder, ...truncated, bottomBorder, scrollInfo];
            },
            invalidate() {},
            handleInput(data: string) {
                if (matchesKey(data, Key.escape) || data === "q" || data === "Q") {
                    done();
                } else if (matchesKey(data, Key.up) || data === "k") {
                    if (scrollOffset > 0) scrollOffset--;
                    tui.requestRender();
                } else if (matchesKey(data, Key.down) || data === "j") {
                    if (scrollOffset < maxScroll) scrollOffset++;
                    tui.requestRender();
                } else if (matchesKey(data, Key.pageUp)) {
                    scrollOffset = Math.max(0, scrollOffset - 10);
                    tui.requestRender();
                } else if (matchesKey(data, Key.pageDown)) {
                    scrollOffset = Math.min(maxScroll, scrollOffset + 10);
                    tui.requestRender();
                } else if (matchesKey(data, Key.home)) {
                    scrollOffset = 0;
                    tui.requestRender();
                } else if (matchesKey(data, Key.end)) {
                    scrollOffset = maxScroll;
                    tui.requestRender();
                }
            },
        };
    });
}

function parsePeriod(args: string): { period: Period; warning?: string } {
    const first = args.trim().split(/\s+/).filter(Boolean)[0]?.toLowerCase();
    if (!first) return { period: "week" };
    if (first === "today" || first === "week" || first === "month" || first === "all") {
        return { period: first };
    }
    return {
        period: "week",
        warning: `Unknown period '${first}', using 'week'. Valid: today, week, month, all`,
    };
}

function buildWhere(period: Period): { sql: string; params: any[] } {
    if (period === "all") return { sql: "", params: [] };
    const now = new Date();
    let since: Date;
    if (period === "today") {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "month") {
        since = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    return { sql: "WHERE timestamp >= ?", params: [since.toISOString()] };
}

function normalizeDays(rows: any[], period: Period): Array<{ day: string; runs: number; cost: number }> {
    const map = new Map<string, { day: string; runs: number; cost: number }>();
    for (const row of rows) {
        const day = String(row.day);
        map.set(day, { day, runs: Number(row.runs || 0), cost: Number(row.cost || 0) });
    }

    if (period === "all") {
        return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
    }

    const now = new Date();
    const days: string[] = [];

    if (period === "today") {
        days.push(toDateKey(now));
    } else if (period === "week") {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            days.push(toDateKey(d));
        }
    } else {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        while (d <= now) {
            days.push(toDateKey(d));
            d.setDate(d.getDate() + 1);
        }
    }

    return days.map((day) => map.get(day) ?? { day, runs: 0, cost: 0 });
}

function toDateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function formatTokens(n: number): string {
    if (!Number.isFinite(n)) return "0";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(Math.round(n));
}

function formatCost(n: number): string {
    const v = Number.isFinite(n) ? n : 0;
    return `$${v.toFixed(4)}`;
}

function formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) return "0s";
    if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
    return `${Math.round(ms / 1000)}s`;
}

function makeBar(value: number, max: number, width: number): string {
    if (max <= 0 || value <= 0) return "░".repeat(width);
    const filled = Math.max(1, Math.round((value / max) * width));
    return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

function padRight(input: string, width: number): string {
    if (input.length >= width) return truncate(input, width);
    return input + " ".repeat(width - input.length);
}

function padLeft(input: string, width: number): string {
    if (input.length >= width) return truncate(input, width);
    return " ".repeat(width - input.length) + input;
}

function truncate(input: string, width: number): string {
    if (input.length <= width) return input;
    if (width <= 1) return input.slice(0, width);
    return input.slice(0, width - 1) + "…";
}

function basenameOrUnknown(cwd: string): string {
    if (!cwd) return "unknown";
    const base = path.basename(cwd);
    if (base && base !== path.sep) return base;
    return cwd === path.sep ? path.sep : "unknown";
}
