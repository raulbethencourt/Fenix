/**
 * Minimal subagents extension.
 *
 * Registers a single `subagent` tool with three agents: scout, researcher, worker.
 * Supports single and parallel execution. Output is verbal only (no file handoff).
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme, parseFrontmatter, truncateHead, withFileMutationQueue, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES } from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text, visibleWidth } from "@mariozechner/pi-tui";
import { Type } from "typebox";
import * as formatUtils from "../shared/format.ts";
import { extractTextContent } from "../shared/content.ts";
import { registerFallbackCommand } from "./fallback.ts";
import { resolveModel, resolveFallbackModel, loadRoutingConfig, type ComplexityTier } from "./routing.ts";
import { spawnPiProcess } from "./runner.ts";
import { initTelemetryDb, logRun, logToolCalls } from "./telemetry.ts";

// ── Types ──────────────────────────────────────────────────────────────

export interface AgentConfig {
	name: string;
	description: string;
	tools: string[];
	skills: string[];
	model: string;
	systemPrompt: string;
	filePath: string;
}

interface ToolEvent {
	tool: string;
	args: string;
}

export interface AgentProgress {
	agent: string;
	status: "pending" | "running" | "completed" | "failed";
	task: string;
	currentTool?: string;
	currentToolArgs?: string;
	recentTools: ToolEvent[];
	toolCount: number;
	tokens: number;
	durationMs: number;
	lastMessage: string;
	error?: string;
}

export interface AgentResult {
	agent: string;
	task: string;
	output: string;
	exitCode: number;
	progress: AgentProgress;
	model?: string;
	usedFallback?: boolean;
	usage: { input: number; output: number; cacheRead: number; cacheWrite: number; cost: number; turns: number };
}

interface Details {
	mode: "single" | "parallel";
	results: AgentResult[];
}

// ── Config ─────────────────────────────────────────────────────────────

interface ExtensionConfig {
	maxConcurrency?: number;
}

const EXT_DIR = path.dirname(new URL(import.meta.url).pathname);
const AGENTS_DIR = path.join(EXT_DIR, "agents");
const TOOLS_DIR = path.join(EXT_DIR, "tools");
const SKILLS_BASE = path.join(process.env.HOME || "~", ".pi", "agent", "skills");
const CONFIG_PATH = path.join(EXT_DIR, "config.json");
const DEFAULT_MAX_CONCURRENCY = 4;

function loadConfig(): ExtensionConfig {
	try {
		if (fs.existsSync(CONFIG_PATH)) {
			return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as ExtensionConfig;
		}
	} catch {}
	return {};
}

// Built-in tools that pi provides natively (no extension needed)
const BUILTIN_TOOLS = new Set(["read", "write", "edit", "bash", "grep", "find", "ls"]);

// Custom tools that require loading an extension into the subagent process
const EXT_BASE = path.join(process.env.HOME || "~", ".pi", "agent", "extensions");
// Resolve context-mode extension path from the global node_modules
function resolveContextModeExtension(): string | null {
	try {
		const entry = process.argv[1];
		if (entry) {
			const real = fs.realpathSync(entry);
			const marker = path.sep + "node_modules" + path.sep;
			const idx = real.indexOf(marker);
			if (idx !== -1) {
				const globalNodeModules = real.slice(0, idx + marker.length - 1);
				const candidate = path.join(globalNodeModules, "context-mode", "build", "pi-extension.js");
				if (fs.existsSync(candidate)) return candidate;
			}
		}
	} catch {}
	return null;
}

const CONTEXT_MODE_EXTENSION = resolveContextModeExtension();
const { routing: ROUTING_CONFIG, fallback: FALLBACK_CONFIG } = loadRoutingConfig(path.dirname(AGENTS_DIR));

const CUSTOM_TOOL_EXTENSIONS: Record<string, string> = {
	web_search: path.join(EXT_BASE, "web-search", "index.ts"),
	web_fetch: path.join(EXT_BASE, "web-fetch", "index.ts"),
	safe_bash: path.join(TOOLS_DIR, "safe-bash.ts"),
	ast_grep: path.join(TOOLS_DIR, "ast-grep.ts"),
	repo_map: path.join(TOOLS_DIR, "repo-map.ts"),
	workspace: path.join(TOOLS_DIR, "workspace.ts"),
	test_config: path.join(TOOLS_DIR, "test-config.ts"),
	repomix: path.join(TOOLS_DIR, "repomix.ts"),
	video_extract: path.join(EXT_BASE, "video-extract", "index.ts"),
	token_stats: path.join(TOOLS_DIR, "token-stats.ts"),
	git_inspect: path.join(TOOLS_DIR, "git-inspect.ts"),
	memory: path.join(EXT_BASE, "memory", "index.ts"),
	youtube_search: path.join(EXT_BASE, "youtube-search", "index.ts"),
	google_image_search: path.join(EXT_BASE, "google-image-search", "index.ts"),
};

// ── Agent Discovery & Registration ────────────────────────────────────

let agents: AgentConfig[] = [];

export function registerAgent(config: AgentConfig): void {
	if (agents.find((a) => a.name === config.name)) {
		throw new Error(`Agent already registered: ${config.name}`);
	}
	agents.push(config);
}

export function unregisterAgent(name: string): void {
	agents = agents.filter((a) => a.name !== name);
}

// Expose registration functions globally so other extensions loaded via jiti
// (which creates separate module instances) can access the shared agents array.
(globalThis as any).__pi_subagents = { registerAgent, unregisterAgent, getAgents: () => agents };

function loadAgents(): AgentConfig[] {
	const agents: AgentConfig[] = [];
	if (!fs.existsSync(AGENTS_DIR)) return agents;
	for (const entry of fs.readdirSync(AGENTS_DIR)) {
		if (!entry.endsWith(".md")) continue;
		const filePath = path.join(AGENTS_DIR, entry);
		const content = fs.readFileSync(filePath, "utf-8");
		const { frontmatter, body } = parseFrontmatter<Record<string, string>>(content);
		if (!frontmatter.name) continue;
		const tools = (frontmatter.tools || "")
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		const skills = (frontmatter.skills || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		agents.push({
			name: frontmatter.name,
			description: frontmatter.description || "",
			tools,
			skills,
			model: frontmatter.model || "anthropic/claude-sonnet-4-6",
			systemPrompt: body,
			filePath,
		});
	}
	return agents;
}

// ── Pi Binary Resolution ──────────────────────────────────────────────

function resolvePiBinary(): { command: string; baseArgs: string[] } {
	// Resolve the pi entry point from process.argv[1]
	const entry = process.argv[1];
	if (entry) {
		try {
			const realEntry = fs.realpathSync(entry);
			if (/\.(?:mjs|cjs|js)$/i.test(realEntry)) {
				return { command: process.execPath, baseArgs: [realEntry] };
			}
		} catch {}
	}
	return { command: "pi", baseArgs: [] };
}

// ── Formatting Utilities ──────────────────────────────────────────────

// Re-export for backward compatibility (tests import from here)
export { formatTokens } from "../shared/format.ts";

// Re-export for backward compatibility (tests import from here)
export { formatDuration } from "../shared/format.ts";

export function formatToolPreview(name: string, args: Record<string, unknown>): string {
	switch (name) {
		case "bash":
		case "safe_bash":
			return `$ ${((args.command as string) || "").slice(0, 80)}`;
		case "read":
			return `read ${(args.path as string) || ""}`;
		case "write":
			return `write ${(args.path as string) || ""}`;
		case "edit":
			return `edit ${(args.path as string) || ""}`;
		case "grep":
			return `grep ${(args.pattern as string) || ""}`;
		case "find":
			return `find ${(args.pattern as string) || ""}`;
		case "ls":
			return `ls ${(args.path as string) || "."}`;
		case "web_search":
			return `search "${(args.query as string) || ""}"`;
		case "web_fetch":
			return `fetch ${(args.url as string) || ""}`;
		case "ast_grep":
			return `sg ${(args.pattern as string) || (args.rule as string) || ""}`;
		case "repo_map":
			return `map ${(args.path as string) || "."}${(args.lang as string) ? ` [${args.lang}]` : ""}`;
		default: {
			const s = JSON.stringify(args);
			return `${name} ${s.slice(0, 60)}`;
		}
	}
}

export function truncLine(text: string, maxWidth: number): string {
	if (visibleWidth(text) <= maxWidth) return text;
	// Simple truncation - strip to fit
	let result = "";
	let width = 0;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		// Skip ANSI escape sequences
		if (ch === "\x1b") {
			const match = text.slice(i).match(/^\x1b\[[0-9;]*m/);
			if (match) {
				result += match[0];
				i += match[0].length - 1;
				continue;
			}
		}
		if (width >= maxWidth - 1) {
			return result + "…";
		}
		result += ch;
		width++;
	}
	return result;
}

// ── Subagent Execution ────────────────────────────────────────────────

// Quota exhaustion detection for auto-retry
function isQuotaExhausted(stderr: string, exitCode: number): boolean {
	if (exitCode === 429 || exitCode === 403) return true;
	const patterns = [
		/quota.*exhausted/i,
		/rate.*limit/i,
		/429/i,
		/too.*many.*requests/i,
		/billing.*quota/i,
		/insufficient.*quota/i,
		/monthly.*limit/i,
		/daily.*limit/i,
	];
	return patterns.some((p) => p.test(stderr));
}

async function buildPiArgs(
	agent: AgentConfig,
	task: string,
	cwd: string,
): Promise<{ piArgs: string[]; tempDir: string; tier: string; usedFallback: boolean }> {
	const piBin = resolvePiBinary();
	const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-sub-"));

	// Write system prompt to temp file
	const promptPath = path.join(tempDir, `${agent.name}.md`);
	await withFileMutationQueue(promptPath, async () => {
		await fs.promises.writeFile(promptPath, agent.systemPrompt, { encoding: "utf-8", mode: 0o600 });
	});

	const args = [...piBin.baseArgs, "--mode", "json", "-p", "--no-session"];

	// Load skills if specified, otherwise disable skill discovery
	if (agent.skills.length > 0) {
		for (const skillName of agent.skills) {
			const skillPath = path.join(SKILLS_BASE, skillName);
			if (fs.existsSync(path.join(skillPath, "SKILL.md"))) {
				args.push("--skill", skillPath);
			}
		}
	} else {
		args.push("--no-skills");
	}

	// Separate builtin tools from custom tools
	const builtinTools: string[] = [];
	const extensionPaths = new Set<string>();

	for (const tool of agent.tools) {
		if (BUILTIN_TOOLS.has(tool)) {
			builtinTools.push(tool);
		} else if (CUSTOM_TOOL_EXTENSIONS[tool]) {
			extensionPaths.add(CUSTOM_TOOL_EXTENSIONS[tool]);
		}
	}

	// Use --no-extensions then add only what we need
	args.push("--no-extensions");

	// Include custom tool names in the allowlist so extension-registered tools aren't blocked
	const customToolNames = Object.keys(CUSTOM_TOOL_EXTENSIONS).filter(t => agent.tools.includes(t));
	const allToolNames = [...builtinTools, ...customToolNames];
	if (allToolNames.length > 0) {
		args.push("--tools", allToolNames.join(","));
	} else {
		// No tools needed — disable defaults
		args.push("--no-tools");
	}

	for (const extPath of extensionPaths) {
		args.push("--extension", extPath);
	}

	// Always load context-mode extension for session tracking and routing if available
	if (CONTEXT_MODE_EXTENSION) {
		args.push("--extension", CONTEXT_MODE_EXTENSION);
	}

	const { model: routedModel, tier: complexityTier, usedFallback } = resolveModel(
		agent.model,
		agent.name,
		task,
		ROUTING_CONFIG,
		FALLBACK_CONFIG,
	);
	args.push("--models", routedModel);
	args.push("--append-system-prompt", promptPath);

	// Handle long tasks by writing to file
	const TASK_LIMIT = 8000;
	if (task.length > TASK_LIMIT) {
		const taskPath = path.join(tempDir, "task.md");
		await withFileMutationQueue(taskPath, async () => {
			await fs.promises.writeFile(taskPath, `Task: ${task}`, { encoding: "utf-8", mode: 0o600 });
		});
		args.push(`@${taskPath}`);
	} else {
		args.push(`Task: ${task}`);
	}

	return { piArgs: [piBin.command, ...args], tempDir, usedFallback, tier: complexityTier };
}

// Re-export for backward compatibility (tests import from here)
export { extractTextContent as extractTextFromContent } from "../shared/content.ts";

export function extractToolArgsPreview(args: Record<string, unknown>): string {
	if (args.command) return String(args.command).slice(0, 100);
	if (args.path) return String(args.path);
	if (args.query) return `"${String(args.query).slice(0, 80)}"`;
	if (args.url) return String(args.url);
	if (args.pattern) return String(args.pattern);
	const s = JSON.stringify(args);
	return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

async function runSubagent(
	agent: AgentConfig,
	task: string,
	cwd: string,
	signal: AbortSignal | undefined,
	onUpdate?: (progress: AgentProgress) => void,
): Promise<AgentResult> {
	const { piArgs, tempDir, usedFallback: initialUsedFallback, tier } = await buildPiArgs(agent, task, cwd);
	const command = piArgs[0];
	const spawnArgs = piArgs.slice(1);

	const result: AgentResult = {
		agent: agent.name,
		task,
		output: "",
		exitCode: 0,
		model: agent.model,
		usedFallback: initialUsedFallback,
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 },
		progress: {
			agent: agent.name,
			status: "running",
			task,
			recentTools: [],
			toolCount: 0,
			tokens: 0,
			durationMs: 0,
			lastMessage: "",
		},
	};

	const startTime = Date.now();
	const progress = result.progress;
	const fireUpdate = throttle(() => {
		progress.durationMs = Date.now() - startTime;
		onUpdate?.(progress);
	}, 150);

	try {
		const { exitCode, stderrBuf } = await spawnPiProcess({
			command,
			spawnArgs,
			cwd,
			signal,
			result,
			progress,
			startTime,
			fireUpdate,
			extractToolArgsPreview,
			extractTextContent,
		});

		result.exitCode = exitCode;

		if (exitCode !== 0 && !initialUsedFallback && isQuotaExhausted(stderrBuf, exitCode)) {
			const fallbackModel = resolveFallbackModel(tier as ComplexityTier, FALLBACK_CONFIG);
			const fallbackPiArgs = [...piArgs];
			const modelIdx = fallbackPiArgs.indexOf("--models");
			if (modelIdx !== -1) fallbackPiArgs[modelIdx + 1] = fallbackModel;

			progress.error = undefined;
			const { exitCode: retryExitCode } = await spawnPiProcess({
				command,
				spawnArgs: fallbackPiArgs.slice(1),
				cwd,
				signal,
				result,
				progress,
				startTime,
				fireUpdate,
				extractToolArgsPreview,
				extractTextContent,
			});

			result.exitCode = retryExitCode;
			result.model = fallbackModel;
			result.usedFallback = true;
			console.error(`[fallback] Quota exhausted, retried with ${fallbackModel}`);
		}
	} finally {
		try {
			fs.rmSync(tempDir, { recursive: true, force: true });
		} catch {}
	}

	progress.status = result.exitCode === 0 && !progress.error ? "completed" : "failed";
	progress.durationMs = Date.now() - startTime;
	if (progress.error) result.output = result.output || `Error: ${progress.error}`;

	// Truncate output if very large
	if (result.output.length > DEFAULT_MAX_BYTES) {
		const trunc = truncateHead(result.output, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });
		result.output = trunc.content;
		if (trunc.truncated) {
			result.output += "\n\n[Output truncated]";
		}
	}

	return result;
}

// ── Throttle ──────────────────────────────────────────────────────────

export function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
	let lastCall = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	return ((...args: any[]) => {
		const now = Date.now();
		const remaining = ms - (now - lastCall);
		if (remaining <= 0) {
			lastCall = now;
			if (timer) { clearTimeout(timer); timer = undefined; }
			fn(...args);
		} else if (!timer) {
			timer = setTimeout(() => {
				lastCall = Date.now();
				timer = undefined;
				fn(...args);
			}, remaining);
		}
	}) as T;
}

// ── Parallel Execution with Concurrency Limit ─────────────────────────

export async function mapConcurrent<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < items.length) {
			const i = nextIndex++;
			results[i] = await fn(items[i], i);
		}
	}

	const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
	await Promise.all(workers);
	return results;
}

// ── Rendering ─────────────────────────────────────────────────────────

type Theme = ExtensionContext["ui"]["theme"];

export function getTermWidth(): number {
	return process.stdout.columns || 120;
}

function renderAgentProgress(
	r: AgentResult,
	theme: Theme,
	expanded: boolean,
	w: number,
): Container {
	const c = new Container();
	const prog = r.progress;
	const isRunning = prog.status === "running";
	const isPending = prog.status === "pending";
	const isFailed = prog.status === "failed" || r.exitCode !== 0;
	const isDone = prog.status === "completed" && r.exitCode === 0;

	// ── Status icon ──
	const icon = isRunning
		? theme.fg("warning", "⟳")
		: isPending
			? theme.fg("dim", "○")
			: isDone
				? theme.fg("success", "✓")
				: theme.fg("error", "✗");

	// ── Progress bar ──
	const barWidth = 12;
	let progressBar = "";
	if (isRunning || isDone || isFailed) {
		// Estimate progress based on tool count (cap at 95% while running)
		const toolProgress = Math.min(prog.toolCount / Math.max(prog.toolCount + 2, 5), 0.95);
		const pct = isDone ? 1 : toolProgress;
		const filled = Math.round(pct * barWidth);
		const empty = barWidth - filled;
		const bar = "█".repeat(filled) + "░".repeat(empty);
		const color = isDone ? "success" : isFailed ? "error" : "warning";
		progressBar = theme.fg(color, bar);
	} else {
		progressBar = theme.fg("dim", "░".repeat(barWidth));
	}

	// ── Stats ──
	const stats: string[] = [];
	if (prog.toolCount) stats.push(`${prog.toolCount} tools`);
	if (prog.tokens) stats.push(`${formatUtils.formatTokens(prog.tokens)} tok`);
	stats.push(formatUtils.formatDuration(prog.durationMs));
	const statsStr = theme.fg("dim", stats.join(" · "));

	// ── Line 1: icon + bar + agent name + model + stats ──
	const modelShort = r.model ? r.model.split("/").pop() || "" : "";
	const line1 = `${icon} ${progressBar} ${theme.fg("toolTitle", theme.bold(r.agent))} ${theme.fg("dim", modelShort)} ${statsStr}`;
	c.addChild(new Text(truncLine(line1, w), 0, 0));

	// ── Line 2: current action or result summary ──
	if (isRunning && prog.currentTool) {
		const toolLine = prog.currentToolArgs
			? `${prog.currentTool}: ${prog.currentToolArgs}`
			: prog.currentTool;
		c.addChild(new Text(truncLine(`  ${theme.fg("warning", "▸")} ${theme.fg("text", toolLine)}`, w), 0, 0));
	} else if (isRunning && prog.lastMessage) {
		c.addChild(new Text(truncLine(`  ${theme.fg("dim", prog.lastMessage)}`, w), 0, 0));
	} else if (isPending) {
		c.addChild(new Text(`  ${theme.fg("dim", "waiting...")}`, 0, 0));
	} else if (isFailed && prog.error) {
		const errLine = prog.error.split("\n")[0].slice(0, 100);
		c.addChild(new Text(truncLine(`  ${theme.fg("error", errLine)}`, w), 0, 0));
	} else if (isDone) {
		// Show first line of output or last message
		const summary = prog.lastMessage || (r.output ? r.output.split("\n")[0].slice(0, 100) : "done");
		c.addChild(new Text(truncLine(`  ${theme.fg("success", summary)}`, w), 0, 0));
	}

	// ── Line 3 (collapsed): usage summary ──
	if (!expanded) {
		const usageParts: string[] = [];
		if (r.usage.turns) usageParts.push(`${r.usage.turns} turn${r.usage.turns > 1 ? "s" : ""}`);
		if (r.usage.cost) usageParts.push(`$${r.usage.cost.toFixed(4)}`);
		if (usageParts.length) {
			c.addChild(new Text(`  ${theme.fg("dim", usageParts.join(" · "))}`, 0, 0));
		}
	}

	// ── Expanded: full detail ──
	if (expanded) {
		c.addChild(new Spacer(1));

		// Task
		c.addChild(new Text(theme.fg("dim", `Task: ${r.task}`), 0, 0));
		c.addChild(new Spacer(1));

		// Recent tools
		if (prog.recentTools.length > 0) {
			for (const t of prog.recentTools) {
				c.addChild(new Text(truncLine(theme.fg("muted", `  ${t.tool}: ${t.args}`), w), 0, 0));
			}
			c.addChild(new Spacer(1));
		}

		// Full output
		if (!isRunning && r.output) {
			const mdTheme = getMarkdownTheme();
			c.addChild(new Markdown(r.output, 0, 0, mdTheme));
			c.addChild(new Spacer(1));
		}

		// Full usage breakdown
		const usageParts: string[] = [];
		if (r.usage.turns) usageParts.push(`${r.usage.turns} turn${r.usage.turns > 1 ? "s" : ""}`);
		if (r.usage.input) usageParts.push(`in:${formatUtils.formatTokens(r.usage.input)}`);
		if (r.usage.output) usageParts.push(`out:${formatUtils.formatTokens(r.usage.output)}`);
		if (r.usage.cacheRead) usageParts.push(`cR:${formatUtils.formatTokens(r.usage.cacheRead)}`);
		if (r.usage.cacheWrite) usageParts.push(`cW:${formatUtils.formatTokens(r.usage.cacheWrite)}`);
		if (r.usage.cost) usageParts.push(`$${r.usage.cost.toFixed(4)}`);
		if (usageParts.length) {
			c.addChild(new Text(theme.fg("dim", usageParts.join(" · ")), 0, 0));
		}
	}

	return c;
}

// ── Extension ─────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	registerFallbackCommand(pi);
	const config = loadConfig();
	const maxConcurrency = config.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
	agents = loadAgents();
	initTelemetryDb();
	const sessionId = `${process.pid}-${Date.now()}`;

	pi.registerTool({
		name: "subagent",
		label: "Subagent",
		description:
			`Run a subagent to complete a task. Subagents have NO context from the current conversation — include all necessary context in the task description.\n\nAvailable agents: ${agents.map((a) => `${a.name} — ${a.description}`).join("; ")}.`,
		promptSnippet: "Run subagents for delegated tasks",
		promptGuidelines: [
			"Parallel tool calls are your primary parallelism mechanism — put multiple independent read/fetch/search calls in one function_calls block. Don't use subagents to parallelize simple I/O.",
			"Use subagent to delegate *reasoning and decisions*: codebase exploration (scout), web research (researcher), or isolated code changes (worker)",
			"For multiple independent subagent tasks, use parallel mode with tasks[] array",
			"Subagents have NO context from the current conversation — include ALL necessary context in the task description",
		],
		parameters: Type.Object({
			agent: Type.Optional(
				Type.String({ description: `Name of the agent to invoke (SINGLE mode). Available: ${agents.map((a) => a.name).join(", ")}` }),
			),
			task: Type.Optional(Type.String({ description: "Task description (SINGLE mode)" })),
			tasks: Type.Optional(
				Type.Array(
					Type.Object({
						agent: Type.String({ description: `Name of the agent to invoke. Available: ${agents.map((a) => a.name).join(", ")}` }),
						task: Type.String({ description: "Task description" }),
						cwd: Type.Optional(Type.String({ description: "Working directory for the agent process" })),
					}),
					{ description: "PARALLEL mode: array of {agent, task} objects" },
				),
			),
			cwd: Type.Optional(Type.String({ description: "Working directory for the agent process (single mode)" })),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const cwd = ctx.cwd;

			// Validate mode
			if (params.tasks && params.tasks.length > 0) {
				// ── Parallel mode ──
				const taskList = params.tasks;

				// Validate all agents
				const available = agents.map((a) => a.name).join(", ") || "none";
				for (const t of taskList) {
					if (!agents.find((a) => a.name === t.agent)) {
						throw new Error(`Unknown agent: ${t.agent}. Available agents: ${available}`);
					}
				}

				const allResults: AgentResult[] = [];

				// Initialize all result slots as pending
				for (let i = 0; i < taskList.length; i++) {
					allResults[i] = {
						agent: taskList[i].agent,
						task: taskList[i].task,
						output: "",
						exitCode: -1,
						model: undefined,
						usedFallback: false,
						usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 },
						progress: { agent: taskList[i].agent, status: "pending" as any, task: taskList[i].task, recentTools: [], toolCount: 0, tokens: 0, durationMs: 0, lastMessage: "" },
					};
				}

				const flushParallelUpdate = () => {
					onUpdate?.({
						content: [{ type: "text", text: `Running ${taskList.length} tasks...` }],
						details: {
							mode: "parallel" as const,
							results: [...allResults],
						},
					});
				};
				const fireParallelUpdate = throttle(flushParallelUpdate, 150);

				const results = await mapConcurrent(taskList, maxConcurrency, async (t, idx) => {
					const agent = agents.find((a) => a.name === t.agent)!;
					const result = await runSubagent(agent, t.task, t.cwd ?? cwd, signal, (progress) => {
						allResults[idx].progress = progress;
						fireParallelUpdate();
					});

					// Update allResults with the completed result so the UI reflects it immediately
					allResults[idx] = result;
					flushParallelUpdate();
					const runId = logRun(result, t.cwd ?? cwd, sessionId);
					const toolMap = new Map<string, number>();
					for (const t of result.progress.recentTools) {
						toolMap.set(t.tool, (toolMap.get(t.tool) || 0) + 1);
					}
					if (toolMap.size > 0 && runId != null) {
						logToolCalls(runId, [...toolMap.entries()].map(([tool, count]) => ({ tool, count })));
					}

					return result;
				});

				// Build final output text
				const outputParts = results.map((r) => {
					const header = `## ${r.agent}${r.exitCode !== 0 ? " (FAILED)" : ""}`;
					return `${header}\n\n${r.output || "(no output)"}`;
				});

				return {
					content: [{ type: "text", text: outputParts.join("\n\n---\n\n") }],
					details: { mode: "parallel" as const, results },
				};
			} else if (params.agent && params.task) {
				// ── Single mode ──
				const agent = agents.find((a) => a.name === params.agent);
				if (!agent) {
					const available = agents.map((a) => a.name).join(", ") || "none";
					throw new Error(`Unknown agent: ${params.agent}. Available agents: ${available}`);
				}

				const liveResult: AgentResult = {
					agent: params.agent!,
					task: params.task!,
					output: "",
					exitCode: -1,
					model: agent.model,
					usedFallback: false,
					usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 },
					progress: { agent: params.agent!, status: "running" as const, task: params.task!, recentTools: [], toolCount: 0, tokens: 0, durationMs: 0, lastMessage: "" },
				};
				const result = await runSubagent(agent, params.task, params.cwd ?? cwd, signal, (progress) => {
					liveResult.progress = progress;
					onUpdate?.({
						content: [{ type: "text", text: "(running...)" }],
						details: { mode: "single" as const, results: [liveResult] },
					});
				});
				const runId = logRun(result, params.cwd ?? cwd, sessionId);
				const toolMap = new Map<string, number>();
				for (const t of result.progress.recentTools) {
					toolMap.set(t.tool, (toolMap.get(t.tool) || 0) + 1);
				}
				if (toolMap.size > 0 && runId != null) {
					logToolCalls(runId, [...toolMap.entries()].map(([tool, count]) => ({ tool, count })));
				}

				const isError = result.exitCode !== 0 || !!result.progress.error;
				return {
					content: [{ type: "text", text: result.output || "(no output)" }],
					details: { mode: "single" as const, results: [result] },
					...(isError ? { isError: true } : {}),
				};
			} else {
				throw new Error("Provide either (agent + task) for single mode, or tasks[] for parallel mode.");
			}
		},

		// ── Render: tool call header ──
		renderCall(args, theme, _context) {
			if (args.tasks && args.tasks.length > 0) {
				const agentNames = args.tasks.map((t: any) => t.agent).join(", ");
				return new Text(
					`${theme.fg("toolTitle", theme.bold("subagent"))} ${theme.fg("accent", "parallel")} ${theme.fg("dim", `(${args.tasks.length} tasks: ${agentNames})`)}`,
					0, 0,
				);
			}
			if (args.agent) {
				const taskPreview = args.task
					? (args.task.length > 60 ? args.task.slice(0, 60) + "…" : args.task).replace(/\n/g, " ")
					: "";
				return new Text(
					`${theme.fg("toolTitle", theme.bold("subagent"))} ${theme.fg("accent", args.agent)} ${theme.fg("dim", taskPreview)}`,
					0, 0,
				);
			}
			return new Text(theme.fg("toolTitle", theme.bold("subagent")), 0, 0);
		},

		// ── Render: result ──
		renderResult(result, options, theme, context) {
			const details = result.details as Details | undefined;
			if (!details?.results?.length) {
				const t = result.content[0];
				const text = t?.type === "text" ? t.text : "(no output)";
				return new Text(text.slice(0, 200), 0, 0);
			}

			const w = getTermWidth() - 4;
			const expanded = options.expanded;
			const c = new Container();

			if (details.mode === "parallel") {
				// Parallel summary header
				const ok = details.results.filter((r) => r.exitCode === 0).length;
				const running = details.results.filter((r) => r.progress?.status === "running").length;
				const totalIcon = running > 0
					? theme.fg("warning", "⟳")
					: ok === details.results.length
						? theme.fg("success", "✓")
						: theme.fg("error", "✗");

				const totalDuration = Math.max(...details.results.map((r) => r.progress?.durationMs || 0));
				const totalTokens = details.results.reduce((s, r) => s + (r.progress?.tokens || 0), 0);
				c.addChild(
					new Text(
						truncLine(
							`${totalIcon} ${theme.fg("toolTitle", theme.bold("parallel"))} ${ok}/${details.results.length} completed · ${formatUtils.formatTokens(totalTokens)} tok · ${formatUtils.formatDuration(totalDuration)}`,
							w,
						),
						0, 0,
					),
				);
				c.addChild(new Spacer(1));

				for (let i = 0; i < details.results.length; i++) {
					const r = details.results[i];
					c.addChild(renderAgentProgress(r, theme, expanded, w));
					if (i < details.results.length - 1) c.addChild(new Spacer(1));
				}
			} else {
				// Single agent
				const r = details.results[0];
				c.addChild(renderAgentProgress(r, theme, expanded, w));
			}

			return c;
		},
	});
}
