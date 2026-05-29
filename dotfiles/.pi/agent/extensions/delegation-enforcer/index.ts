import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Only these tools are allowed for the orchestrator — everything else is blocked
const ALLOWED_TOOLS = new Set([
	"subagent", "ask_user_question",
	"ctx_search", "ctx_stats", // read-only KB ops; no isolation needed
]);

const AVAILABLE_AGENTS = [
	"scout", "researcher", "planner", "worker", "tester", "sugar-tester",
	"debugger", "security-auditor", "security-auditor-deep", "doc-writer", "refactorer",
	"codereviewer", "code-reviewer-deep", "critic",
];

export default function (pi: ExtensionAPI) {
	// Only enforce at depth 0 (main orchestrator)
	const depth = parseInt(process.env.PI_SUBAGENT_DEPTH || "0", 10);
	if (depth > 0) return;

	let bypassed = false;
	let directBypass = false;

	// Register tool_call hook to block direct tool use by the orchestrator
	pi.on("tool_call", async (event) => {
		if (bypassed) return undefined;

		const toolName = event.toolName;

		if (directBypass && !ALLOWED_TOOLS.has(toolName)) {
			directBypass = false; // single-use: consume immediately
			return undefined;     // let this one call through
		}

		// Only allow explicitly allowed tools — block everything else
		if (ALLOWED_TOOLS.has(toolName)) {
			return undefined;
		}

		// Block the tool and tell the LLM what to do instead
		return {
			block: true,
			reason:
				`STOP. "${toolName}" is blocked at depth 0. Delegate via subagent({ agent, task }).\n` +
				`Agents: scout | researcher | worker | tester | planner | critic | sugar-tester | debugger | codereviewer | doc-writer | refactorer\n` +
				`Parallel: subagent({ tasks: [{ agent, task }, ...] })`,
		};
	});


	// TDD enforcement warning: log when new extension/source files are created without tests
	// This is a soft gate — it warns but doesn't block. The orchestrator skill enforces the hard rule.
	pi.on("tool_result", async (event) => {
		if (event.toolName !== "subagent") return undefined;
		const text = typeof event.result === "string" ? event.result : JSON.stringify(event.result ?? "");
		// Detect new file creation in extensions/ or src/ without corresponding test
		const createdFileMatch = text.match(/(?:created|wrote|new file)[^]*?(extensions\/[^\s"']+\.ts|src\/[^\s"']+\.ts)/i);
		if (createdFileMatch) {
			const createdFile = createdFileMatch[1];
			const isTestFile = /\.test\.ts$|\.spec\.ts$/.test(createdFile);
			const isConfigOrDoc = /\.(json|md|yml|yaml|toml)$/.test(createdFile);
			if (!isTestFile && !isConfigOrDoc) {
				console.error(
					`[delegation-enforcer] ⚠️  TDD WARNING: New source file "${createdFile}" created. Ensure tests exist. See orchestrator skill "Test Enforcement" rules.`
				);
			}
		}
		return undefined;
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

	pi.registerCommand("direct", {
		description: "Allow ONE blocked tool call through (single-use bypass, then enforcement re-activates)",
		handler: async (_args, ctx) => {
			directBypass = true;
			ctx.ui.notify(
				"⚡ Direct mode: next blocked tool call will pass through once, then enforcement re-activates.",
				"warning",
			);
		},
	});
}
