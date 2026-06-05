import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const RUNS_DIR = path.join(os.homedir(), ".pi", "runs");
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 7;

let cleanupAttempted = false;

export interface TranscriptHandle {
	logPath: string;
	startedAt: Date;
	wroteOutput: boolean;
	closed: boolean;
}

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

export function formatDateStamp(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTimeStamp(date: Date): string {
	return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function formatDateTime(date: Date): string {
	return `${formatDateStamp(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeInline(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

function formatArgValue(value: unknown): string {
	if (value == null) return String(value);
	if (typeof value === "string") return normalizeInline(value);
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (Array.isArray(value)) return value.map(formatArgValue).join(", ");
	try {
		return normalizeInline(JSON.stringify(value));
	} catch {
		return String(value);
	}
}

function formatToolArgs(args: Record<string, unknown>): string {
	const entries = Object.entries(args);
	if (entries.length === 0) return "";
	return entries.map(([key, value]) => `${key}: ${formatArgValue(value)}`).join(", ");
}

function formatTranscriptDuration(durationMs: number): string {
	if (durationMs < 1000) return `${durationMs}ms`;
	if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1).replace(/\.0$/, "")}s`;
	return `${(durationMs / 60_000).toFixed(1).replace(/\.0$/, "")}m`;
}

function formatTokens(tokens: number): string {
	return new Intl.NumberFormat("en-US").format(tokens);
}

function formatCost(cost: number): string {
	return `$${cost.toFixed(4)}`;
}

function safeUnlink(pathToRemove: string): void {
	try {
		fs.rmSync(pathToRemove, { recursive: true, force: true });
	} catch {}
}

export function cleanupOldRunDirs(now = new Date()): void {
	if (!fs.existsSync(RUNS_DIR)) return;
	const cutoffMs = now.getTime() - RETENTION_DAYS * DAY_MS;
	for (const entry of fs.readdirSync(RUNS_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const entryPath = path.join(RUNS_DIR, entry.name);
		const parsed = /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
			? new Date(`${entry.name}T00:00:00`)
			: new Date(Number.NaN);
		const ageMs = Number.isNaN(parsed.getTime())
			? (() => {
				try {
					return fs.statSync(entryPath).mtimeMs;
				} catch {
					return Number.POSITIVE_INFINITY;
				}
			})()
			: parsed.getTime();
		if (ageMs < cutoffMs) {
			safeUnlink(entryPath);
		}
	}
}

function ensureCleanup(now: Date): void {
	if (cleanupAttempted) return;
	cleanupAttempted = true;
	cleanupOldRunDirs(now);
}

function append(handle: TranscriptHandle, content: string): void {
	if (handle.closed) return;
	fs.appendFileSync(handle.logPath, content, { encoding: "utf-8" });
}

function writeLine(handle: TranscriptHandle, text = ""): void {
	append(handle, `${text}\n`);
}

export function openTranscript(agent: string, task: string, model: string, now = new Date()): TranscriptHandle {
	ensureCleanup(now);

	const dateDir = path.join(RUNS_DIR, formatDateStamp(now));
	fs.mkdirSync(dateDir, { recursive: true });

	const safeAgent = agent.replace(/[^a-z0-9._-]+/gi, "-");
	const logPath = path.join(dateDir, `${safeAgent}-${formatTimeStamp(now)}.md`);
	fs.writeFileSync(logPath, "", { encoding: "utf-8", mode: 0o600 });

	const handle: TranscriptHandle = {
		logPath,
		startedAt: now,
		wroteOutput: false,
		closed: false,
	};

	writeLine(handle, `# Subagent: ${agent}`);
	writeLine(handle, `**Model:** ${model}  `);
	writeLine(handle, `**Task:** ${normalizeInline(task)}  `);
	writeLine(handle, `**Started:** ${formatDateTime(now)}`);
	writeLine(handle);
	writeLine(handle, "---");
	writeLine(handle);
	writeLine(handle, "## Tool Calls");
	writeLine(handle);

	return handle;
}

export function writeToolEvent(handle: TranscriptHandle, tool: string, args: Record<string, unknown> | string): void {
	if (handle.closed) return;
	const body = typeof args === "string"
		? normalizeInline(args)
		: formatToolArgs(args);
	writeLine(handle, body ? `- \`${tool}\` — ${body}` : `- \`${tool}\``);
}

export function writeOutput(handle: TranscriptHandle, text: string): void {
	if (handle.closed || handle.wroteOutput) return;
	handle.wroteOutput = true;
	writeLine(handle);
	writeLine(handle, "---");
	writeLine(handle);
	writeLine(handle, "## Output");
	writeLine(handle);
	append(handle, `${text || "(no output)"}\n`);
}

export function closeTranscript(
	handle: TranscriptHandle,
	status: string,
	tokens: number,
	durationMs: number,
	cost = 0,
): string {
	if (handle.closed) return handle.logPath;
	if (!handle.wroteOutput) {
		writeOutput(handle, "(no output)");
	}
	writeLine(handle);
	writeLine(handle, "---");
	writeLine(handle);
	writeLine(handle, "## Summary");
	writeLine(handle, `**Status:** ${status}  `);
	writeLine(handle, `**Tokens:** ${formatTokens(tokens)}  `);
	writeLine(handle, `**Cost:** ${formatCost(cost)}  `);
	writeLine(handle, `**Duration:** ${formatTranscriptDuration(durationMs)}  `);
	handle.closed = true;
	return handle.logPath;
}

export function displayTranscriptPath(logPath: string): string {
	const home = os.homedir();
	return logPath.startsWith(home) ? `~${logPath.slice(home.length)}` : logPath;
}

export function dim(text: string): string {
	return process.stderr.isTTY ? `\u001b[2m${text}\u001b[0m` : text;
}
