import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

type RunRow = {
	timestamp: string;
	session_id?: string;
	agent?: string;
	model?: string | null;
	task_summary?: string;
	input_tokens?: number;
	output_tokens?: number;
	cache_read?: number;
	cache_write?: number;
	cost_usd?: number;
	turns?: number;
	duration_ms?: number;
	exit_code?: number;
	cwd?: string;
};

let tempHome = "";

const RUNS_SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  model TEXT,
  task_summary TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read INTEGER DEFAULT 0,
  cache_write INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  turns INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  exit_code INTEGER,
  cwd TEXT
);
`;

async function loadTokenStatsHandler() {
	vi.resetModules();
	vi.doMock("node:os", async () => {
		const actual = await vi.importActual<typeof import("node:os")>("node:os");
		return {
			...actual,
			homedir: () => tempHome,
		};
	});

	let handler: ((args: string, ctx: any) => Promise<void>) | null = null;
	const extension = await import("../extensions/token-stats-cmd/index.ts");
	extension.default({
		registerCommand(name: string, config: any) {
			if (name === "token_stats") handler = config.handler;
		},
	} as any);

	if (!handler) throw new Error("token_stats handler not registered");
	return handler;
}

function createMockCtx(renderedFrames: string[][]) {
	const theme = {
		bold: (s: string) => s,
		fg: (_color: string, s: string) => s,
	};

	return {
		ui: {
			theme,
			custom: async (fn: any) => {
				const component = fn({ requestRender: () => {} }, theme, null, () => {});
				renderedFrames.push(component.render(200));
				for (let i = 0; i < 30; i++) component.handleInput?.("j");
				renderedFrames.push(component.render(200));
			},
		},
	};
}

function getRenderedText(renderedFrames: string[][]): string {
	return renderedFrames.flat().join("\n");
}

async function createAnalyticsDb(rows: RunRow[]) {
	const dbDir = path.join(tempHome, ".pi", "data");
	const dbPath = path.join(dbDir, "analytics.db");
	fs.mkdirSync(dbDir, { recursive: true });

	const { DatabaseSync } = await import("node:sqlite");
	const db = new DatabaseSync(dbPath);
	db.exec(RUNS_SCHEMA);

	const stmt = db.prepare(`
		INSERT INTO runs (
			timestamp, session_id, agent, model, task_summary,
			input_tokens, output_tokens, cache_read, cache_write,
			cost_usd, turns, duration_ms, exit_code, cwd
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	for (const row of rows) {
		stmt.run(
			row.timestamp,
			row.session_id ?? crypto.randomUUID(),
			row.agent ?? "agent",
			row.model ?? null,
			row.task_summary ?? "task",
			row.input_tokens ?? 0,
			row.output_tokens ?? 0,
			row.cache_read ?? 0,
			row.cache_write ?? 0,
			row.cost_usd ?? 0,
			row.turns ?? 1,
			row.duration_ms ?? 0,
			row.exit_code ?? 0,
			row.cwd ?? "",
		);
	}

	db.close();
}

describe("token-stats-cmd extension", () => {
	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "token-stats-test-"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.doUnmock("node:os");
		if (tempHome && fs.existsSync(tempHome)) {
			fs.rmSync(tempHome, { recursive: true, force: true });
		}
	});

	it("shows message when analytics DB does not exist", async () => {
		const handler = await loadTokenStatsHandler();
		const rendered: string[][] = [];

		await handler("", createMockCtx(rendered));

		const out = getRenderedText(rendered);
		expect(out).toContain("Token Spending Analytics (week)");
		expect(out).toContain("No telemetry data — database not found at ~/.pi/data/analytics.db");
	});

	it("shows message when DB exists but selected period has no runs", async () => {
		const handler = await loadTokenStatsHandler();
		await createAnalyticsDb([]);
		const rendered: string[][] = [];

		await handler("", createMockCtx(rendered));

		const out = getRenderedText(rendered);
		expect(out).toContain("No telemetry data for selected period");
	});

	it("renders all major sections with populated telemetry data", async () => {
		const handler = await loadTokenStatsHandler();
		const now = new Date().toISOString();
		await createAnalyticsDb([
			{
				timestamp: now,
				agent: "a500",
				model: "m500",
				input_tokens: 500,
				output_tokens: 0,
				cost_usd: 0.1234,
				duration_ms: 500,
				exit_code: 0,
				cwd: "/home/user/project",
				task_summary: "run 500",
			},
			{
				timestamp: now,
				agent: "a1500",
				model: "m1500",
				input_tokens: 1000,
				output_tokens: 500,
				cost_usd: 0.5,
				duration_ms: 5000,
				exit_code: 1,
				cwd: "",
				task_summary: "run 1500",
			},
			{
				timestamp: now,
				agent: "a45k",
				model: "m45k",
				input_tokens: 44000,
				output_tokens: 1000,
				cost_usd: 1,
				duration_ms: 90000,
				exit_code: 0,
				cwd: "/tmp/other",
				task_summary: "run 45k",
			},
			{
				timestamp: now,
				agent: "a1_5m",
				model: "m1_5m",
				input_tokens: 1000000,
				output_tokens: 500000,
				cost_usd: 2,
				duration_ms: 1000,
				exit_code: 0,
				cwd: "/home/user/project",
				task_summary: "run 1.5m",
			},
		]);

		const rendered: string[][] = [];
		await handler("all", createMockCtx(rendered));
		const out = getRenderedText(rendered);

		expect(out).toContain("Summary");
		expect(out).toContain("By Agent");
		expect(out).toContain("By Model");
		expect(out).toContain("By Day");
		expect(out).toContain("Top 5 Expensive Runs");
		expect(out).toContain("By Project");

		expect(out).toContain("500");
		expect(out).toContain("1.5K");
		expect(out).toContain("45K");
		expect(out).toContain("1.5M");
		expect(out).toContain("$0.1234");
		expect(out).toContain("1s");
		expect(out).toContain("5s");
		expect(out).toContain("1.5m");
		expect(out).toContain("project");
		expect(out).toContain("unknown");
	});

	it("parses period argument and defaults invalid values to week with warning", async () => {
		const handler = await loadTokenStatsHandler();
		const rendered: string[][] = [];

		await handler("today", createMockCtx(rendered));
		expect(getRenderedText(rendered)).toContain("Token Spending Analytics (today)");

		rendered.length = 0;
		await handler("week", createMockCtx(rendered));
		expect(getRenderedText(rendered)).toContain("Token Spending Analytics (week)");

		rendered.length = 0;
		await handler("month", createMockCtx(rendered));
		expect(getRenderedText(rendered)).toContain("Token Spending Analytics (month)");

		rendered.length = 0;
		await handler("all", createMockCtx(rendered));
		expect(getRenderedText(rendered)).toContain("Token Spending Analytics (all)");

		rendered.length = 0;
		await handler("invalid-period", createMockCtx(rendered));
		const out = getRenderedText(rendered);
		expect(out).toContain("Token Spending Analytics (week)");
		expect(out).toContain("Unknown period 'invalid-period', using 'week'. Valid: today, week, month, all");
	});

	it("renders bar chart with empty bars for zero cost days and full bars for max day", async () => {
		const handler = await loadTokenStatsHandler();
		await createAnalyticsDb([
			{
				timestamp: new Date().toISOString(),
				agent: "daily",
				model: "m",
				input_tokens: 10,
				output_tokens: 10,
				cost_usd: 10,
				duration_ms: 1000,
				exit_code: 0,
				cwd: "/tmp/p",
				task_summary: "daily run",
			},
		]);

		const rendered: string[][] = [];
		await handler("week", createMockCtx(rendered));
		const out = getRenderedText(rendered);

		expect(out).toContain("████████████████████████");
		expect(out).toContain("░░░░░░░░░░░░░░░░░░░░░░░░");
	});
});

