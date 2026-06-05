const ACTIVE_SUBAGENT_KEY = "__pi_active_subagent_count";

function getStore(): { count: number } {
	const globalStore = globalThis as typeof globalThis & { [ACTIVE_SUBAGENT_KEY]?: { count: number } };
	if (!globalStore[ACTIVE_SUBAGENT_KEY]) {
		globalStore[ACTIVE_SUBAGENT_KEY] = { count: 0 };
	}
	return globalStore[ACTIVE_SUBAGENT_KEY]!;
}

export function incrementActiveSubagentCount(): number {
	const store = getStore();
	store.count += 1;
	return store.count;
}

export function decrementActiveSubagentCount(): number {
	const store = getStore();
	store.count = Math.max(0, store.count - 1);
	return store.count;
}

export function getActiveSubagentCount(): number {
	return getStore().count;
}

export function resetActiveSubagentCount(): void {
	getStore().count = 0;
}
