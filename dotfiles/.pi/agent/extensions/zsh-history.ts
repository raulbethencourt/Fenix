/**
 * ZSH History Picker
 *
 * Press ctrl+r to open a searchable picker over ~/.zsh_history.
 * - Type to fuzzy-filter
 * - Tab / Shift+Tab (or ↑↓) to navigate
 * - Enter to paste the selected command (prefixed with !) into the editor
 * - Esc to cancel
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, fuzzyFilter, Input, matchesKey, type SelectItem, SelectList, Text } from "@mariozechner/pi-tui";

/**
 * Parse ~/.zsh_history → deduplicated list, most recent first.
 * Handles extended format (`: timestamp:elapsed;cmd`) and backslash continuations.
 */
function parseZshHistory(raw: string): string[] {
	const lines = raw.split("\n");
	const commands: string[] = [];
	const seen = new Set<string>();
	let current = "";

	for (const line of lines) {
		const extMatch = line.match(/^: \d+:\d+;(.*)$/);
		const cmdPart = extMatch ? extMatch[1] : line;

		if (cmdPart.endsWith("\\")) {
			current += (current ? "\n" : "") + cmdPart.slice(0, -1);
		} else {
			current += (current ? "\n" : "") + cmdPart;
			const cmd = current.trim();
			current = "";
			if (cmd && !seen.has(cmd)) {
				seen.add(cmd);
				commands.push(cmd);
			}
		}
	}

	return commands.reverse();
}

export default function (pi: ExtensionAPI) {
	pi.registerShortcut("ctrl+r", {
		description: "Search zsh history",
		handler: async (ctx) => {
			if (!ctx.hasUI) return;

			const historyPath = join(homedir(), ".zsh_history");

			if (!existsSync(historyPath)) {
				ctx.ui.notify("~/.zsh_history not found", "error");
				return;
			}

			let raw: string;
			try {
				raw = readFileSync(historyPath, "latin1");
			} catch {
				ctx.ui.notify("Failed to read ~/.zsh_history", "error");
				return;
			}

			const allCommands = parseZshHistory(raw);
			if (allCommands.length === 0) {
				ctx.ui.notify("No history entries found", "info");
				return;
			}

			const allItems: SelectItem[] = allCommands.map((cmd) => ({ value: cmd, label: cmd }));

			const selected = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
				// ── Search input ────────────────────────────────────────────────
				const input = new Input();
				input.focused = true;
				// Prevent Input's built-in submit/escape from firing
				// (we intercept those keys ourselves before passing to Input)
				input.onSubmit = () => {};
				input.onEscape = () => {};

				// ── List ────────────────────────────────────────────────────────
				const maxVisible = Math.min(allCommands.length, 20);
				const selectList = new SelectList(allItems, maxVisible, {
					selectedPrefix: (t) => theme.fg("accent", t),
					selectedText: (t) => theme.fg("accent", t),
					description: (t) => theme.fg("muted", t),
					scrollInfo: (t) => theme.fg("dim", t),
					noMatch: (t) => theme.fg("warning", t),
				});

				// ── Filter helper ───────────────────────────────────────────────
				function applyFilter(query: string) {
					const filtered = query.trim()
						? fuzzyFilter(allItems, query, (item) => item.value)
						: allItems;
					selectList.filteredItems = filtered;
					selectList.setSelectedIndex(0);
				}

				// ── Navigation helpers ──────────────────────────────────────────
				function moveNext() {
					const len = Math.max(1, selectList.filteredItems.length);
					selectList.setSelectedIndex((selectList.selectedIndex + 1) % len);
				}
				function movePrev() {
					const len = Math.max(1, selectList.filteredItems.length);
					selectList.setSelectedIndex((selectList.selectedIndex - 1 + len) % len);
				}

				// ── Layout ──────────────────────────────────────────────────────
				const container = new Container();
				container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
				container.addChild(
					new Text(
						" " +
							theme.fg("accent", theme.bold("zsh history")) +
							theme.fg("dim", `  ${allCommands.length} entries`),
						0,
						0,
					),
				);
				container.addChild(new DynamicBorder((s) => theme.fg("dim", s)));
				container.addChild(input);
				container.addChild(new DynamicBorder((s) => theme.fg("dim", s)));
				container.addChild(selectList);
				container.addChild(new DynamicBorder((s) => theme.fg("dim", s)));
				container.addChild(
					new Text(
						theme.fg("dim", " tab/shift+tab or ↑↓  •  type to filter  •  enter select  •  esc cancel"),
						0,
						0,
					),
				);
				container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

				return {
					render: (w) => container.render(w),
					invalidate: () => container.invalidate(),
					handleInput: (data) => {
						// Tab → next
						if (matchesKey(data, "tab")) {
							moveNext();
							tui.requestRender();
							return;
						}
						// Shift+Tab → prev
						if (matchesKey(data, "shift+tab")) {
							movePrev();
							tui.requestRender();
							return;
						}
						// Up arrow → prev
						if (matchesKey(data, "up")) {
							movePrev();
							tui.requestRender();
							return;
						}
						// Down arrow → next
						if (matchesKey(data, "down")) {
							moveNext();
							tui.requestRender();
							return;
						}
						// Enter → confirm
						if (matchesKey(data, "enter")) {
							const item = selectList.getSelectedItem();
							done(item ? item.value : null);
							return;
						}
						// Escape → cancel
						if (matchesKey(data, "escape")) {
							done(null);
							return;
						}
						// Everything else → search input
						const before = input.getValue();
						input.handleInput(data);
						const after = input.getValue();
						if (before !== after) {
							applyFilter(after);
						}
						tui.requestRender();
					},
				};
			});

			if (selected !== null) {
				ctx.ui.setEditorText(`!${selected}`);
			}
		},
	});
}
