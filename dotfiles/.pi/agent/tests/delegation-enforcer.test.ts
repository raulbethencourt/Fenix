import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import enforcerInit from "../extensions/delegation-enforcer/index.ts";

describe("delegation-enforcer", () => {
	let toolCallHandler: ((event: any) => Promise<any>) | null;
	let commandHandler: ((args: string, ctx: any) => Promise<void>) | null;

	function createMockPi() {
		toolCallHandler = null;
		commandHandler = null;
		return {
			on(event: string, handler: any) {
				if (event === "tool_call") toolCallHandler = handler;
			},
			registerCommand(name: string, config: any) {
				if (name === "delegation") commandHandler = config.handler;
			},
		};
	}

	const originalDepth = process.env.PI_SUBAGENT_DEPTH;

	afterEach(() => {
		if (originalDepth === undefined) {
			delete process.env.PI_SUBAGENT_DEPTH;
		} else {
			process.env.PI_SUBAGENT_DEPTH = originalDepth;
		}
	});

	describe("activation", () => {
		it("activates at depth 0", () => {
			process.env.PI_SUBAGENT_DEPTH = "0";
			enforcerInit(createMockPi() as any);
			expect(toolCallHandler).not.toBeNull();
		});

		it("activates when PI_SUBAGENT_DEPTH is unset", () => {
			delete process.env.PI_SUBAGENT_DEPTH;
			enforcerInit(createMockPi() as any);
			expect(toolCallHandler).not.toBeNull();
		});

		it("does NOT activate at depth 1", () => {
			process.env.PI_SUBAGENT_DEPTH = "1";
			enforcerInit(createMockPi() as any);
			expect(toolCallHandler).toBeNull();
		});

		it("does NOT activate at depth 2", () => {
			process.env.PI_SUBAGENT_DEPTH = "2";
			enforcerInit(createMockPi() as any);
			expect(toolCallHandler).toBeNull();
		});
	});

	describe("tool blocking", () => {
		beforeEach(() => {
			process.env.PI_SUBAGENT_DEPTH = "0";
			enforcerInit(createMockPi() as any);
		});

		it("allows subagent", async () => {
			const result = await toolCallHandler!({ toolName: "subagent" });
			expect(result).toBeUndefined();
		});

		it("allows ask_user_question", async () => {
			const result = await toolCallHandler!({ toolName: "ask_user_question" });
			expect(result).toBeUndefined();
		});

		it("blocks read", async () => {
			const result = await toolCallHandler!({ toolName: "read" });
			expect(result.block).toBe(true);
			expect(result.reason).toContain("read");
			expect(result.reason).toContain("Delegate via subagent");
		});

		it("blocks write", async () => {
			const result = await toolCallHandler!({ toolName: "write" });
			expect(result.block).toBe(true);
		});

		it("blocks edit", async () => {
			const result = await toolCallHandler!({ toolName: "edit" });
			expect(result.block).toBe(true);
		});

		it("blocks bash", async () => {
			const result = await toolCallHandler!({ toolName: "bash" });
			expect(result.block).toBe(true);
		});

		it("blocks grep", async () => {
			const result = await toolCallHandler!({ toolName: "grep" });
			expect(result.block).toBe(true);
		});

		it("includes available agents in reason", async () => {
			const result = await toolCallHandler!({ toolName: "read" });
			expect(result.reason).toContain("scout");
			expect(result.reason).toContain("worker");
			expect(result.reason).toContain("planner");
		});
	});

	describe("bypass toggle", () => {
		beforeEach(() => {
			process.env.PI_SUBAGENT_DEPTH = "0";
			enforcerInit(createMockPi() as any);
		});

		it("allows blocked tools after bypass", async () => {
			const mockCtx = { ui: { notify: vi.fn() } };
			await commandHandler!("", mockCtx);
			const result = await toolCallHandler!({ toolName: "read" });
			expect(result).toBeUndefined();
		});

		it("re-blocks after second toggle", async () => {
			const mockCtx = { ui: { notify: vi.fn() } };
			await commandHandler!("", mockCtx); // bypass on
			await commandHandler!("", mockCtx); // bypass off
			const result = await toolCallHandler!({ toolName: "read" });
			expect(result.block).toBe(true);
		});

		it("notifies on bypass enable", async () => {
			const mockCtx = { ui: { notify: vi.fn() } };
			await commandHandler!("", mockCtx);
			expect(mockCtx.ui.notify).toHaveBeenCalledWith(
				expect.stringContaining("BYPASSED"),
				"warning"
			);
		});

		it("notifies on bypass disable", async () => {
			const mockCtx = { ui: { notify: vi.fn() } };
			await commandHandler!("", mockCtx); // on
			await commandHandler!("", mockCtx); // off
			expect(mockCtx.ui.notify).toHaveBeenLastCalledWith(
				expect.stringContaining("ACTIVE"),
				"success"
			);
		});
	});
});
