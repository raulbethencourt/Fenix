/**
 * Context Info Extension
 *
 * Provides a /context command that displays comprehensive session information:
 * context window usage, token breakdown, tools, skills, extensions, and commands.
 *
 * Inspired by Claude Code's /context command.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, Text, Spacer, matchesKey, Key, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { formatTokens } from "../shared/format.ts";

interface SkillInfo {
    name: string;
    description?: string;
    path?: string;
}

export default function (pi: ExtensionAPI) {
    // Cache skills from before_agent_start
    let cachedSkills: SkillInfo[] = [];
    let cachedContextFiles: string[] = [];

    pi.on("before_agent_start", async (event) => {
        const opts = event.systemPromptOptions;
        if (opts?.skills) {
            cachedSkills = (opts.skills as any[]).map((s) => ({
                name: s.name ?? "unknown",
                description: s.description ?? "",
                path: s.sourceInfo?.path ?? s.path ?? "",
            }));
        }
        if (opts?.contextFiles) {
            cachedContextFiles = (opts.contextFiles as any[]).map((f: any) =>
                typeof f === "string" ? f : f.path ?? f.name ?? String(f)
            );
        }
        // Also discover SYSTEM.md and APPEND_SYSTEM.md (loaded by pi via separate code paths)
        const { existsSync } = await import("node:fs");
        const { join } = await import("node:path");
        const { homedir } = await import("node:os");
        const agentDir = join(homedir(), ".pi", "agent");
        const projectDir = process.cwd();
        const extraContextFiles: Array<{ path: string; label: string }> = [];
        // System prompt files
        const systemCandidates = [
            { path: join(projectDir, ".pi", "SYSTEM.md"), label: "SYSTEM.md (project)" },
            { path: join(agentDir, "SYSTEM.md"), label: "SYSTEM.md (global)" },
        ];
        for (const c of systemCandidates) {
            if (existsSync(c.path)) {
                extraContextFiles.push(c);
                break; // project overrides global
            }
        }
        // Append system prompt files
        const appendCandidates = [
            { path: join(projectDir, ".pi", "APPEND_SYSTEM.md"), label: "APPEND_SYSTEM.md (project)" },
            { path: join(agentDir, "APPEND_SYSTEM.md"), label: "APPEND_SYSTEM.md (global)" },
        ];
        for (const c of appendCandidates) {
            if (existsSync(c.path)) {
                extraContextFiles.push(c);
                break; // project overrides global
            }
        }
        // Append discovered files to cachedContextFiles
        for (const f of extraContextFiles) {
            if (!cachedContextFiles.includes(f.path)) {
                cachedContextFiles.push(f.path);
            }
        }
    });

    pi.registerCommand("context", {
        description: "Show context window usage, tools, skills, extensions, and session info",
        handler: async (_args, ctx) => {
            const theme = ctx.ui.theme;
            const bold = theme.bold ?? ((s: string) => s);

            // Gather data
            const usage = ctx.getContextUsage();
            const model = ctx.model;
            const allTools = pi.getAllTools();
            const activeTools = pi.getActiveTools();
            const commands = pi.getCommands();

            // Token breakdown from branch
            let totalInput = 0;
            let totalOutput = 0;
            let totalCost = 0;
            let totalCacheRead = 0;
            let totalCacheWrite = 0;
            let userMessages = 0;
            let assistantMessages = 0;
            let toolResults = 0;
            let turns = 0;

            for (const entry of ctx.sessionManager.getBranch()) {
                if (entry.type !== "message") continue;
                const msg = entry.message;
                if (msg.role === "user") {
                    userMessages++;
                } else if (msg.role === "assistant") {
                    assistantMessages++;
                    turns++;
                    const u = (msg as any).usage;
                    if (u) {
                        totalInput += u.input ?? 0;
                        totalOutput += u.output ?? 0;
                        totalCacheRead += u.cacheRead ?? 0;
                        totalCacheWrite += u.cacheCreation ?? 0;
                        if (u.cost) totalCost += u.cost.total ?? 0;
                    }
                } else if (msg.role === "tool") {
                    toolResults++;
                }
            }

            // Group tools by source
            const toolsBySource = new Map<string, { name: string; active: boolean }[]>();
            for (const tool of allTools) {
                const source = tool.sourceInfo?.source ?? "unknown";
                if (!toolsBySource.has(source)) toolsBySource.set(source, []);
                toolsBySource.get(source)!.push({
                    name: tool.name,
                    active: activeTools.includes(tool.name),
                });
            }

            // Group commands by source
            const cmdsBySource = new Map<string, { name: string; description?: string }[]>();
            for (const cmd of commands) {
                const src = cmd.source ?? "unknown";
                if (!cmdsBySource.has(src)) cmdsBySource.set(src, []);
                cmdsBySource.get(src)!.push({ name: cmd.name, description: cmd.description });
            }

            // Infer extensions from command/tool source paths
            const extensionPaths = new Set<string>();
            for (const cmd of commands) {
                if (cmd.source === "extension" && cmd.sourceInfo?.path) {
                    extensionPaths.add(cmd.sourceInfo.path);
                }
            }
            for (const tool of allTools) {
                if (tool.sourceInfo?.source === "extension" && tool.sourceInfo?.path) {
                    extensionPaths.add(tool.sourceInfo.path);
                }
            }

            // Identify MCP tools
            const mcpTools = allTools.filter((t) => {
                const src = (t.sourceInfo?.source ?? "").toLowerCase();
                return src.includes("mcp") || src === "mcp";
            });

            // Build display lines
            const lines: string[] = [];

            const heading = (text: string) => theme.fg("accent", bold(text));
            const label = (text: string) => theme.fg("muted", text);
            const value = (text: string) => theme.fg("text", text);
            const success = (text: string) => theme.fg("success", text);
            const warn = (text: string) => theme.fg("warning", text);
            const dim = (text: string) => theme.fg("dim", text);

            // ── Context Window ──
            lines.push(heading("  Context Window"));
            lines.push("");

            if (usage) {
                const pct = usage.percent ?? 0;
                const barWidth = 30;
                const filled = Math.round((pct / 100) * barWidth);
                const empty = barWidth - filled;
                const barColor = pct > 90 ? "error" : pct > 70 ? "warning" : "success";
                const bar = theme.fg(barColor, "█".repeat(filled)) + dim("░".repeat(empty));
                const tokensStr = usage.tokens != null ? formatTokens(usage.tokens) : "?";
                const ctxStr = formatTokens(usage.contextWindow);
                lines.push(`  ${bar}  ${value(`${tokensStr} / ${ctxStr}`)}  ${dim(`(${pct.toFixed(1)}%)`)}`);
            } else {
                lines.push(`  ${dim("No context usage data available")}`);
            }
            lines.push("");

            // ── Model ──
            lines.push(heading("  Model"));
            lines.push("");
            if (model) {
                lines.push(`  ${label("Provider:")} ${value(model.provider ?? "unknown")}`);
                lines.push(`  ${label("Model:")}    ${value(model.id ?? "unknown")}`);
            } else {
                lines.push(`  ${dim("No model selected")}`);
            }
            lines.push("");

            // ── Token Usage ──
            lines.push(heading("  Token Usage"));
            lines.push("");
            lines.push(`  ${label("Input:")}       ${value(formatTokens(totalInput))}`);
            lines.push(`  ${label("Output:")}      ${value(formatTokens(totalOutput))}`);
            lines.push(`  ${label("Cache read:")}  ${value(formatTokens(totalCacheRead))}`);
            lines.push(`  ${label("Cache write:")} ${value(formatTokens(totalCacheWrite))}`);
            lines.push(`  ${label("Total cost:")}  ${value("$" + totalCost.toFixed(4))}`);
            lines.push("");

            // ── Messages ──
            lines.push(heading("  Messages"));
            lines.push("");
            lines.push(`  ${label("Turns:")}        ${value(String(turns))}`);
            lines.push(`  ${label("User:")}         ${value(String(userMessages))}`);
            lines.push(`  ${label("Assistant:")}    ${value(String(assistantMessages))}`);
            lines.push(`  ${label("Tool results:")} ${value(String(toolResults))}`);
            lines.push("");

            // ── Tools ──
            const activeCount = activeTools.length;
            const totalTools = allTools.length;
            lines.push(heading(`  Tools (${activeCount}/${totalTools} active)`));
            lines.push("");
            for (const [source, tools] of toolsBySource) {
                lines.push(`  ${label(source + ":")}`);
                for (const t of tools) {
                    const icon = t.active ? success("●") : dim("○");
                    lines.push(`    ${icon} ${value(t.name)}`);
                }
            }
            lines.push("");

            // ── MCP ──
            if (mcpTools.length > 0) {
                lines.push(heading(`  MCP Tools (${mcpTools.length})`));
                lines.push("");
                for (const t of mcpTools) {
                    lines.push(`    ${success("●")} ${value(t.name)} ${dim(t.sourceInfo?.path ?? "")}`);
                }
                lines.push("");
            }

            // ── Agents ──
            const piSubagents = (globalThis as any).__pi_subagents;
            const agentsList: Array<{ name: string; description: string; model: string; tools: string[] }> = piSubagents?.getAgents?.() ?? [];
            lines.push(heading(`  Agents (${agentsList.length})`));
            lines.push("");
            if (agentsList.length > 0) {
                for (const a of agentsList) {
                    const modelShort = a.model?.split("/").pop() ?? "";
                    lines.push(`    ${success("●")} ${value(a.name)} ${dim(modelShort)}`);
                    if (a.description) {
                        const cleaned = a.description.replace(/\r?\n/g, " ").trim();
                        const desc = cleaned.length > 70
                            ? cleaned.slice(0, 67) + "..."
                            : cleaned;
                        lines.push(`      ${dim(desc)}`);
                    }
                    if (a.tools?.length > 0) {
                        lines.push(`      ${dim("tools: " + a.tools.join(", "))}`);
                    }
                }
            } else {
                lines.push(`    ${dim("No agents registered")}`);
            }
            lines.push("");

            // ── Skills ──
            lines.push(heading(`  Skills (${cachedSkills.length})`));
            lines.push("");
            if (cachedSkills.length > 0) {
                for (const s of cachedSkills) {
                    lines.push(`    ${success("●")} ${value(s.name)}`);
                    if (s.description) {
                        const cleaned = s.description.replace(/\r?\n/g, " ").trim();
                        const desc = cleaned.length > 60
                            ? cleaned.slice(0, 57) + "..."
                            : cleaned;
                        lines.push(`      ${dim(desc)}`);
                    }
                }
            } else {
                lines.push(`    ${dim("No skills loaded (run a prompt first to populate)")}`);
            }
            lines.push("");

            // ── Extensions ──
            lines.push(heading(`  Extensions (${extensionPaths.size})`));
            lines.push("");
            if (extensionPaths.size > 0) {
                for (const p of extensionPaths) {
                    const short = p.replace(/^.*\/extensions\//, "");
                    lines.push(`    ${success("●")} ${value(short)}`);
                    lines.push(`      ${dim(p)}`);
                }
            } else {
                lines.push(`    ${dim("No extensions detected")}`);
            }
            lines.push("");

            // ── Commands ──
            const totalCmds = commands.length;
            lines.push(heading(`  Commands (${totalCmds})`));
            lines.push("");
            for (const [source, cmds] of cmdsBySource) {
                lines.push(`  ${label(source + ":")}`);
                for (const c of cmds) {
                    const rawDesc = c.description?.replace(/\r?\n/g, " ").trim() ?? "";
                    const desc = rawDesc ? ` ${dim("— " + rawDesc)}` : "";
                    lines.push(`    /${value(c.name)}${desc}`);
                }
            }
            lines.push("");

            // ── Context Files ──
            // If cache is empty (e.g. after /reload), discover from filesystem
            let contextFilesToShow = cachedContextFiles;
            if (contextFilesToShow.length === 0) {
                const { existsSync } = await import("node:fs");
                const { join } = await import("node:path");
                const { homedir } = await import("node:os");
                const agentDir = join(homedir(), ".pi", "agent");
                const projectDir = process.cwd();
                const discovered: string[] = [];
                // Context files (AGENTS.md / CLAUDE.md)
                const contextCandidates = [
                    join(agentDir, "AGENTS.md"),
                    join(agentDir, "CLAUDE.md"),
                    join(projectDir, "AGENTS.md"),
                    join(projectDir, "CLAUDE.md"),
                ];
                for (const c of contextCandidates) {
                    if (existsSync(c) && !discovered.includes(c)) discovered.push(c);
                }
                // Walk up from cwd
                let dir = projectDir;
                const root = join("/");
                while (dir !== root) {
                    const parent = join(dir, "..");
                    if (parent === dir) break;
                    dir = parent;
                    for (const name of ["AGENTS.md", "CLAUDE.md"]) {
                        const p = join(dir, name);
                        if (existsSync(p) && !discovered.includes(p)) discovered.push(p);
                    }
                }
                // SYSTEM.md
                const systemCandidates = [
                    join(projectDir, ".pi", "SYSTEM.md"),
                    join(agentDir, "SYSTEM.md"),
                ];
                for (const c of systemCandidates) {
                    if (existsSync(c)) { discovered.push(c); break; }
                }
                // APPEND_SYSTEM.md
                const appendCandidates = [
                    join(projectDir, ".pi", "APPEND_SYSTEM.md"),
                    join(agentDir, "APPEND_SYSTEM.md"),
                ];
                for (const c of appendCandidates) {
                    if (existsSync(c)) { discovered.push(c); break; }
                }
                contextFilesToShow = discovered;
            }
            if (contextFilesToShow.length > 0) {
                lines.push(heading(`  Context Files (${contextFilesToShow.length})`));
                lines.push("");
                for (const f of contextFilesToShow) {
                    const short = typeof f === "string" ? f.replace(/^.*\/(\.pi|agent)\//, "") : String(f);
                    lines.push(`    ${dim("📄")} ${value(short)}`);
                }
                lines.push("");
            }

            // Show in scrollable custom UI
            await ctx.ui.custom<void>((tui, theme, _kb, done) => {
                let scrollOffset = 0;
                // Cap viewHeight to terminal rows minus chrome (2 borders + 1 scroll indicator + 2 margin)
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

                        // Scroll indicator
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
        },
    });
}

// Re-export for backward compatibility (tests import from here)
export { formatTokens } from "../shared/format.ts";
