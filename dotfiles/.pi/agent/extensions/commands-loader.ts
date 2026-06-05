import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const GLOBAL_COMMANDS_DIR = path.join(os.homedir(), ".pi", "agent", "commands");
const MEMORY_DOC = path.join(os.homedir(), ".pi", "agent", "docs", "memory.md");

export default function commandsLoader(pi: ExtensionAPI) {
    pi.on("resources_discover", async (event, _ctx) => {
        const promptPaths: string[] = [GLOBAL_COMMANDS_DIR];
        const localCommandsDir = path.join(event.cwd, ".pi", "commands");
        if (fs.existsSync(localCommandsDir)) {
            promptPaths.push(localCommandsDir);
        }
        return { promptPaths };
    });

    pi.registerCommand("memory", {
        description: "Show memory tool usage",
        handler: async (_args, _ctx) => {
            try {
                const doc = fs.readFileSync(MEMORY_DOC, "utf-8");
                pi.sendMessage({
                    customType: "memory-help",
                    content: doc,
                    display: true,
                });
            } catch {
                // doc not found — silent no-op
            }
        },
    });
}
