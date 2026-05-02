import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Tools the orchestrator must NOT use directly — must delegate to subagents
const BLOCKED_TOOLS = new Set([
	"read", "write", "edit", "bash", "safe_bash", "grep", "find", "ls",
]);

// Tools the orchestrator CAN use directly
const ALLOWED_TOOLS = new Set([
	"subagent", "ask_user_question", "web_search", "web_fetch",
]);

const AVAILABLE_AGENTS = [
	"scout", "researcher", "planner", "worker", "tester",
	"debugger", "security-auditor", "doc-writer", "refactorer", "codereviewer", "distiller",
];

export default function (pi: ExtensionAPI) {
	// Only enforce at depth 0 (main orchestrator)
	const depth = parseInt(process.env.PI_SUBAGENT_DEPTH || "0", 10);
	if (depth > 0) return;

	let bypassed = false;

	// Register tool_call hook to block direct tool use by the orchestrator
	pi.on("tool_call", async (event) => {
		if (bypassed) return undefined;

		const toolName = event.toolName;

		// Allow explicitly allowed tools and anything not in the blocked list (MCP tools, etc.)
		if (ALLOWED_TOOLS.has(toolName) || !BLOCKED_TOOLS.has(toolName)) {
			return undefined;
		}

		// Block the tool and tell the LLM what to do instead
		return {
			block: true,
			reason:
				`Orchestrator cannot use "${toolName}" directly. Delegate via subagent instead.\n\n` +
				`Available agents: ${AVAILABLE_AGENTS.join(", ")}\n\n` +
				`Use: subagent({ agent: "<name>", task: "..." }) or subagent({ tasks: [...] }) for parallel execution.`,
		};
	});

	// Register /delegation command to toggle bypass
	pi.registerCommand("delegation", {
		description: "Toggle delegation enforcement bypass (orchestrator-only tool guard)",
		handler: async (_args, ctx) => {
			bypassed = !bypassed;
			if (bypassed) {
				ctx.ui.notify(
					"⚠️  Delegation enforcement BYPASSED — orchestrator can use tools directly. Run /delegation again to re-enable.",
					"warning",
				);
			} else {
				ctx.ui.notify(
					"✅ Delegation enforcement ACTIVE — orchestrator must delegate via subagents.",
					"success",
				);
			}
		},
	});
}
