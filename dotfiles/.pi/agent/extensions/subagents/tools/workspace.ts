import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import * as fs from "node:fs";
import * as crypto from "node:crypto";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_WORKSPACE_SIZE = 1_048_576; // 1 MB
const MAX_ARRAY_LENGTH = 1000;
const MAX_VALUE_SIZE = 65_536; // 64 KB serialized

function validateKeyPath(path: string): void {
	const keys = path.split(".");
	if (keys.some((k) => FORBIDDEN_KEYS.has(k))) {
		throw new Error(`Invalid key path: "${path}" contains forbidden key`);
	}
	if (keys.some((k) => k.length === 0)) {
		throw new Error(`Invalid key path: "${path}" contains empty segment`);
	}
}

function getByPath(obj: any, path: string): any {
	return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function setByPath(obj: any, path: string, value: any): void {
	const keys = path.split(".");
	const last = keys.pop()!;
	const target = keys.reduce((acc, key) => {
		if (acc[key] === undefined || typeof acc[key] !== "object") acc[key] = {};
		return acc[key];
	}, obj);
	target[last] = value;
}

function deleteByPath(obj: any, path: string): void {
	const keys = path.split(".");
	const last = keys.pop()!;
	const target = keys.reduce((acc, key) => acc?.[key], obj);
	if (target && typeof target === "object") delete target[last];
}

function atomicWrite(filePath: string, data: string): void {
	const tmpPath = filePath + ".tmp";
	fs.writeFileSync(tmpPath, data, { mode: 0o600 });
	fs.renameSync(tmpPath, filePath);
}

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();
	// Full MD5 digest used as filename disambiguator (not for security/integrity)
	const hash = crypto.createHash("md5").update(cwd).digest("hex");
	const wsPath = `/tmp/pi-workspace-${hash}.json`;

	pi.registerTool({
		name: "workspace",
		label: "Workspace",
		description:
			"Shared workspace for inter-agent communication. Read/write structured data that persists across agent handoffs in the same orchestration session.",
		promptSnippet: "Share structured data between agents in a pipeline",
		promptGuidelines: [
			"Use write to set structured values by dot-notation paths (e.g., plan.steps)",
			"Use append to collect logs, findings, or handoff notes into arrays",
			"Use read with no key to inspect the full workspace document",
			"Use keys to quickly inspect available top-level or nested object fields",
			"Use clear with a key to remove one section, or no key to reset everything",
		],
		parameters: Type.Object({
			op: Type.Union(
				[
					Type.Literal("read"),
					Type.Literal("write"),
					Type.Literal("append"),
					Type.Literal("clear"),
					Type.Literal("keys"),
				],
				{ description: "Operation to perform" },
			),
			key: Type.Optional(
				Type.String({
					description:
						"Dot-notation key path (e.g., 'plan', 'files_modified', 'test_results.failures'). Required for read/write/append.",
				}),
			),
			value: Type.Optional(
				Type.Any({
					description:
						"Value to write or append. Required for write/append operations.",
				}),
			),
		}),
		async execute(toolCallId, params, signal, onUpdate) {
			void toolCallId;
			void signal;
			void onUpdate;

			const { op, key, value } = params;

			// Validate key path upfront for all operations that use it
			if (key) {
				validateKeyPath(key);
			}

			// Sequential-agent assumption: no concurrent writes expected.
			// Atomic write (tmp + rename) protects against partial writes on crash.
			// If the file is corrupted, fall back to empty workspace.
			let workspace: Record<string, any> = {};
			if (fs.existsSync(wsPath)) {
				try {
					workspace = JSON.parse(fs.readFileSync(wsPath, "utf-8"));
				} catch {
					workspace = {};
				}
			}

			switch (op) {
				case "read": {
					if (!key) return { content: [{ type: "text", text: JSON.stringify(workspace, null, 2) }] };
					const val = getByPath(workspace, key);
					return {
						content: [{
							type: "text",
							text: val !== undefined
								? JSON.stringify(val, null, 2)
								: `Key "${key}" not found`,
						}],
					};
				}
				case "write": {
					if (!key) throw new Error("write requires a key");
					if (value === undefined) throw new Error("write requires a value");
					// Check value size
					const serialized = JSON.stringify(value);
					if (serialized.length > MAX_VALUE_SIZE) {
						throw new Error(
							`Value too large: ${serialized.length} bytes (max ${MAX_VALUE_SIZE})`,
						);
					}
					setByPath(workspace, key, value);
					const output = JSON.stringify(workspace, null, 2);
					if (output.length > MAX_WORKSPACE_SIZE) {
						throw new Error(
							`Workspace would exceed max size (${MAX_WORKSPACE_SIZE} bytes)`,
						);
					}
					atomicWrite(wsPath, output);
					return { content: [{ type: "text", text: `Written to "${key}"` }] };
				}
				case "append": {
					if (!key) throw new Error("append requires a key");
					if (value === undefined) throw new Error("append requires a value");
					// Check value size
					const serializedVal = JSON.stringify(value);
					if (serializedVal.length > MAX_VALUE_SIZE) {
						throw new Error(
							`Value too large: ${serializedVal.length} bytes (max ${MAX_VALUE_SIZE})`,
						);
					}
					const existing = getByPath(workspace, key);
					if (existing === undefined) {
						setByPath(workspace, key, [value]);
					} else if (Array.isArray(existing)) {
						if (existing.length >= MAX_ARRAY_LENGTH) {
							throw new Error(
								`Array "${key}" at max length (${MAX_ARRAY_LENGTH})`,
							);
						}
						existing.push(value);
						setByPath(workspace, key, existing);
					} else {
						throw new Error(`Cannot append to "${key}": not an array`);
					}
					const output = JSON.stringify(workspace, null, 2);
					if (output.length > MAX_WORKSPACE_SIZE) {
						throw new Error(
							`Workspace would exceed max size (${MAX_WORKSPACE_SIZE} bytes)`,
						);
					}
					atomicWrite(wsPath, output);
					return {
						content: [{ type: "text", text: `Appended to "${key}" (now ${Array.isArray(getByPath(workspace, key)) ? getByPath(workspace, key).length : 1} items)` }],
					};
				}
				case "clear": {
					if (key) {
						deleteByPath(workspace, key);
						atomicWrite(wsPath, JSON.stringify(workspace, null, 2));
						return { content: [{ type: "text", text: `Cleared "${key}"` }] };
					}
					atomicWrite(wsPath, "{}");
					return { content: [{ type: "text", text: "Workspace cleared" }] };
				}
				case "keys": {
					const target = key ? getByPath(workspace, key) : workspace;
					if (target && typeof target === "object" && !Array.isArray(target)) {
						return { content: [{ type: "text", text: Object.keys(target).join(", ") || "(empty)" }] };
					}
					return {
						content: [{ type: "text", text: key ? `"${key}" is not an object` : "(empty workspace)" }],
					};
				}
			}
		},
	});
}
