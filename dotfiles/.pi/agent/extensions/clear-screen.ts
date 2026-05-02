/**
 * Clear Screen Extension
 *
 * Scrolls content into scrollback and moves the input to the top.
 * Available as /c command and Ctrl+L keybinding.
 */

import type {
    ExtensionAPI,
    ExtensionCommandContext,
    ExtensionShortcut,
} from "@mariozechner/pi-coding-agent";

type Ctx = ExtensionCommandContext;

async function clearScreen(ctx: Ctx) {
    await ctx.ui.custom<void>((tui, _theme, _keybindings, done) => {
        // Scroll content into scrollback (no erase), move cursor to top
        process.stdout.write("\n".repeat(tui.terminal.rows) + "\x1b[H");

        // Shift previousViewportTop so the editor maps to screen row 0.
        // Keeping previousLines intact means the differential render finds no
        // changes above the editor — history stays invisible, not flooded back.
        const t = tui as unknown as Record<string, unknown>;
        const prevLines = [...((t["previousLines"] as string[]) ?? [])];
        const N = prevLines.length;
        const editorGuess = Math.min(2, N);
        const newTop = Math.max(0, N - editorGuess);
        // Mark the last editorGuess lines as empty so the differential render
        // detects them as changed and re-draws them onto the now-blank screen.
        for (let i = newTop; i < N; i++) prevLines[i] = "";
        t["previousLines"] = prevLines;
        t["previousViewportTop"] = newTop;
        t["cursorRow"] = newTop;
        t["hardwareCursorRow"] = newTop;

        done(undefined);
        return { render: () => [], invalidate: () => { } };
    });
}

export default function(pi: ExtensionAPI) {
    pi.registerCommand("c", {
        description: "Clear the terminal screen (keeps session)",
        handler: async (_args, ctx) => clearScreen(ctx),
    });
}
