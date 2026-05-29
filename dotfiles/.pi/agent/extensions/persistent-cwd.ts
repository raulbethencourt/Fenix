/**
 * Persistent CWD Extension
 *
 * Makes `cd` persist across pi bash tool calls.
 * Overrides the built-in bash tool to:
 *  - Run every command in the last tracked working directory
 *  - Detect the new pwd after each command and store it
 *
 * Also tracks `!cd` user commands so the AI and user share the same cwd.
 */

import { createBashTool, createBashToolDefinition } from "@mariozechner/pi-coding-agent";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function(pi: ExtensionAPI) {
    let trackedCwd: string | null = null;

    // Unique per-session sentinel so it never collides with real output
    const SENTINEL = `__PICWD${Math.random().toString(36).slice(2)}__`;

    pi.on("session_start", (_event, ctx) => {
        trackedCwd = ctx.cwd;
    });

    pi.registerTool({
        name: "bash",
        parameters: createBashToolDefinition(process.cwd()).parameters,
        async execute(toolCallId, params, signal, onUpdate, ctx) {
            if (!trackedCwd) trackedCwd = ctx.cwd;
            const cwd = trackedCwd;

            // Build a bash tool that runs in the tracked cwd and appends a pwd sentinel
            const tool = createBashTool(cwd, {
                spawnHook: ({ command, env }) => ({
                    command: `${command}\nprintf "\\n${SENTINEL}%s\\n" "$(pwd)"`,
                    cwd,
                    env,
                }),
            });

            const result = await tool.execute(
                toolCallId,
                params,
                signal,
                onUpdate,
                ctx,
            );

            // Strip sentinel from output and capture new cwd
            for (const item of result.content) {
                if (item.type !== "text") continue;
                const idx = item.text.lastIndexOf(`\n${SENTINEL}`);
                if (idx === -1) continue;
                const after = item.text.slice(idx + 1 + SENTINEL.length);
                const newCwd = after.split("\n")[0]?.trim();
                if (newCwd) trackedCwd = newCwd;
                item.text = item.text.slice(0, idx);
            }

            return result;
        },
    });

    // Track cwd from user `!` commands too
    pi.on("user_bash", async (event, _ctx) => {
        if (!trackedCwd) return;
        const cmd = event.command.trim();
        // Only intercept pure cd commands — let everything else run normally
        if (!/^cd(\s|$)/.test(cmd)) return;

        // Run cd in the tracked cwd and capture the new pwd
        const tool = createBashTool(trackedCwd, {
            spawnHook: ({ command, env }) => ({
                command: `${command}\nprintf "\\n${SENTINEL}%s\\n" "$(pwd)"`,
                cwd: trackedCwd!,
                env,
            }),
        });

        const result = await tool.execute(
            "user_bash_cd",
            { command: cmd },
            undefined,
            undefined,
            _ctx,
        );

        for (const item of result.content) {
            if (item.type !== "text") continue;
            const idx = item.text.lastIndexOf(`\n${SENTINEL}`);
            if (idx === -1) continue;
            const after = item.text.slice(idx + 1 + SENTINEL.length);
            const newCwd = after.split("\n")[0]?.trim();
            if (newCwd) trackedCwd = newCwd;
            item.text = item.text.slice(0, idx);
        }

        return {
            result: {
                output: `(cwd → ${trackedCwd})`,
                exitCode: 0,
                cancelled: false,
                truncated: false,
            },
        };
    });
}
