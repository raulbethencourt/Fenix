import { describe, expect, it } from "vitest";
import { detectRetryState, hasRateLimitSignal } from "../extensions/subagents/runner.ts";

describe("subagents runner retry detection", () => {
	it("detects rate-limit and quota messages", () => {
		expect(detectRetryState("429 Too Many Requests")).toBe("rate-limited");
		expect(detectRetryState("provider rate limit exceeded")).toBe("rate-limited");
		expect(detectRetryState("quota exceeded for this request")).toBe("rate-limited");
	});

	it("detects retry/backoff messages", () => {
		expect(detectRetryState("retrying after transient error")).toBe("retrying");
		expect(detectRetryState("backing off before next attempt")).toBe("retrying");
	});

	it("treats 403/429 exit codes as rate-limit signals", () => {
		expect(hasRateLimitSignal("", 429)).toBe(true);
		expect(hasRateLimitSignal("", 403)).toBe(true);
		expect(hasRateLimitSignal("permission denied", 1)).toBe(false);
	});
});
