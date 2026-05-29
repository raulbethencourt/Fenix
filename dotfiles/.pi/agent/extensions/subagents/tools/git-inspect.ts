/**
 * git_inspect tool — read-only git operations for codebase investigation.
 * Whitelists safe commands and rejects dangerous flags.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";

const Type = {
	String: (options: Record<string, unknown> = {}) => ({ type: "string", ...options }),
	Optional: (schema: Record<string, unknown>) => ({ ...schema }),
	Object: (properties: Record<string, unknown>) => ({ type: "object", properties }),
};

const ALLOWED_COMMANDS = new Set([
	"diff", "log", "show", "status", "branch", "blame", "tag", "stash-list", "diff-stat", "shortlog",
]);

const DANGEROUS_FLAGS = [
	"--exec", "--upload-pack", "--receive-pack", "-c", "--config",
	"--run", "--exec-path",
];

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "git_inspect",
		label: "Git Inspect",
		description:
			"Read-only git inspection: diff, log, show, status, branch, blame, tag, stash-list, diff-stat, shortlog. No mutations allowed.",
		parameters: Type.Object({
			command: Type.String({
				description:
					'Git subcommand: "diff", "log", "show", "status", "branch", "blame", "tag", "stash-list", "diff-stat", "shortlog"',
			}),
			args: Type.Optional(
				Type.String({
					description:
						'Additional arguments (e.g., "--oneline -10", "HEAD~3..HEAD", "main..feature", "--name-only")',
				}),
			),
			path: Type.Optional(
				Type.String({
					description: "File or directory path to scope the command to",
				}),
			),
		}),

		async execute(_toolCallId, params) {
			const { command, args, path: filePath } = params as {
				command: string;
				args?: string;
				path?: string;
			};

			// Validate command
			if (!ALLOWED_COMMANDS.has(command)) {
				return {
					content: [
						{
							type: "text",
							text: `Command "${command}" is not allowed. Allowed commands: ${[...ALLOWED_COMMANDS].join(", ")}`,
						},
					],
				};
			}

			// Check for dangerous flags in args
			if (args) {
				const lowerArgs = args.toLowerCase();
				for (const flag of DANGEROUS_FLAGS) {
					if (lowerArgs.includes(flag.toLowerCase())) {
						return {
							content: [
								{
									type: "text",
									text: `Dangerous flag "${flag}" is not allowed in arguments.`,
								},
							],
						};
					}
				}
			}

			// Build the git command
			let gitCmd: string;
			if (command === "stash-list") {
				gitCmd = "git stash list";
			} else if (command === "diff-stat") {
				gitCmd = `git diff --stat`;
			} else {
				gitCmd = `git ${command}`;
			}

			if (args) {
				gitCmd += ` ${args}`;
			}

			if (filePath) {
				gitCmd += ` -- ${filePath}`;
			}

			try {
				const output = execSync(gitCmd, {
					encoding: "utf-8",
					timeout: 30_000,
					maxBuffer: 1024 * 1024 * 5, // 5MB
					stdio: ["pipe", "pipe", "pipe"],
				});

				return {
					content: [
						{
							type: "text",
							text: output || "(empty output)",
						},
					],
				};
			} catch (err: any) {
				const stderr = err.stderr?.toString() || "";
				const message = err.message || "Unknown error";
				return {
					content: [
						{
							type: "text",
							text: `Git error: ${stderr || message}`.trim(),
						},
					],
				};
			}
		},
	});
}
