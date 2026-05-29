import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

let tempHome = "";

function makeRun(overrides: Partial<any> = {}) {
	return {
		agent: "planner",
		task: "Short task",
		exitCode: 0,
		model: "gpt-test",
		usage: {
			input: 10,
			output: 20,
			cacheRead: 1,
			cacheWrite: 2,
			cost: 0.01,
			turns: 3,
		},
		progress: {
			durationMs: 1234,
		},
		...overrides,
	};
}

async function loadTelemetry() {
	vi.resetModules();
	vi.doMock("node:os", async () => {
		const actual = await vi.importActual<typeof import("node:os")>("node:os");
		return {
			...actual,
			homedir: () => tempHome,
		};
	});
	return import("../extensions/subagents/telemetry.ts");
}

describe("telemetry module", () => {
	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "telemetry-test-"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.doUnmock("node:os");
		if (tempHome && fs.existsSync(tempHome)) {
			fs.rmSync(tempHome, { recursive: true, force: true });
		}
	});

	describe("initTelemetryDb", () => {
		it("creates the database and schema without errors", async () => {
			const telemetry = await loadTelemetry();
			expect(() => telemetry.initTelemetryDb()).not.toThrow();

			const dbPath = path.join(tempHome, ".pi", "data", "analytics.db");
			expect(fs.existsSync(dbPath)).toBe(true);

			const db = telemetry.getDb();
			expect(db).toBeTruthy();

			const table = db
				.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='runs'")
				.get();
			expect(table?.name).toBe("runs");
		});
	});

	describe("logRun", () => {
		it("logs a run and the data can be queried back", async () => {
			const telemetry = await loadTelemetry();
			telemetry.initTelemetryDb();

			telemetry.logRun(makeRun(), "/tmp/project", "session-1");

			const db = telemetry.getDb();
			const row = db
				.prepare(
					"SELECT session_id, agent, model, task_summary, input_tokens, output_tokens, exit_code, cwd FROM runs WHERE session_id = ?",
				)
				.get("session-1");

			expect(row.session_id).toBe("session-1");
			expect(row.agent).toBe("planner");
			expect(row.model).toBe("gpt-test");
			expect(row.task_summary).toBe("Short task");
			expect(row.input_tokens).toBe(10);
			expect(row.output_tokens).toBe(20);
			expect(row.exit_code).toBe(0);
			expect(row.cwd).toBe("/tmp/project");
		});

		it("handles undefined/null model gracefully", async () => {
			const telemetry = await loadTelemetry();
			telemetry.initTelemetryDb();

			expect(() => telemetry.logRun(makeRun({ model: undefined }), "/tmp/a", "session-undef")).not.toThrow();
			expect(() => telemetry.logRun(makeRun({ model: null as any }), "/tmp/b", "session-null")).not.toThrow();

			const db = telemetry.getDb();
			const rows = db
				.prepare("SELECT session_id, model FROM runs WHERE session_id IN (?, ?) ORDER BY session_id")
				.all("session-null", "session-undef");

			expect(rows).toHaveLength(2);
			expect(rows[0].session_id).toBe("session-null");
			expect(rows[0].model).toBeNull();
			expect(rows[1].session_id).toBe("session-undef");
			expect(rows[1].model).toBeNull();
		});

		it("truncates task summary to 200 characters", async () => {
			const telemetry = await loadTelemetry();
			telemetry.initTelemetryDb();

			const longTask = "x".repeat(250);
			telemetry.logRun(makeRun({ task: longTask }), "/tmp/project", "session-long-task");

			const db = telemetry.getDb();
			const row = db.prepare("SELECT task_summary FROM runs WHERE session_id = ?").get("session-long-task");
			expect(row.task_summary).toBe("x".repeat(200));
			expect(row.task_summary.length).toBe(200);
		});

		it("does not throw when DB is null (graceful degradation)", async () => {
			const telemetry = await loadTelemetry();
			expect(() => telemetry.logRun(makeRun(), "/tmp/project", "session-no-db")).not.toThrow();
		});

		it("logs multiple runs and they can all be queried", async () => {
			const telemetry = await loadTelemetry();
			telemetry.initTelemetryDb();

			telemetry.logRun(makeRun({ agent: "planner", task: "task 1", exitCode: 0 }), "/tmp/project", "session-a");
			telemetry.logRun(makeRun({ agent: "coder", task: "task 2", exitCode: 1 }), "/tmp/project", "session-b");
			telemetry.logRun(makeRun({ agent: "reviewer", task: "task 3", exitCode: 0 }), "/tmp/project", "session-c");

			const db = telemetry.getDb();
			const rows = db
				.prepare("SELECT session_id, agent, exit_code FROM runs ORDER BY id")
				.all();

			expect(rows).toHaveLength(3);
			expect(rows.map((r: any) => r.session_id)).toEqual(["session-a", "session-b", "session-c"]);
			expect(rows.map((r: any) => r.agent)).toEqual(["planner", "coder", "reviewer"]);
			expect(rows.map((r: any) => r.exit_code)).toEqual([0, 1, 0]);
		});
	});

	describe("getDb", () => {
		it("returns the DB handle after init", async () => {
			const telemetry = await loadTelemetry();
			telemetry.initTelemetryDb();
			const db = telemetry.getDb();
			expect(db).toBeTruthy();
			expect(telemetry.getDb()).toBe(db);
		});
	});
});
