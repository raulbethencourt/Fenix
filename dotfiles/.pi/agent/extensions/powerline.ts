/**
 * Starship-style prompt extension for pi.
 *
 * Layout:
 *   basedir  model  [think:level]  [⎇ branch !?✓]       ctx%
 *   ❯ [input]
 *
 * Place in ~/.pi/agent/extensions/powerline.ts and reload pi.
 * Toggle with /starship  |  Force nerd-font icons: STARSHIP_NERD=1
 */

import {
	CustomEditor,
	type ExtensionAPI,
	type ExtensionContext,
	type KeybindingsManager,
} from "@mariozechner/pi-coding-agent";
import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { EditorTheme, TUI } from "@mariozechner/pi-tui";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { basename } from "node:path";

// ── ANSI helpers ───────────────────────────────────────────────────────────────
const R = "\x1b[0m";
const f256 = (n: number, s: string) => `\x1b[38;5;${n}m${s}${R}`;
const fRGB = (r: number, g: number, b: number, s: string) => `\x1b[38;2;${r};${g};${b}m${s}${R}`;
const bold = (s: string) => `\x1b[1m${s}${R}`;
const dim = (s: string) => `\x1b[2m${s}${R}`;

// ── Icons (nerd-font vs ascii) ─────────────────────────────────────────────────
const NERD = process.env["STARSHIP_NERD"] === "1";
const BRANCH_ICON = NERD ? " " : "⎇ ";
const PROMPT = "❯";
const SEPARATOR = "  "; // between status segments

// Spinner frames shown while agent is working
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// Prefix occupies exactly 2 visible columns ("❯ ")
const PREFIX_VW = 2;
// PaddingX on the editor – must match PREFIX_VW
const PADDING_X = 2;

