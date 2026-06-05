/**
 * Shared subprocess execution helper for pi subagent processes.
 */
import { spawn } from "node:child_process";
import type { AgentResult, AgentProgress } from "./index.ts";

const RATE_LIMIT_PATTERNS = [
	/\b429\b/i,
	/rate[ -]?limit(?:ed|ing)?/i,
	/quota(?:\s+|[-_])exceeded/i,
	/exhausted\s+quota/i,
	/insufficient\s+quota/i,
	/too\s+many\s+requests/i,
	/billing\s+quota/i,
	/monthly\s+limit/i,
	/daily\s+limit/i,
];

const RETRYING_PATTERNS = [
	/retrying/i,
	/retry\s+attempt/i,
	/will\s+retry/i,
	/back(?:ing)?\s+off/i,
	/after\s+retry/i,
];

export function detectRetryState(stderr: string): AgentProgress["retryState"] {
	if (!stderr.trim()) return undefined;
	if (RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(stderr))) return "rate-limited";
	if (RETRYING_PATTERNS.some((pattern) => pattern.test(stderr))) return "retrying";
	return undefined;
}

export function hasRateLimitSignal(stderr: string, exitCode?: number): boolean {
	if (exitCode === 429 || exitCode === 403) return true;
	return detectRetryState(stderr) === "rate-limited";
}

export async function spawnPiProcess(opts: {
	command: string;
	spawnArgs: string[];
	cwd: string;
	signal: AbortSignal | undefined;
	result: AgentResult;
	progress: AgentProgress;
	startTime: number;
	fireUpdate: () => void;
	extractToolArgsPreview: (args: Record<string, unknown>) => string;
	extractTextContent: (content: unknown) => string;
}): Promise<{ exitCode: number; stderrBuf: string }> {
	const { command, spawnArgs, cwd, signal, result, progress, startTime, fireUpdate, extractToolArgsPreview, extractTextContent } = opts;

	let stderrBuf = "";

	const exitCode = await new Promise<number>((resolve) => {
		const proc = spawn(command, spawnArgs, {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let buf = "";

		const processLine = (line: string) => {
			if (!line.trim()) return;
			try {
				const evt = JSON.parse(line) as any;
				progress.durationMs = Date.now() - startTime;

				if (evt.type === "tool_execution_start") {
					progress.toolCount++;
					progress.currentTool = evt.toolName;
					progress.currentToolArgs = extractToolArgsPreview((evt.args || {}) as Record<string, unknown>);
					fireUpdate();
				}
				if (evt.type === "tool_execution_end") {
					if (progress.currentTool) {
						progress.recentTools.push({ tool: progress.currentTool, args: progress.currentToolArgs || "" });
						if (progress.recentTools.length > 20) progress.recentTools.splice(0, progress.recentTools.length - 20);
					}
					progress.currentTool = undefined;
					progress.currentToolArgs = undefined;
					fireUpdate();
				}
				if (evt.type === "tool_result_end") {
					fireUpdate();
				}
				if (evt.type === "message_end" && evt.message) {
					if (evt.message.role === "assistant") {
						result.usage.turns++;
						const u = evt.message.usage;
						if (u) {
							result.usage.input += u.input || 0;
							result.usage.output += u.output || 0;
							result.usage.cacheRead += u.cacheRead || 0;
							result.usage.cacheWrite += u.cacheWrite || 0;
							result.usage.cost += u.cost?.total || 0;
							progress.tokens = result.usage.input + result.usage.output;
						}
						if (evt.message.model) result.model = evt.message.model;
						if (evt.message.errorMessage) progress.error = evt.message.errorMessage;
						const text = extractTextContent(evt.message.content);
						if (text) {
							result.output = text;
							const proseLines: string[] = [];
							let inCodeBlock = false;
							for (const line of text.split("\n")) {
								if (line.trimStart().startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
								if (!inCodeBlock && line.trim()) proseLines.push(line.trim());
							}
							if (proseLines.length > 0) progress.lastMessage = proseLines.slice(0, 3).join(" ");
						}
					}
					fireUpdate();
				}
			} catch {
				// Non-JSON lines expected
			}
		};

		proc.stdout.on("data", (d: Buffer) => {
			buf += d.toString();
			const lines = buf.split("\n");
			buf = lines.pop() || "";
			lines.forEach(processLine);
		});

		proc.stderr.on("data", (d: Buffer) => {
			const chunk = d.toString();
			stderrBuf += chunk;
			const retryState = detectRetryState(stderrBuf);
			if (retryState && retryState !== progress.retryState) {
				progress.retryState = retryState;
				fireUpdate();
			}
		});

		proc.on("close", (code) => {
			if (buf.trim()) processLine(buf);
			if (code !== 0 && stderrBuf.trim() && !progress.error) {
				progress.error = stderrBuf.trim();
			}
			resolve(code ?? 1);
		});

		proc.on("error", () => resolve(1));

		if (signal) {
			const kill = () => {
				proc.kill("SIGTERM");
				setTimeout(() => !proc.killed && proc.kill("SIGKILL"), 3000);
			};
			if (signal.aborted) kill();
			else signal.addEventListener("abort", kill, { once: true });
		}
	});

	return { exitCode, stderrBuf };
}
