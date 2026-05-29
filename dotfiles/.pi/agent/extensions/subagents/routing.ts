/**
 * Complexity-based model routing for subagents.
 * Scores task text for complexity signals and optionally overrides the default model.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { isFallbackMode } from "./fallback.ts";

export type ComplexityTier = "simple" | "standard" | "complex";

export interface RoutingConfig {
	[agentName: string]: {
		simple?: string;
		complex?: string;
	};
}

// ── Fallback Configuration ──────────────────────────────────────────────

export interface FallbackConfig {
	simple: string;
	standard: string;
	complex: string;
}

const DEFAULT_FALLBACK: FallbackConfig = {
	simple: "opencode/minimax-m2.5-free",
	standard: "opencode/minimax-m2.5-free",
	complex: "opencode/minimax-m2.5-free",
};

/** Get the fallback model for a given complexity tier */
export function resolveFallbackModel(
	tier: ComplexityTier,
	fallbackConfig: FallbackConfig = DEFAULT_FALLBACK,
): string {
	switch (tier) {
		case "simple":
			return fallbackConfig.simple;
		case "complex":
			return fallbackConfig.complex;
		default:
			return fallbackConfig.standard;
	}
}

// ── Existing Code ────────────────────────────────────────────────────────

// Risk keywords that always trigger "complex"
const RISK_KEYWORDS = [
	/\bauth\b/i,
	/\bsecurity\b/i,
	/\bpayment\b/i,
	/\bcredential/i,
	/\bencrypt/i,
	/\bmigrat/i,
	/\bbreaking\s+change/i,
];

// Complexity keywords
const COMPLEXITY_KEYWORDS = [
	/\bcomplex\b/i,
	/\bnon-trivial\b/i,
	/\barchitectur/i,
	/\bmulti-module\b/i,
	/\bextensive\b/i,
	/\blarge\s+diff\b/i,
	/\bmany\s+files\b/i,
	/\brefactor/i,
	/\bredesign/i,
];

// Count file-like paths in task text (e.g. src/a.ts, app/services/user.ts)
const FILE_PATH_RE = /\b(?:[\w.-]+\/)+[\w.-]+\.\w+\b/g;

// Multi-step indicators
const MULTI_STEP_RE = /\bstep\s+\d/gi;

// Action verbs that indicate coding work
const CODE_ACTION_RE = /\b(add|create|implement|fix|update|refactor|build|write)\b/i;

// Technical nouns that usually imply non-trivial engineering work
const TECHNICAL_NOUN_RE =
	/\b(api|parser|module|middleware|service|database|schema|endpoint|component|function|class|handler|migration|logging|test)s?\b/i;

export function scoreComplexity(task: string): ComplexityTier {
	// 1) Risk keywords always trigger complex
	for (const re of RISK_KEYWORDS) {
		if (re.test(task)) return "complex";
	}

	// 2) Complexity keywords also trigger complex directly
	for (const re of COMPLEXITY_KEYWORDS) {
		if (re.test(task)) return "complex";
	}

	let signals = 0;

	// 3) Remaining signals: file count
	const fileMatches = task.match(FILE_PATH_RE);
	if (fileMatches && fileMatches.length > 5) {
		signals++;
	}

	// 3) Remaining signals: multi-step (more than 3 explicit steps)
	const stepMatches = task.match(MULTI_STEP_RE);
	if (stepMatches && stepMatches.length > 3) {
		signals++;
	}

	// 4) Any remaining signal means complex
	if (signals >= 1) return "complex";

	// 5) Very short tasks are simple unless they clearly describe coding work
	// (code-action verb + technical noun)
	const wordCount = task.trim().split(/\s+/).filter(Boolean).length;
	const hasCodeAction = CODE_ACTION_RE.test(task);
	const hasTechnicalNoun = TECHNICAL_NOUN_RE.test(task);
	if (wordCount <= 10 && !(hasCodeAction && hasTechnicalNoun)) {
		return "simple";
	}

	// 6) Otherwise standard
	return "standard";
}

export function resolveModel(
	defaultModel: string,
	agentName: string,
	task: string,
	routing: RoutingConfig,
	fallbackConfig?: FallbackConfig,
): { model: string; tier: ComplexityTier; usedFallback: boolean } {
	const tier = scoreComplexity(task);

	// If fallback mode is active, skip routing and use fallback
	if (isFallbackMode()) {
		return {
			model: resolveFallbackModel(tier, fallbackConfig ?? DEFAULT_FALLBACK),
			tier,
			usedFallback: true,
		};
	}

	const agentRouting = routing[agentName];

	if (!agentRouting) {
		return { model: defaultModel, tier, usedFallback: false };
	}

	if (tier === "simple" && agentRouting.simple) {
		return { model: agentRouting.simple, tier, usedFallback: false };
	}

	if (tier === "complex" && agentRouting.complex) {
		return { model: agentRouting.complex, tier, usedFallback: false };
	}

	return { model: defaultModel, tier, usedFallback: false };
}

export function loadRoutingConfig(configDir: string): { routing: RoutingConfig; fallback: FallbackConfig } {
	const filePath = path.join(configDir, "routing.json");
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw) as Record<string, any>;
		const { fallback: rawFallback, ...agentRouting } = parsed;

		const fallback: FallbackConfig = {
			simple: rawFallback?.simple ?? DEFAULT_FALLBACK.simple,
			standard:
				rawFallback?.standard ??
				rawFallback?.lastResort ??
				rawFallback?.["last-resort"] ??
				DEFAULT_FALLBACK.standard,
			complex: rawFallback?.complex ?? DEFAULT_FALLBACK.complex,
		};

		return { routing: agentRouting as RoutingConfig, fallback };
	} catch {
		return { routing: {}, fallback: DEFAULT_FALLBACK };
	}
}
