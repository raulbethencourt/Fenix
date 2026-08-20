import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

type RunRow = {
	timestamp: string;
	session_id?: string;
	agent?: string;
	model?: string | null;
	provider?: string | null;
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
  provider TEXT,
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
			timestamp, session_id, agent, model, provider, task_summary,
			input_tokens, output_tokens, cache_read, cache_write,
			cost_usd, turns, duration_ms, exit_code, cwd
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	for (const row of rows) {
		stmt.run(
			row.timestamp,
			row.session_id ?? crypto.randomUUID(),
			row.agent ?? "agent",
			row.model ?? null,
			row.provider ?? null,
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

describe("/token_stats provider report regressions", () => {
	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "token-stats-provider-test-"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.doUnmock("node:os");
		if (tempHome && fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true, force: true });
	});

	it("keeps slashless model rows in a meaningful provider group instead of collapsing them into unknown", async () => {
		const handler = await loadTokenStatsHandler();
		await createAnalyticsDb([
			{
				timestamp: new Date().toISOString(),
				agent: "coder",
				model: "newvendor/gpt-4.1",
				provider: null,
				input_tokens: 10,
				output_tokens: 20,
				cost_usd: 0.01,
				exit_code: 0,
				task_summary: "slashless model",
			},
		]);

		const rendered: string[][] = [];
		await handler("all", createMockCtx(rendered));
		const out = renderedText(rendered);

		expect(out).toContain("By Provider");
		expect(out).toMatch(/provider/i);
		const providerSection = out.slice(out.indexOf("By Provider"), out.indexOf("By Day"));
		expect(providerSection).not.toContain("unknown");
		expect(providerSection).toMatch(/newvendor|provider/i);
	});

	it("shows meaningful provider labels for legacy rows with null provider in the By Provider report", async () => {
		const handler = await loadTokenStatsHandler();
		await createAnalyticsDb([
			{
				timestamp: new Date().toISOString(),
				agent: "coder",
				model: "newvendor/claude-3.5-sonnet",
				provider: null,
				input_tokens: 42,
				output_tokens: 8,
				cost_usd: 0.02,
				exit_code: 0,
				task_summary: "legacy providerless row",
			},
		]);

		const rendered: string[][] = [];
		await handler("all", createMockCtx(rendered));
		const out = renderedText(rendered);

		expect(out).toContain("By Provider");
		expect(out).toContain("Provider");
		const providerSection = out.slice(out.indexOf("By Provider"), out.indexOf("By Day"));
		expect(providerSection).not.toContain("unknown");
		expect(providerSection).toMatch(/newvendor|provider/i);
	});

	it("orders the report as By Day before By Provider and uses a capitalized Provider header", async () => {
		const handler = await loadTokenStatsHandler();
		const today = new Date().toISOString();
		await createAnalyticsDb([
			{ timestamp: today, agent: "a", model: "m", provider: "anthropic", cost_usd: 0.1, input_tokens: 1, output_tokens: 1 },
		]);

		const rendered: string[][] = [];
		await handler("all", createMockCtx(rendered));
		const out = renderedText(rendered);

		const byDay = out.indexOf("By Day");
		const byProvider = out.indexOf("By Provider");
		const providerHeader = out.indexOf("Provider");

		expect(byDay).toBeGreaterThan(-1);
		expect(byProvider).toBeGreaterThan(-1);
		expect(providerHeader).toBeGreaterThan(-1);
		expect(byProvider).toBeLessThan(byDay);
		expect(out).toContain("Provider");
	});

it("derives provider groups from the model prefix when the provider column is absent", async () => {
		const handler = await loadTokenStatsHandler();
		await createAnalyticsDb([
			{
				timestamp: new Date().toISOString(),
				agent: "coder",
				model: "newvendor/super-model-1",
				provider: null,
				input_tokens: 7,
				output_tokens: 13,
				cost_usd: 0.03,
				exit_code: 0,
				task_summary: "dynamic provider prefix",
			},
		]);

		const rendered: string[][] = [];
		await handler("all", createMockCtx(rendered));
		const out = renderedText(rendered);

		expect(out).toContain("By Provider");
		expect(out).toContain("newvendor");
		const providerSection = out.slice(out.indexOf("By Provider"), out.indexOf("By Day"));
		expect(providerSection).not.toContain("unknown");
	});

});
