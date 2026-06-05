/**
 * Context Info Extension
 *
 * Provides a /context command that displays comprehensive session information:
 * context window usage, token breakdown, tools, skills, extensions, and commands.
 *
 * Inspired by Claude Code's /context command.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey, Key, truncateToWidth } from "@mariozechner/pi-tui";
import { formatTokens } from "../shared/format.ts";

interface SkillInfo {
    name: string;
    description?: string;
    path?: string;
}

interface ToolInfo {
    name?: string;
    description?: string;
    parameters?: unknown;
}

interface BranchEntryInfo {
    type?: string;
    message?: any;
    summary?: string;
    content?: unknown;
}

interface CompactionSettingsInfo {
    enabled?: boolean;
    reserveTokens?: number;
}

interface ModelInfo {
    provider?: string;
    id?: string;
    name?: string;
    contextWindow?: number;
}

interface TokenBreakdownCategory {
    id: "systemPrompt" | "systemTools" | "skills" | "messages" | "buffer" | "free";
    label: string;
    tokens: number;
    color: string;
    glyph: string;
}

interface TokenBreakdown {
    model?: ModelInfo | null;
    contextWindow: number;
    categories: TokenBreakdownCategory[];
    systemPromptTokens: number;
    systemToolTokens: number;
    skillTokens: number;
    messageTokens: number;
    autoCompactBufferTokens: number;
    bufferTokens: number;
    usedTokens: number;
    freeTokens: number;
}

interface ComputeTokenBreakdownOptions {
    model?: ModelInfo | null;
    contextWindow?: number;
    usedTokens?: number | null;
    systemPrompt?: string;
    tools?: ToolInfo[];
    skills?: SkillInfo[];
    branchEntries?: BranchEntryInfo[];
    compaction?: CompactionSettingsInfo | null;
    includeVisualCategories?: boolean;
}

interface ThemeLike {
    fg: (color: string, text: string) => string;
    bold?: (text: string) => string;
}

interface CellSpec {
    glyph: string;
    color: string;
}

const DEFAULT_AUTO_COMPACT_BUFFER_TOKENS = 16_384;
const ESTIMATED_IMAGE_CHARS = 4_800;

const GRID_COLS = 20;
const GRID_ROWS = 10;
const GRID_CELLS = GRID_COLS * GRID_ROWS;
const GRID_GUTTER = "   ";

const CELL_FILLED = "⛁";
const CELL_FILLED_MESSAGES = "⛃";
const CELL_FREE = "⛶";
const CELL_BUFFER = "⛝";

function safeJsonStringify(value: unknown): string {
    try {
        return JSON.stringify(value) ?? "";
    } catch {
        return "";
    }
}

function estimateTextTokens(text?: string): number {
    return text ? Math.ceil(text.length / 4) : 0;
}

function estimateContentTokens(content: unknown): number {
    if (typeof content === "string") {
        return estimateTextTokens(content);
    }
    if (!Array.isArray(content)) {
        return estimateTextTokens(typeof content === "undefined" ? "" : safeJsonStringify(content));
    }

    let chars = 0;
    for (const block of content) {
        if (!block || typeof block !== "object") continue;
        const item = block as any;
        if (item.type === "text") {
            chars += String(item.text ?? "").length;
        } else if (item.type === "thinking") {
            chars += String(item.thinking ?? "").length;
        } else if (item.type === "toolCall") {
            chars += String(item.name ?? "").length + safeJsonStringify(item.arguments).length;
        } else if (item.type === "image") {
            chars += ESTIMATED_IMAGE_CHARS;
        } else if (typeof item.text === "string") {
            chars += item.text.length;
        } else {
            chars += safeJsonStringify(item).length;
        }
    }

    return Math.ceil(chars / 4);
}

function estimateMessageTokens(message: any): number {
    if (!message || typeof message !== "object") return 0;

    switch (message.role) {
        case "user":
            return estimateContentTokens(message.content);
        case "assistant":
            return estimateContentTokens(message.content);
        case "toolResult":
        case "custom":
            return estimateContentTokens(message.content);
        case "bashExecution":
            return estimateTextTokens(String(message.command ?? "") + String(message.output ?? ""));
        case "branchSummary":
        case "compactionSummary":
            return estimateTextTokens(String(message.summary ?? ""));
        default:
            return estimateContentTokens((message as any).content ?? safeJsonStringify(message));
    }
}

function estimateBranchEntryTokens(entry: BranchEntryInfo): number {
    switch (entry.type) {
        case "message":
            return estimateMessageTokens(entry.message);
        case "branch_summary":
        case "compaction":
            return estimateTextTokens(entry.summary ?? "");
        case "custom_message":
            return estimateContentTokens(entry.content);
        default:
            return 0;
    }
}

function estimateToolTokens(tools: ToolInfo[] = []): number {
    return tools.reduce((total, tool) => {
        const schema = safeJsonStringify(tool.parameters ?? {});
        return total + estimateTextTokens(`${tool.name ?? ""}${tool.description ?? ""}${schema}${" ".repeat(100)}`);
    }, 0);
}

function estimateSkillTokens(skills: SkillInfo[] = []): number {
    return skills.reduce((total, skill) => total + estimateTextTokens(`${skill.name} ${skill.description ?? ""}`.trim()), 0);
}

function fitCategoryTotals(values: number[], maxTotal: number): number[] {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= maxTotal) return values;
    if (maxTotal <= 0) return values.map(() => 0);

    const scaled = values.map((value) => Math.floor((value * maxTotal) / total));
    let remainder = maxTotal - scaled.reduce((sum, value) => sum + value, 0);
    const order = values
        .map((value, index) => ({
            index,
            fraction: (value * maxTotal) / total - scaled[index],
        }))
        .sort((a, b) => b.fraction - a.fraction);

    for (const { index } of order) {
        if (remainder <= 0) break;
        scaled[index]++;
        remainder--;
    }

    return scaled;
}

function resolveBufferTokens(
    contextWindow: number,
    usedTokens: number,
    compaction?: CompactionSettingsInfo | null,
): number {
    if (contextWindow <= 0 || !compaction || compaction.enabled === false) return 0;
    const reserveTokens = typeof compaction.reserveTokens === "number"
        ? compaction.reserveTokens
        : DEFAULT_AUTO_COMPACT_BUFFER_TOKENS;
    return Math.max(0, Math.min(reserveTokens, contextWindow - usedTokens));
}

function formatTokenCount(n: number): string {
    return Math.max(0, Math.round(n)).toLocaleString("en-US");
}

function percentString(part: number, whole: number, fractionDigits = 1): string {
    if (whole <= 0) return "0%";
    const pct = (part / whole) * 100;
    if (pct > 0 && pct < 0.05) return "<0.1%";
    return `${pct.toFixed(fractionDigits)}%`;
}

function applyThemeColor(theme: ThemeLike, color: string, text: string, fallback = "text"): string {
    try {
        return theme.fg(color, text);
    } catch {
        if (color !== fallback) {
            try {
                return theme.fg(fallback, text);
            } catch {
                return text;
            }
        }
        return text;
    }
}

function buildBreakdownCategories(
    systemPromptTokens: number,
    systemToolTokens: number,
    skillTokens: number,
    messageTokens: number,
    autoCompactBufferTokens: number,
    freeTokens: number,
    includeVisualCategories = false,
): TokenBreakdownCategory[] {
    const categories: TokenBreakdownCategory[] = [
        { id: "systemPrompt", label: "System prompt", tokens: systemPromptTokens, color: "accent", glyph: CELL_FILLED },
        { id: "systemTools", label: "System tools", tokens: systemToolTokens, color: "warning", glyph: CELL_FILLED },
        { id: "skills", label: "Skills", tokens: skillTokens, color: "success", glyph: CELL_FILLED },
        {
            id: "messages",
            label: "Messages",
            tokens: messageTokens,
            color: includeVisualCategories ? "text" : "userMessageText",
            glyph: CELL_FILLED_MESSAGES,
        },
    ];

    if (includeVisualCategories) {
        categories.push(
            { id: "buffer", label: "Buffer", tokens: autoCompactBufferTokens, color: "warning", glyph: CELL_BUFFER },
            { id: "free", label: "Free", tokens: freeTokens, color: "dim", glyph: CELL_FREE },
        );
    }

    return categories;
}

function getVisualCategories(breakdown: TokenBreakdown): TokenBreakdownCategory[] {
    const categories = breakdown.categories.map((category) =>
        category.id === "messages" ? { ...category, color: "text" } : category
    );

    const hasBuffer = categories.some((category) => category.id === "buffer");
    const hasFree = categories.some((category) => category.id === "free");

    if (!hasBuffer) {
        categories.push({
            id: "buffer",
            label: "Buffer",
            tokens: breakdown.autoCompactBufferTokens,
            color: "warning",
            glyph: CELL_BUFFER,
        });
    }
    if (!hasFree) {
        categories.push({
            id: "free",
            label: "Free",
            tokens: breakdown.freeTokens,
            color: "dim",
            glyph: CELL_FREE,
        });
    }

    return categories;
}

function planCells(breakdown: TokenBreakdown): CellSpec[] {
    const cells: CellSpec[] = [];
    const window = breakdown.contextWindow;

    if (window <= 0) {
        for (let i = 0; i < GRID_CELLS; i++) {
            cells.push({ glyph: CELL_FREE, color: "dim" });
        }
        return cells;
    }

    const categories = getVisualCategories(breakdown);
    const bufferCategory = categories.find((category) => category.id === "buffer")
        ?? { id: "buffer", label: "Buffer", tokens: 0, color: "warning", glyph: CELL_BUFFER };
    const freeCategory = categories.find((category) => category.id === "free")
        ?? { id: "free", label: "Free", tokens: 0, color: "dim", glyph: CELL_FREE };
    const filledCategories = categories.filter((category) => category.id !== "buffer" && category.id !== "free");

    const tokensPerCell = window / GRID_CELLS;
    const ratioCells = (tokens: number): number => {
        if (tokens <= 0) return 0;
        return Math.max(1, Math.round(tokens / tokensPerCell));
    };

    const categoryCounts = filledCategories.map((category) => ({
        category,
        count: ratioCells(category.tokens),
    }));

    let bufferCount = ratioCells(bufferCategory.tokens);
    let usedCount = categoryCounts.reduce((sum, entry) => sum + entry.count, 0);

    const maxUsable = GRID_CELLS - bufferCount;
    if (usedCount > maxUsable) {
        let overflow = usedCount - maxUsable;
        const order = [...categoryCounts].sort((a, b) => b.count - a.count);
        for (const entry of order) {
            while (overflow > 0 && entry.count > 1) {
                entry.count--;
                overflow--;
            }
        }
        usedCount = categoryCounts.reduce((sum, entry) => sum + entry.count, 0);
        if (usedCount + bufferCount > GRID_CELLS) {
            bufferCount = Math.max(0, GRID_CELLS - usedCount);
        }
    }

    for (const { category, count } of categoryCounts) {
        for (let i = 0; i < count; i++) {
            cells.push({ glyph: category.glyph, color: category.color });
        }
    }

    const freeCount = Math.max(0, GRID_CELLS - cells.length - bufferCount);
    for (let i = 0; i < freeCount; i++) {
        cells.push({ glyph: freeCategory.glyph, color: freeCategory.color });
    }
    for (let i = 0; i < bufferCount; i++) {
        cells.push({ glyph: bufferCategory.glyph, color: bufferCategory.color });
    }

    while (cells.length < GRID_CELLS) {
        cells.push({ glyph: freeCategory.glyph, color: freeCategory.color });
    }

    return cells.slice(0, GRID_CELLS);
}

function buildLegendLines(breakdown: TokenBreakdown, theme: ThemeLike): string[] {
    const lines: string[] = [];
    const bold = theme.bold ?? ((text: string) => text);
    const { model, contextWindow, usedTokens } = breakdown;
    const categories = getVisualCategories(breakdown);

    const modelRef = [model?.provider, model?.id].filter(Boolean).join("/") || model?.id || "unknown";
    const modelName = model?.name ?? modelRef ?? "no model";
    const windowLabel = formatTokenCount(contextWindow);

    lines.push(`${bold(modelName)}${applyThemeColor(theme, "dim", ` (${windowLabel} context)`)}`);
    lines.push(applyThemeColor(theme, "muted", `${modelRef}[${windowLabel}]`));
    lines.push(
        `${bold(formatTokenCount(usedTokens))}${applyThemeColor(theme, "dim", `/${windowLabel} tokens`)}`
        + applyThemeColor(theme, "muted", ` (${percentString(usedTokens, contextWindow)})`),
    );
    lines.push("");
    lines.push(applyThemeColor(theme, "muted", "Estimated usage by category"));

    for (const category of categories) {
        const dot = applyThemeColor(theme, category.color, category.glyph, "text");
        lines.push(
            `${dot} ${category.label}: ${bold(formatTokenCount(category.tokens))} `
            + applyThemeColor(theme, "dim", `tokens (${percentString(category.tokens, contextWindow)})`),
        );
    }

    return lines;
}

export function renderContextUsage(breakdown: TokenBreakdown, theme: ThemeLike): string {
    if (breakdown.contextWindow <= 0) {
        return applyThemeColor(theme, "muted", "Context usage is unavailable: no model is selected for this session.");
    }

    const cells = planCells(breakdown);
    const legend = buildLegendLines(breakdown, theme);
    const totalLines = Math.max(GRID_ROWS, legend.length);
    const lines: string[] = [];

    for (let row = 0; row < totalLines; row++) {
        let gridSegment = "";
        if (row < GRID_ROWS) {
            const rowCells: string[] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                const cell = cells[row * GRID_COLS + col];
                rowCells.push(applyThemeColor(theme, cell.color, cell.glyph, "text"));
            }
            gridSegment = rowCells.join(" ");
        } else {
            gridSegment = " ".repeat(GRID_COLS * 2 - 1);
        }

        const legendSegment = legend[row] ?? "";
        lines.push(legendSegment ? `${gridSegment}${GRID_GUTTER}${legendSegment}` : gridSegment);
    }

    return lines.join("\n");
}

export function computeTokenBreakdown(options: ComputeTokenBreakdownOptions): TokenBreakdown {
    const contextWindow = Math.max(0, options.contextWindow ?? options.model?.contextWindow ?? 0);
    const skillTokens = estimateSkillTokens(options.skills);
    let systemPromptTokens = Math.max(0, estimateTextTokens(options.systemPrompt ?? "") - skillTokens);
    let systemToolTokens = estimateToolTokens(options.tools);

    let messageTokens: number;
    let usedTokens: number;
    let resolvedSkillTokens = skillTokens;

    if (typeof options.usedTokens === "number" && Number.isFinite(options.usedTokens)) {
        const fitted = fitCategoryTotals([systemPromptTokens, systemToolTokens, skillTokens], Math.max(0, options.usedTokens));
        [systemPromptTokens, systemToolTokens] = fitted;
        resolvedSkillTokens = fitted[2] ?? 0;
        messageTokens = Math.max(0, Math.round(options.usedTokens) - (fitted[0] + fitted[1] + resolvedSkillTokens));
        usedTokens = fitted[0] + fitted[1] + resolvedSkillTokens + messageTokens;
    } else {
        messageTokens = (options.branchEntries ?? []).reduce((sum, entry) => sum + estimateBranchEntryTokens(entry), 0);
        usedTokens = systemPromptTokens + systemToolTokens + resolvedSkillTokens + messageTokens;
    }

    const autoCompactBufferTokens = resolveBufferTokens(contextWindow, usedTokens, options.compaction);
    const freeTokens = Math.max(0, contextWindow - usedTokens - autoCompactBufferTokens);

    return {
        model: options.model ?? null,
        contextWindow,
        categories: buildBreakdownCategories(
            systemPromptTokens,
            systemToolTokens,
            resolvedSkillTokens,
            messageTokens,
            autoCompactBufferTokens,
            freeTokens,
            options.includeVisualCategories === true,
        ),
        systemPromptTokens,
        systemToolTokens,
        skillTokens: resolvedSkillTokens,
        messageTokens,
        autoCompactBufferTokens,
        bufferTokens: autoCompactBufferTokens,
        usedTokens,
        freeTokens,
    };
}

function getCompactionSettings(ctx: any): CompactionSettingsInfo | null {
    return ctx?.settingsManager?.getCompactionSettings?.()
        ?? ctx?.session?.settingsManager?.getCompactionSettings?.()
        ?? ctx?.agentSession?.settingsManager?.getCompactionSettings?.()
        ?? null;
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
            const tokenBreakdown = computeTokenBreakdown({
                model,
                contextWindow: usage?.contextWindow ?? model?.contextWindow ?? 0,
                usedTokens: typeof usage?.tokens === "number" ? usage.tokens : null,
                systemPrompt: ctx.getSystemPrompt(),
                tools: allTools,
                skills: cachedSkills,
                branchEntries: ctx.sessionManager.getBranch() as BranchEntryInfo[],
                compaction: getCompactionSettings(ctx),
                includeVisualCategories: true,
            });

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
            const dim = (text: string) => theme.fg("dim", text);

            // ── Context Usage ──
            lines.push(heading("  Context Usage"));
            lines.push("");
            for (const line of renderContextUsage(tokenBreakdown, theme).split("\n")) {
                lines.push(line ? `  ${line}` : "");
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