describe("telemetry logToolCalls", () => {
	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "token-stats-test-"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.doUnmock("node:os");
		if (tempHome && fs.existsSync(tempHome)) {
			fs.rmSync(tempHome, { recursive: true, force: true });
		}
	});

	async function loadTelemetryModule() {
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

	it("inserts tool call rows for a run", async () => {
		const telemetry = (await loadTelemetryModule()) as any;
		telemetry.initTelemetryDb();
		telemetry.logRun(
			{
				agent: "tester",
				task: "seed run",
				exitCode: 0,
				model: "m",
				usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, cost: 0.01, turns: 1 },
				progress: { durationMs: 1000 },
			},
			"/tmp/project",
			"session-1",
		);

		const db = telemetry.getDb();
		const run = db.prepare("SELECT id FROM runs ORDER BY id DESC LIMIT 1").get();
		expect(run?.id).toBeTypeOf("number");

		expect(typeof telemetry.logToolCalls).toBe("function");
		telemetry.logToolCalls(run.id, [
			{ tool: "read", count: 3 },
			{ tool: "edit", count: 1 },
		]);

		const rows = db.prepare("SELECT run_id, tool, count FROM tool_calls ORDER BY tool ASC").all();
		expect(rows).toEqual([
			{ run_id: run.id, tool: "edit", count: 1 },
			{ run_id: run.id, tool: "read", count: 3 },
		]);
	});
});

describe("/token_stats renders tool usage section", () => {
	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "token-stats-test-"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.doUnmock("node:os");
		if (tempHome && fs.existsSync(tempHome)) {
			fs.rmSync(tempHome, { recursive: true, force: true });
		}
	});

	it("shows a By Tool section when tool_calls data exists", async () => {
		const dbDir = path.join(tempHome, ".pi", "data");
		const dbPath = path.join(dbDir, "analytics.db");
		fs.mkdirSync(dbDir, { recursive: true });

		const { DatabaseSync } = await import("node:sqlite");
		const db = new DatabaseSync(dbPath);
		db.exec(RUNS_SCHEMA);
		db.exec(`
			CREATE TABLE IF NOT EXISTS tool_calls (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				run_id INTEGER NOT NULL,
				tool TEXT NOT NULL,
				count INTEGER NOT NULL
			);
		`);

		const now = new Date().toISOString();
		db.prepare(`
			INSERT INTO runs (
				timestamp, session_id, agent, model, task_summary,
				input_tokens, output_tokens, cache_read, cache_write,
				cost_usd, turns, duration_ms, exit_code, cwd
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(now, "session-tools", "agent", "model", "task", 100, 20, 0, 0, 0.1, 1, 1000, 0, "/tmp/project");

		const run = db.prepare("SELECT id FROM runs ORDER BY id DESC LIMIT 1").get();
		db.prepare("INSERT INTO tool_calls (run_id, tool, count) VALUES (?, ?, ?)").run(run.id, "read", 3);
		db.prepare("INSERT INTO tool_calls (run_id, tool, count) VALUES (?, ?, ?)").run(run.id, "edit", 1);
		db.close();

		const handler = await loadTokenStatsHandler();
		const rendered: string[][] = [];
		await handler("all", createMockCtx(rendered));
		const out = getRenderedText(rendered);

		expect(out).toContain("By Tool");
		expect(out).toContain("read");
		expect(out).toContain("edit");
	});
});
