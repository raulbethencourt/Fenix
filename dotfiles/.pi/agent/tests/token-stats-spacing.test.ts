import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	cost_usd?: number;
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
  cost_usd REAL DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  exit_code INTEGER,
  cwd TEXT
);
`;

async function loadTokenStatsHandler() {
	vi.resetModules();
	vi.doMock("node:os", async () => {
		const actual = await vi.importActual<typeof import("node:os")>("node:os");
		return { ...actual, homedir: () => tempHome };
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
	const theme = { bold: (s: string) => s, fg: (_color: string, s: string) => s };
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

function renderedText(renderedFrames: string[][]) {
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
			input_tokens, output_tokens, cost_usd, duration_ms, exit_code, cwd
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			row.cost_usd ?? 0,
			row.duration_ms ?? 0,
			row.exit_code ?? 0,
			row.cwd ?? "",
		);
	}
	db.close();
}

function blankLinesBetween(text: string, first: string, second: string) {
	const lines = text.split("\n");
	const a = lines.findIndex((line) => line.includes(first));
	const b = lines.findIndex((line) => line.includes(second));
	expect(a).toBeGreaterThan(-1);
	expect(b).toBeGreaterThan(a);
	return lines.slice(a + 1, b).filter((line) => line.trim() === "").length;
}

describe("/token_stats spacing regressions", () => {
	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "token-stats-spacing-test-"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.doUnmock("node:os");
		if (tempHome && fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true, force: true });
	});

	it("leaves a blank-line gap between the main dashboard sections", async () => {
		const handler = await loadTokenStatsHandler();
		await createAnalyticsDb([
			{ timestamp: new Date().toISOString(), agent: "a", model: "m", input_tokens: 1, output_tokens: 1, cost_usd: 0.1, duration_ms: 1000, exit_code: 0 },
			{ timestamp: new Date().toISOString(), agent: "b", model: "n", input_tokens: 1, output_tokens: 1, cost_usd: 0.2, duration_ms: 2000, exit_code: 0 },
		]);

		const rendered: string[][] = [];
		await handler("all", createMockCtx(rendered));
		const out = renderedText(rendered);

		expect(blankLinesBetween(out, "Summary", "By Agent")).toBeGreaterThanOrEqual(2);
		expect(blankLinesBetween(out, "By Agent", "By Model")).toBeGreaterThanOrEqual(2);
		expect(blankLinesBetween(out, "By Model", "Top 5 Expensive Runs")).toBeGreaterThanOrEqual(2);
	});
});