// ── Identify pure-border lines (─ only, styled or plain) ──────────────────────
const ANSI_RE = /\x1b\[[0-9;]*m/g;
function isBorderLine(line: string): boolean {
	const plain = line.replace(ANSI_RE, "");
	return plain.length > 0 && /^─+$/.test(plain);
}

// ── Git state ─────────────────────────────────────────────────────────────────
interface GitInfo { branch: string; staged: number; modified: number; untracked: number }
const EMPTY_GIT: GitInfo = { branch: "", staged: 0, modified: 0, untracked: 0 };

async function fetchGit(cwd: string, pi: ExtensionAPI): Promise<GitInfo> {
	const [branchRes, statusRes] = await Promise.all([
		pi.exec("git", ["branch", "--show-current"], { cwd }).catch(() => null),
		pi.exec("git", ["status", "--porcelain"], { cwd }).catch(() => null),
	]);
	const branch = branchRes?.stdout.trim() ?? "";
	if (!branch) return EMPTY_GIT;
	let staged = 0, modified = 0, untracked = 0;
	for (const line of (statusRes?.stdout ?? "").split("\n")) {
		if (line.length < 2) continue;
		const x = line[0]!, y = line[1]!;
		if (x !== " " && x !== "?") staged++;
		if (y === "M" || y === "D") modified++;
		if (x === "?" && y === "?") untracked++;
	}
	return { branch, staged, modified, untracked };
}

// ── Status line builder ────────────────────────────────────────────────────────
function buildStatusLine(
	ctx: ExtensionContext,
	pi: ExtensionAPI,
	git: GitInfo,
	isWorking: boolean,
	spinnerIdx: number,
	width: number,
): string {
	const parts: string[] = [];

	// 1. Pi icon + Directory  – bold cyan
	const dir = basename(ctx.cwd) || ctx.cwd;
	parts.push(fRGB(200, 120, 144, bold("󰚩  ")) + bold(f256(81, dir)));

	// 2. Model  – blue
	const model = ctx.model?.id ?? "no model";
	parts.push(f256(75, model));

	// 3. Thinking level  – green (hidden when "off")
	const thinking = pi.getThinkingLevel?.() ?? "";
	if (thinking && thinking !== "off") {
		parts.push(f256(114, `think:${thinking}`));
	}

	// 4. Git branch + status  – purple branch, colored indicators
	if (git.branch) {
		let gitStr = f256(141, BRANCH_ICON + git.branch);
		const indicators: string[] = [];
		if (git.staged > 0)    indicators.push(f256(114, `+${git.staged}`));   // green
		if (git.modified > 0)  indicators.push(f256(221, `!${git.modified}`)); // yellow
		if (git.untracked > 0) indicators.push(f256(204, `?${git.untracked}`));// red
		if (indicators.length === 0) indicators.push(f256(114, "✓"));           // green
		gitStr += " " + indicators.join("");
		parts.push(gitStr);
	}

	// Right side: spinner or context usage
	const usage = ctx.getContextUsage();
	let right = "";
	if (isWorking) {
		right = f256(221, SPINNER[spinnerIdx] ?? "…");
	} else if (usage?.percent !== null && usage?.percent !== undefined) {
		const pct = Math.round(usage.percent);
		right = pct >= 90 ? f256(204, `ctx ${pct}%`)
		      : pct >= 70 ? f256(221, `ctx ${pct}%`)
		      :              dim(`ctx ${pct}%`);
	}

	const left = parts.join(dim(SEPARATOR));
	if (right) {
		const lw = visibleWidth(left);
		const rw = visibleWidth(right);
		const gap = Math.max(1, width - lw - rw);
		return truncateToWidth(left + " ".repeat(gap) + right, width);
	}
	return truncateToWidth(left, width);
}

// ── Main extension ─────────────────────────────────────────────────────────────
export default function (pi: ExtensionAPI) {
	let active = true;
	let isWorking = false;
	let spinnerIdx = 0;
	let spinnerTimer: ReturnType<typeof setInterval> | undefined;
	let activeTui: TUI | undefined;
	let git: GitInfo = EMPTY_GIT;
	let gitTimer: ReturnType<typeof setInterval> | undefined;

	const stopSpinner = () => {
		if (spinnerTimer) { clearInterval(spinnerTimer); spinnerTimer = undefined; }
	};
	const stopGitTimer = () => {
		if (gitTimer) { clearInterval(gitTimer); gitTimer = undefined; }
	};

	pi.on("agent_start", () => {
		isWorking = true;
		stopSpinner();
		spinnerTimer = setInterval(() => {
			spinnerIdx = (spinnerIdx + 1) % SPINNER.length;
			activeTui?.requestRender();
		}, 80);
		activeTui?.requestRender();
	});

	pi.on("agent_end", (_ev, ctx) => {
		isWorking = false;
		stopSpinner();
		// Refresh git after agent finishes (writes may have changed status)
		void fetchGit(ctx.cwd, pi).then((g) => { git = g; activeTui?.requestRender(); });
		activeTui?.requestRender();
	});

	pi.on("model_select", () => {
		activeTui?.requestRender();
	});

	pi.on("session_shutdown", () => {
		stopSpinner();
		stopGitTimer();
		activeTui = undefined;
	});

	pi.on("session_start", (_event, ctx) => {
		if (!active) return;
		install(ctx);
	});

	function install(ctx: ExtensionContext) {
		// Initial git fetch
		void fetchGit(ctx.cwd, pi).then((g) => { git = g; activeTui?.requestRender(); });

		// Periodic git refresh (every 3 s)
		stopGitTimer();
		gitTimer = setInterval(() => {
			void fetchGit(ctx.cwd, pi).then((g) => { git = g; activeTui?.requestRender(); });
		}, 3000);

		// ── Hide default footer ─────────────────────────────────────────────────
		ctx.ui.setFooter(() => ({ dispose: () => {}, invalidate() {}, render() { return []; } }));

		// ── Status widget above editor ──────────────────────────────────────────
		ctx.ui.setWidget("starship-status", (tui) => {
			activeTui = tui;
			return {
				render: (width: number) => [
					buildStatusLine(ctx, pi, git, isWorking, spinnerIdx, width),
				],
				invalidate: () => {},
			};
		});

		// ── Borderless editor with ❯ prefix ─────────────────────────────────────
		class StarshipEditor extends CustomEditor {
			constructor(tui: TUI, theme: EditorTheme, kb: KeybindingsManager) {
				super(tui, theme, kb, { paddingX: PADDING_X });
				activeTui = tui;
			}

			override render(width: number): string[] {
				const all = super.render(width);

				// Strip top and bottom borders (pure ─ lines), keep autocomplete rows
				const out: string[] = [];
				let topRemoved = false;
				let bottomRemoved = false;
				for (const line of all) {
					if (!topRemoved && isBorderLine(line)) { topRemoved = true; continue; }
					if (topRemoved && !bottomRemoved && isBorderLine(line)) { bottomRemoved = true; continue; }
					out.push(line);
				}

				if (out.length === 0) return out;

				// Replace the PADDING_X leading spaces of the first content line
				// with the colored ❯ prompt (same visible width = 2)
				const first = out[0]!;
				const promptColor = isWorking ? "\x1b[1;33m" : "\x1b[1;32m"; // yellow / green
				const prefix = `${promptColor}${PROMPT}\x1b[0m `;

				// Safety: only do the slice if the line starts with plain spaces
				if (first.length >= PREFIX_VW) {
					out[0] = prefix + first.slice(PREFIX_VW);
				} else {
					out[0] = prefix + first;
				}

				// Ensure no line exceeds the allocated width (e.g. scroll-indicator lines)
				return out.map((line) => truncateToWidth(line, width));
			}
		}

		ctx.ui.setEditorComponent((tui, theme, kb) => new StarshipEditor(tui, theme, kb));
	}

	// ── Toggle command ──────────────────────────────────────────────────────────
	pi.registerCommand("starship", {
		description: "Toggle starship-style prompt (starship [on|off])",
		handler: async (args, ctx) => {
			const arg = (args ?? "").trim().toLowerCase();
			if (arg === "on")       active = true;
			else if (arg === "off") active = false;
			else                    active = !active;

			if (active) {
				install(ctx);
				ctx.ui.notify("Starship prompt enabled ❯", "success");
			} else {
				stopGitTimer();
				ctx.ui.setWidget("starship-status", undefined);
				ctx.ui.setEditorComponent(undefined);
				ctx.ui.setFooter(undefined);
				ctx.ui.notify("Starship prompt disabled", "info");
			}
		},
	});
}
