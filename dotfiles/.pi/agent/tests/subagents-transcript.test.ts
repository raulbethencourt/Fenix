import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

let tempHome = "";

async function loadTranscriptModule() {
	vi.resetModules();
	vi.doMock("node:os", async () => {
		const actual = await vi.importActual<typeof import("node:os")>("node:os");
		return {
			...actual,
			homedir: () => tempHome,
		};
	});
	return import("../extensions/subagents/transcript.ts");
}

describe("subagent transcripts", () => {
	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "subagent-transcript-"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.doUnmock("node:os");
		if (tempHome && fs.existsSync(tempHome)) {
			fs.rmSync(tempHome, { recursive: true, force: true });
		}
	});

	it("creates a transcript file under ~/.pi/runs/YYYY-MM-DD/<agent>-<HHmmss>.md", async () => {
		const transcript = await loadTranscriptModule();
		const now = new Date(2026, 5, 2, 17, 45, 1);

		const handle = transcript.openTranscript("scout", "Find all TypeScript files", "claude-3-5-sonnet", now);

		expect(fs.existsSync(handle.logPath)).toBe(true);
		expect(handle.logPath).toMatch(/\.pi\/runs\/2026-06-02\/scout-174501\.md$/);
	});

	it("writes the markdown header metadata", async () => {
		const transcript = await loadTranscriptModule();
		const now = new Date(2026, 5, 2, 17, 45, 1);

		const handle = transcript.openTranscript(
			"scout",
			"Find all\nTypeScript files in src/",
			"claude-3-5-sonnet",
			now,
		);

		const content = fs.readFileSync(handle.logPath, "utf-8");
		expect(content).toContain("# Subagent: scout");
		expect(content).toContain("**Model:** claude-3-5-sonnet");
		expect(content).toContain("**Task:** Find all TypeScript files in src/");
		expect(content).toContain("**Started:** 2026-06-02 17:45:01");
		expect(content).toContain("## Tool Calls");
	});

	it("appends tool call entries", async () => {
		const transcript = await loadTranscriptModule();
		const handle = transcript.openTranscript("scout", "Find files", "claude-3-5-sonnet", new Date(2026, 5, 2, 17, 45, 1));

		transcript.writeToolEvent(handle, "read", { path: "src/index.ts" });
		transcript.writeToolEvent(handle, "bash", { command: 'find . -name "*.ts"' });

		const content = fs.readFileSync(handle.logPath, "utf-8");
		expect(content).toContain("- `read` — path: src/index.ts");
		expect(content).toContain('- `bash` — command: find . -name "*.ts"');
	});

	it("writes output and footer summary", async () => {
		const transcript = await loadTranscriptModule();
		const handle = transcript.openTranscript("scout", "Find files", "claude-3-5-sonnet", new Date(2026, 5, 2, 17, 45, 1));

		transcript.writeOutput(handle, "Final output here");
		transcript.closeTranscript(handle, "completed", 1234, 4200, 0.0123);

		const content = fs.readFileSync(handle.logPath, "utf-8");
		expect(content).toContain("## Output");
		expect(content).toContain("Final output here");
		expect(content).toContain("## Summary");
		expect(content).toContain("**Status:** completed");
		expect(content).toContain("**Tokens:** 1,234");
		expect(content).toContain("**Cost:** $0.0123");
		expect(content).toContain("**Duration:** 4.2s");
	});

	it("cleans up run directories older than 7 days", async () => {
		const oldDir = path.join(tempHome, ".pi", "runs", "2026-05-20");
		const recentDir = path.join(tempHome, ".pi", "runs", "2026-05-31");
		fs.mkdirSync(oldDir, { recursive: true });
		fs.mkdirSync(recentDir, { recursive: true });
		fs.writeFileSync(path.join(oldDir, "old.md"), "old");
		fs.writeFileSync(path.join(recentDir, "recent.md"), "recent");

		const transcript = await loadTranscriptModule();
		transcript.openTranscript("scout", "Find files", "claude-3-5-sonnet", new Date(2026, 5, 2, 17, 45, 1));

		expect(fs.existsSync(oldDir)).toBe(false);
		expect(fs.existsSync(recentDir)).toBe(true);
		expect(fs.existsSync(path.join(tempHome, ".pi", "runs", "2026-06-02"))).toBe(true);
	});
});
