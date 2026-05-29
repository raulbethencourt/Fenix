/**
 * Shared formatting utilities for token counts and durations.
 */

/**
 * Format a token count for display.
 * - < 1000: raw number ("500")
 * - < 1M: thousands with 1 decimal ("1.5k")
 * - >= 1M: millions with 2 decimals ("1.00M")
 */
export function formatTokens(n: number): string {
	if (n < 1000) return String(n);
	if (n < 1_000_000) return (n / 1000).toFixed(1) + "k";
	return (n / 1_000_000).toFixed(2) + "M";
}

/**
 * Format a duration in milliseconds for display.
 * - < 1s: milliseconds ("500ms")
 * - < 1m: seconds with 1 decimal ("5.0s")
 * - >= 1m: minutes and seconds ("2m30s")
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}
