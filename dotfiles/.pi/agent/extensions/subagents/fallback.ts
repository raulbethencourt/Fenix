/**
 * Fallback mode state management and /fallback command registration.
 * State file: ~/.pi/agent/fallback-mode.json
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ── State ──────────────────────────────────────────────────────────────

export const FALLBACK_STATE_PATH = path.join(os.homedir(), ".pi", "agent", "fallback-mode.json");

interface FallbackState {
	enabled: boolean;
	lastToggled: string;
}

export function readFallbackState(): FallbackState {
	try {
		if (fs.existsSync(FALLBACK_STATE_PATH)) {
			return JSON.parse(fs.readFileSync(FALLBACK_STATE_PATH, "utf-8")) as FallbackState;
		}
	} catch {}
	return { enabled: false, lastToggled: "" };
}

export function writeFallbackState(state: FallbackState): void {
	fs.mkdirSync(path.dirname(FALLBACK_STATE_PATH), { recursive: true });
	fs.writeFileSync(FALLBACK_STATE_PATH, JSON.stringify(state, null, 2));
}

export function isFallbackMode(): boolean {
	if (process.env.PI_FALLBACK_MODE === "1" || process.env.PI_FALLBACK_MODE === "true") {
		return true;
	}
	return readFallbackState().enabled === true;
}

// ── Command ────────────────────────────────────────────────────────────

export function registerFallbackCommand(pi: ExtensionAPI): void {
	pi.registerCommand("fallback", {
		description: "Toggle fallback mode — use free models when GitHub quota is exhausted. Usage: /fallback [on|off|status]",
		handler: async (args, ctx) => {
			const mode = (args ?? "").trim().toLowerCase();

			if (mode === "status") {
				const state = readFallbackState();
				const since = state.lastToggled ? ` (since ${new Date(state.lastToggled).toLocaleString()})` : "";
				ctx.ui.notify(
					`Fallback mode is ${state.enabled ? "ON" : "OFF"}${since}`,
					state.enabled ? "info" : "info",
				);
				return;
			}

			const state = readFallbackState();

			if (mode === "on") {
				if (state.enabled) {
					ctx.ui.notify("Fallback mode is already ON", "info");
					return;
				}
				state.enabled = true;
			} else if (mode === "off") {
				if (!state.enabled) {
					ctx.ui.notify("Fallback mode is already OFF", "info");
					return;
				}
				state.enabled = false;
			} else {
				state.enabled = !state.enabled;
			}

			state.lastToggled = new Date().toISOString();
			writeFallbackState(state);

			ctx.ui.notify(
				state.enabled
					? "Fallback mode ON — subagents will use free models"
					: "Fallback mode OFF — subagents will use normal routed models",
				state.enabled ? "success" : "info",
			);
		},
	});
}
