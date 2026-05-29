import { describe, it, expect, vi, beforeEach } from "vitest";
import sugarTestingInit from "../extensions/sugar-testing.ts";

let commandConfig: any = null;
const mockSendUserMessage = vi.fn();
const mockPi = {
	registerCommand(name: string, config: any) {
		if (name === "sugar-test") commandConfig = config;
	},
	sendUserMessage: mockSendUserMessage,
};

sugarTestingInit(mockPi as any);

function createMockCtx(idle = true) {
	return {
		ui: { notify: vi.fn() },
		isIdle: () => idle,
	};
}

describe("sugar-testing extension", () => {
	it("registers /sugar-test command", () => {
		expect(commandConfig).not.toBeNull();
		expect(commandConfig.description).toContain("sugar-test");
	});

	describe("argument parsing", () => {
		it("errors on empty args", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("", ctx);
			expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("Usage"), "error");
		});

		it("errors on invalid test type", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("invalid test-name", ctx);
			expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("Invalid test type"), "error");
		});

		it("errors on missing test name", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("curl", ctx);
			expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("Missing test name"), "error");
		});

		it("errors on type-only with whitespace", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("phpunit   ", ctx);
			expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("Missing test name"), "error");
		});
	});

	describe("successful delegation", () => {
		beforeEach(() => {
			mockSendUserMessage.mockClear();
		});

		it("delegates curl test", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("curl my-test.curl", ctx);
			expect(mockSendUserMessage).toHaveBeenCalled();
			const msg = mockSendUserMessage.mock.calls[0][0];
			expect(msg).toContain("sugar-tester");
			expect(msg).toContain("curl");
			expect(msg).toContain("my-test.curl");
		});

		it("delegates phpunit test", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("phpunit MyTest", ctx);
			expect(mockSendUserMessage).toHaveBeenCalled();
			const msg = mockSendUserMessage.mock.calls[0][0];
			expect(msg).toContain("phpunit");
			expect(msg).toContain("MyTest");
		});

		it("delegates scheduler test", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("scheduler bnsQuoteSendEmail", ctx);
			expect(mockSendUserMessage).toHaveBeenCalled();
			const msg = mockSendUserMessage.mock.calls[0][0];
			expect(msg).toContain("scheduler");
			expect(msg).toContain("bnsQuoteSendEmail");
		});

		it("handles multi-word test names", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("curl path/to/my test.curl", ctx);
			const msg = mockSendUserMessage.mock.calls[0][0];
			expect(msg).toContain("path/to/my test.curl");
		});

		it("is case-insensitive for type", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("CURL my-test", ctx);
			expect(mockSendUserMessage).toHaveBeenCalled();
		});

		it("sends as followUp when not idle", async () => {
			const ctx = createMockCtx(false);
			await commandConfig.handler("curl my-test", ctx);
			expect(mockSendUserMessage).toHaveBeenCalledWith(expect.any(String), { deliverAs: "followUp" });
		});

		it("sends without options when idle", async () => {
			const ctx = createMockCtx(true);
			await commandConfig.handler("curl my-test", ctx);
			expect(mockSendUserMessage).toHaveBeenCalledWith(expect.any(String));
		});

		it("notifies user about delegation", async () => {
			const ctx = createMockCtx();
			await commandConfig.handler("curl my-test", ctx);
			expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining("sugar-tester"), "info");
		});
	});
});
