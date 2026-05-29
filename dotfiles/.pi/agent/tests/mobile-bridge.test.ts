import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { EventEmitter } from "events";

let actualChildProcess: any;
let spawnMock: any;
let spawnSyncMock: any;

vi.mock("node:child_process", async () => {
  actualChildProcess = await vi.importActual("node:child_process");

  return {
    ...actualChildProcess,
    spawn: (...args: any[]) => {
      if (typeof spawnMock !== "function") {
        throw new Error("spawn mock not initialized");
      }
      return spawnMock(...args);
    },
    spawnSync: (...args: any[]) => {
      if (typeof spawnSyncMock === "function") {
        return spawnSyncMock(...args);
      }
      return actualChildProcess.spawnSync(...args);
    },
  };
});

/**
 * Phase 0 Mobile Bridge Tests
 * Target: /home/rabeta/.pi/agent/extensions/mobile-bridge/index.ts
 * 
 * Tests smoke-test pi SDK integration:
 * - Command registration: /mobile
 * - Subcommands: smoke, status
 * - agent_end hook for capturing assistant responses
 * - Smoke test flow: send message → capture response → notify success
 * 
 * Phase 0 HTTP Layer Tests:
 * - session_start/shutdown hooks for HTTP server lifecycle
 * - GET /health endpoint
 * - POST /send with token authentication
 * - POST /send with busy/queued state
 * - GET /answers endpoint with response history
 */

describe("Mobile Bridge Extension", () => {
  let mockPi: ExtensionAPI;
  let registeredCommands: Map<string, { description: string; handler: Function }>;
  let registeredHooks: Map<string, Function[]>;
  let mobileBridgeModule: any;
  let mockChildProcesses: any[];

  beforeEach(async () => {
    // Keep existing tests on HTTP unless they opt into HTTPS explicitly.
    process.env.PI_MOBILE_BRIDGE_HTTPS = "0";

    // Reset mocks
    registeredCommands = new Map();
    registeredHooks = new Map();
    mockChildProcesses = [];
    
    // Mock child_process spawn for KDE Connect tests
    spawnMock = vi.fn((command: string, args: string[]) => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = vi.fn();
      mockChild.unref = vi.fn();
      mockChildProcesses.push({ command, args, child: mockChild });
      
      // Simulate successful spawn by default
      setTimeout(() => mockChild.emit('exit', 0), 10);
      
      return mockChild;
    });

    spawnSyncMock = vi.fn((command: string, args: string[], options?: any) => {
      if (command === "openssl") {
        return actualChildProcess.spawnSync(command, args, options);
      }

      return {
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from(""), Buffer.from("")],
      };
    });

    vi.resetModules();

    // Mock pi SDK
    mockPi = {
      registerCommand: vi.fn((name: string, opts: any) => {
        registeredCommands.set(name, opts);
      }),
      on: vi.fn((event: string, handler: Function) => {
        if (!registeredHooks.has(event)) {
          registeredHooks.set(event, []);
        }
        registeredHooks.get(event)!.push(handler);
      }),
      sendUserMessage: vi.fn(),
    } as any;

    // Import and initialize the extension
    try {
      mobileBridgeModule = await import("../extensions/mobile-bridge/index.ts");
      mobileBridgeModule.default(mockPi);
    } catch (error) {
      // Expected to fail in RED phase - extension doesn't exist yet
      mobileBridgeModule = null;
    }
  });

  afterEach(() => {
    // Clean up any lingering child processes
    mockChildProcesses.forEach(({ child }) => {
      if (child.kill) child.kill();
    });
    vi.clearAllMocks();
    delete process.env.PI_MOBILE_BRIDGE_HOST;
    delete process.env.PI_MOBILE_BRIDGE_PORT;
    delete process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID;
    delete process.env.PI_MOBILE_BRIDGE_HTTPS;
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  });

  it("registers 'mobile' slash command", () => {
    expect(mockPi.registerCommand).toHaveBeenCalledWith(
      "mobile",
      expect.objectContaining({
        description: expect.any(String),
        handler: expect.any(Function),
      })
    );
    expect(registeredCommands.has("mobile")).toBe(true);
  });

  it("registers 'agent_end' event hook", () => {
    expect(mockPi.on).toHaveBeenCalledWith("agent_end", expect.any(Function));
    expect(registeredHooks.has("agent_end")).toBe(true);
    expect(registeredHooks.get("agent_end")!.length).toBeGreaterThan(0);
  });

  it("registers 'session_start' event hook", () => {
    expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
    expect(registeredHooks.has("session_start")).toBe(true);
  });

  it("registers 'session_shutdown' event hook", () => {
    expect(mockPi.on).toHaveBeenCalledWith("session_shutdown", expect.any(Function));
    expect(registeredHooks.has("session_shutdown")).toBe(true);
  });

  it("registers 'agent_start' event hook", () => {
    expect(mockPi.on).toHaveBeenCalledWith("agent_start", expect.any(Function));
    expect(registeredHooks.has("agent_start")).toBe(true);
  });

  describe("/mobile smoke", () => {
    it("sends exact smoke test prompt via sendUserMessage", async () => {
      const mobileCommand = registeredCommands.get("mobile");
      expect(mobileCommand).toBeDefined();

      const mockCtx: ExtensionCommandContext = {
        ui: { notify: vi.fn() },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("smoke", mockCtx);

      expect(mockPi.sendUserMessage).toHaveBeenCalledWith(
        'Reply exactly: MOBILE_BRIDGE_SMOKE_OK'
      );
    });

    it("notifies user that smoke test started", async () => {
      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("smoke", mockCtx);

      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringContaining("smoke")
      );
    });
  });

  describe("agent_end hook", () => {
    it("extracts assistant text from string content", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      expect(agentEndHandlers).toBeDefined();
      
      const handler = agentEndHandlers![0];
      const event = {
        messages: [
          { role: "user", content: "test question" },
          { role: "assistant", content: "MOBILE_BRIDGE_SMOKE_OK" },
        ],
      };

      await handler(event);
      
      // Should have captured and stored the response
      // (Internal state verification - will be checked via /mobile status)
    });

    it("extracts assistant text from array content with text parts", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      const handler = agentEndHandlers![0];
      
      const event = {
        messages: [
          {
            role: "assistant",
            content: [
              { type: "text", text: "Response: " },
              { type: "text", text: "MOBILE_BRIDGE_SMOKE_OK" },
            ],
          },
        ],
      };

      await handler(event);
      
      // Should extract and concatenate text parts
    });

    it("ignores non-assistant messages gracefully", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      const handler = agentEndHandlers![0];
      
      const event = {
        messages: [
          { role: "user", content: "only user message" },
          { role: "system", content: "system message" },
        ],
      };

      // Should not throw
      await expect(handler(event)).resolves.not.toThrow();
    });

    it("notifies success when smoke test token is detected", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      const handler = agentEndHandlers![0];

      // First trigger smoke test to set pending state
      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("smoke", mockCtx);

      // Clear previous notify calls
      mockNotify.mockClear();

      // Now simulate agent_end with success response
      const event = {
        messages: [
          { role: "assistant", content: "MOBILE_BRIDGE_SMOKE_OK" },
        ],
      };

      // The extension should have access to ctx.ui.notify through closure or state
      // This tests integration - the handler should notify on success
      await handler(event);

      // Note: This test expects the extension to maintain context/state
      // to correlate agent_end with pending smoke test
    });

    it("does not notify when smoke token absent", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      const handler = agentEndHandlers![0];

      const event = {
        messages: [
          { role: "assistant", content: "Normal response without token" },
        ],
      };

      // Should not throw and should not notify about smoke success
      await expect(handler(event)).resolves.not.toThrow();
    });
  });

  describe("/mobile status", () => {
    it("returns status information including last captured answer", async () => {
      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Trigger status command
      await mobileCommand!.handler("status", mockCtx);

      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringContaining("status")
      );
    });

    it("shows last captured answer after agent_end", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      const handler = agentEndHandlers![0];

      // Simulate agent_end with a response
      const event = {
        messages: [
          { role: "assistant", content: "Test response captured" },
        ],
      };
      await handler(event);

      // Now check status
      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("status", mockCtx);

      // Should include the captured response in status
      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringMatching(/Test response captured|captured/)
      );
    });

    it("handles status when no messages captured yet", async () => {
      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Status before any agent_end
      await mobileCommand!.handler("status", mockCtx);

      // Should not throw and should indicate no messages yet
      expect(mockNotify).toHaveBeenCalled();
    });

    it("prefers LAN IP URL when PI_MOBILE_BRIDGE_HOST is set", async () => {
      // Set LAN IP override
      process.env.PI_MOBILE_BRIDGE_HOST = "192.168.1.20";
      process.env.PI_MOBILE_BRIDGE_PORT = "0";

      // Reinitialize extension with new env
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Check status output
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("status", mockCtx);

      // Should contain LAN IP in URL
      const statusCall = mockNotify.mock.calls.find((call) =>
        call[0].includes("http://")
      );
      expect(statusCall).toBeDefined();
      expect(statusCall[0]).toMatch(/http:\/\/192\.168\.1\.20:\d+\/\?token=[a-f0-9]+/);
    });
  });

  describe("KDE Connect Notifications", () => {
    it("sends notification via kdeconnect-cli spawn on agent_end with assistant answer", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      expect(agentEndHandlers).toBeDefined();

      const event = {
        messages: [
          { role: "assistant", content: "This is the assistant's response." },
        ],
      };

      await agentEndHandlers![0](event);

      // Should have spawned kdeconnect-cli
      expect(spawnMock).toHaveBeenCalledWith(
        "kdeconnect-cli",
        expect.arrayContaining(["--ping-msg"]),
        expect.any(Object)
      );
    });

    it("truncates notification preview to ~80 characters", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      
      const longResponse = "A".repeat(200); // 200 char response
      const event = {
        messages: [
          { role: "assistant", content: longResponse },
        ],
      };

      await agentEndHandlers![0](event);

      // Check that the preview argument is truncated
      expect(spawnMock).toHaveBeenCalled();
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli"
      );
      expect(spawnCall).toBeDefined();
      
      const args = spawnCall[1];
      const previewIndex = args.indexOf("--ping-msg") + 1;
      expect(previewIndex).toBeGreaterThan(0);
      
      const preview = args[previewIndex];
      expect(preview.length).toBeLessThanOrEqual(85); // Allow for ellipsis
      expect(preview.length).toBeGreaterThan(0);
    });

    it("passes notification as argument array not shell string", async () => {
      const agentEndHandlers = registeredHooks.get("agent_end");
      
      const event = {
        messages: [
          { role: "assistant", content: "Test; echo 'injection'; rm -rf /" },
        ],
      };

      await agentEndHandlers![0](event);

      // Verify spawn was called with args array, not exec string
      expect(spawnMock).toHaveBeenCalledWith(
        "kdeconnect-cli",
        expect.any(Array),
        expect.any(Object)
      );
      
      // Verify the dangerous chars are in the array element, not interpreted
      const spawnCall = spawnMock.mock.calls[0];
      expect(Array.isArray(spawnCall[1])).toBe(true);
    });

    it("does not throw when kdeconnect-cli spawn errors", async () => {
      // Make spawn emit error
      spawnMock.mockImplementation((command: string, args: string[]) => {
        const mockChild = new EventEmitter() as any;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = vi.fn();
        
        setTimeout(() => mockChild.emit('error', new Error('Command not found')), 10);
        
        return mockChild;
      });

      const agentEndHandlers = registeredHooks.get("agent_end");
      const event = {
        messages: [
          { role: "assistant", content: "Test response" },
        ],
      };

      // Should not throw
      await expect(agentEndHandlers![0](event)).resolves.not.toThrow();
    });

    it("does not throw when kdeconnect-cli exits nonzero", async () => {
      // Make spawn exit with error code
      spawnMock.mockImplementation((command: string, args: string[]) => {
        const mockChild = new EventEmitter() as any;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = vi.fn();
        
        setTimeout(() => mockChild.emit('exit', 1), 10);
        
        return mockChild;
      });

      const agentEndHandlers = registeredHooks.get("agent_end");
      const event = {
        messages: [
          { role: "assistant", content: "Test response" },
        ],
      };

      // Should not throw
      await expect(agentEndHandlers![0](event)).resolves.not.toThrow();
    });
  });

  describe("Phase 0: HTTP Server", () => {
    let serverUrl: string;
    let token: string;
    let port: number;

    beforeEach(async () => {
      // Set ephemeral port for testing
      process.env.PI_MOBILE_BRIDGE_PORT = "0";
    });

    const startServer = async () => {
      const sessionStartHandlers = registeredHooks.get("session_start");
      expect(sessionStartHandlers).toBeDefined();
      
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Trigger session_start
      await sessionStartHandlers![0]({}, mockCtx);

      // Now trigger /mobile status to get the URL
      const mobileCommand = registeredCommands.get("mobile");
      await mobileCommand!.handler("status", mockCtx);

      // Parse URL from notification
      const statusCall = mockNotify.mock.calls.find((call) =>
        call[0].includes("http://")
      );
      expect(statusCall).toBeDefined();
      
      const urlMatch = statusCall[0].match(/http:\/\/[^\s]+:(\d+)\/\?token=([a-f0-9]+)/);
      expect(urlMatch).not.toBeNull();
      
      port = parseInt(urlMatch[1], 10);
      token = urlMatch[2];
      serverUrl = `http://127.0.0.1:${port}`;
    };

    const shutdownServer = async () => {
      const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
      if (sessionShutdownHandlers) {
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: vi.fn() },
          cwd: "/test",
          model: "test-model",
        } as any;
        await sessionShutdownHandlers[0]({}, mockCtx);
      }
    };

    it("session_start starts HTTP server and notifies URL with token", async () => {
      await startServer();
      
      expect(serverUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(port).toBeGreaterThan(0);
      expect(token).toMatch(/^[a-f0-9]+$/);
      expect(token.length).toBeGreaterThanOrEqual(32);

      await shutdownServer();
    });

    it("GET /health returns alive status", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty("alive", true);

      await shutdownServer();
    });

    it("POST /send rejects invalid token with 401", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid", message: "test" }),
      });

      expect(response.status).toBe(401);

      await shutdownServer();
    });

    it("POST /send with valid token calls pi.sendUserMessage", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: "test message" }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("queued", false);

      expect(mockPi.sendUserMessage).toHaveBeenCalledWith("test message");

      await shutdownServer();
    });

    it("POST /send when busy queues message with deliverAs followUp", async () => {
      await startServer();

      // Trigger agent_start to mark as busy
      const agentStartHandlers = registeredHooks.get("agent_start");
      expect(agentStartHandlers).toBeDefined();
      await agentStartHandlers![0]({});

      const response = await fetch(`${serverUrl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: "queued message" }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("queued", true);

      expect(mockPi.sendUserMessage).toHaveBeenCalledWith(
        "queued message",
        { deliverAs: "followUp" }
      );

      // Mark not busy
      const agentEndHandlers = registeredHooks.get("agent_end");
      await agentEndHandlers![0]({ messages: [] });

      await shutdownServer();
    });

    it("GET /answers returns last assistant responses (max 10)", async () => {
      await startServer();

      // Simulate multiple agent_end events with responses
      const agentEndHandlers = registeredHooks.get("agent_end");
      
      for (let i = 1; i <= 12; i++) {
        await agentEndHandlers![0]({
          messages: [
            { role: "assistant", content: `Response ${i}` },
          ],
        });
      }

      const response = await fetch(`${serverUrl}/answers?token=${token}`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty("answers");
      expect(Array.isArray(data.answers)).toBe(true);
      expect(data.answers.length).toBeLessThanOrEqual(10);
      
      // Should contain last 10 responses (3-12)
      expect(data.answers[data.answers.length - 1]).toContain("Response 12");

      await shutdownServer();
    });

    it("GET /answers rejects invalid token with 401", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/answers?token=invalid`);
      expect(response.status).toBe(401);

      await shutdownServer();
    });

    it("session_shutdown closes HTTP server", async () => {
      await startServer();

      // Verify server is running
      let response = await fetch(`${serverUrl}/health`);
      expect(response.ok).toBe(true);

      // Shutdown server
      await shutdownServer();

      // Verify server is closed - fetch should fail
      await expect(fetch(`${serverUrl}/health`)).rejects.toThrow();
    });

    it("POST /send rate limiting: returns 429 after 10 requests from same client", async () => {
      await startServer();

      // Make 10 successful requests
      for (let i = 0; i < 10; i++) {
        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: `message ${i}` }),
        });
        expect(response.ok).toBe(true);
      }

      // 11th request should be rate limited
      const response = await fetch(`${serverUrl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: "rate limited" }),
      });

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toMatch(/rate limit/i);

      await shutdownServer();
    });
  });

  describe("command argument handling", () => {
    it("handles unknown subcommands gracefully", async () => {
      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Should not throw
      await expect(
        mobileCommand!.handler("unknown", mockCtx)
      ).resolves.not.toThrow();
    });

    it("handles empty args (shows help or status)", async () => {
      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("", mockCtx);

      expect(mockNotify).toHaveBeenCalled();
    });
  });

  describe("/mobile link", () => {
    const startServer = async () => {
      const sessionStartHandlers = registeredHooks.get("session_start");
      expect(sessionStartHandlers).toBeDefined();
      
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);
      return mockNotify;
    };

    beforeEach(() => {
      process.env.PI_MOBILE_BRIDGE_PORT = "0";
      process.env.PI_MOBILE_BRIDGE_HOST = "192.168.1.30";
    });

    it("sends bridge URL to phone via kdeconnect-cli with --share flag", async () => {
      await startServer();

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("link", mockCtx);

      // Assert kdeconnect-cli was spawned
      expect(spawnMock).toHaveBeenCalledWith(
        "kdeconnect-cli",
        expect.arrayContaining(["--share"]),
        expect.objectContaining({ stdio: "ignore" })
      );

      // Verify the URL format
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();
      
      const args = spawnCall[1];
      const shareIndex = args.indexOf("--share");
      expect(shareIndex).toBeGreaterThanOrEqual(0);
      
      const url = args[shareIndex + 1];
      expect(url).toMatch(/^http:\/\/192\.168\.1\.30:\d+\/\?token=[a-f0-9]+$/);
    });

    it("uses safe spawn with arg array not shell exec", async () => {
      await startServer();

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("link", mockCtx);

      // Verify spawn was called with args array, not shell string
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli"
      );
      expect(spawnCall).toBeDefined();
      expect(Array.isArray(spawnCall[1])).toBe(true);
      
      // Verify stdio: "ignore" option
      expect(spawnCall[2]).toHaveProperty("stdio", "ignore");
    });

    it("notifies user that link was sent", async () => {
      await startServer();

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("link", mockCtx);

      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringMatching(/sent|link/i)
      );
    });

    it("does not spawn if server is not running", async () => {
      // Don't start server
      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("link", mockCtx);

      // Should not have spawned kdeconnect-cli
      const kdeconnectSpawn = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(kdeconnectSpawn).toBeUndefined();

      // Should notify that bridge is not running
      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringMatching(/not running|bridge.*not.*running/i)
      );
    });

    it("does not throw if spawn errors", async () => {
      await startServer();

      // Make spawn throw error
      spawnMock.mockImplementationOnce((command: string, args: string[]) => {
        const mockChild = new EventEmitter() as any;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = vi.fn();
        
        setTimeout(() => mockChild.emit('error', new Error('kdeconnect-cli not found')), 10);
        
        return mockChild;
      });

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Should not throw
      await expect(
        mobileCommand!.handler("link", mockCtx)
      ).resolves.not.toThrow();
    });

    it("does not throw if kdeconnect-cli exits nonzero", async () => {
      await startServer();

      // Make spawn exit with error code
      spawnMock.mockImplementationOnce((command: string, args: string[]) => {
        const mockChild = new EventEmitter() as any;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = vi.fn();
        
        setTimeout(() => mockChild.emit('exit', 1), 10);
        
        return mockChild;
      });

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Should not throw
      await expect(
        mobileCommand!.handler("link", mockCtx)
      ).resolves.not.toThrow();
    });

    it("includes -d <device_id> when PI_MOBILE_BRIDGE_KDE_DEVICE_ID is set", async () => {
      process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID = "a648fd25583644aa9c89057dfb068171";
      await startServer();

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await mobileCommand!.handler("link", mockCtx);

      // Assert kdeconnect-cli was spawned with -d flag and device ID
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();

      const args = spawnCall[1];
      expect(args).toContain("--share");
      expect(args).toContain("-d");
      expect(args).toContain("a648fd25583644aa9c89057dfb068171");

      // Verify the URL is still present
      const shareIndex = args.indexOf("--share");
      const url = args[shareIndex + 1];
      expect(url).toMatch(/^http:\/\/192\.168\.1\.30:\d+\/\?token=[a-f0-9]+$/);
    });
  });

  describe("KDE Connect device ID handling", () => {
    it("includes -d <device_id> in agent_end notification when PI_MOBILE_BRIDGE_KDE_DEVICE_ID is set", async () => {
      process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID = "a648fd25583644aa9c89057dfb068171";

      const agentEndHandlers = registeredHooks.get("agent_end");
      expect(agentEndHandlers).toBeDefined();

      const event = {
        messages: [
          { role: "assistant", content: "This is the assistant's response." },
        ],
      };

      await agentEndHandlers![0](event);

      // Assert kdeconnect-cli was spawned with -d flag and device ID
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--ping-msg")
      );
      expect(spawnCall).toBeDefined();

      const args = spawnCall[1];
      expect(args).toContain("--ping-msg");
      expect(args).toContain("-d");
      expect(args).toContain("a648fd25583644aa9c89057dfb068171");

      // Verify the preview is still present
      const previewIndex = args.indexOf("--ping-msg") + 1;
      expect(previewIndex).toBeGreaterThan(0);
      const preview = args[previewIndex];
      expect(preview).toBeTruthy();
      expect(preview.length).toBeGreaterThan(0);
    });
  });

  describe("RED: Automatic KDE Connect Device ID Detection", () => {
    /**
     * These tests validate automatic device ID detection when
     * PI_MOBILE_BRIDGE_KDE_DEVICE_ID env var is not set.
     * 
     * Expected behavior:
     * 1. If env var is set, use it (already tested in previous blocks)
     * 2. If env var is missing, run kdeconnect-cli --list-devices --id-only via spawnSync
     * 3. Use first non-empty line as device ID
     * 4. /mobile link should include -d <autoDetectedId>
     * 5. agent_end notification should include -d <autoDetectedId>
     * 6. If detection fails/empty, fallback to no -d flag
     */

    beforeEach(() => {
      // Mock spawnSync in addition to spawn
      spawnSyncMock = vi.fn(() => ({
        stdout: Buffer.from("a648fd25583644aa9c89057dfb068171\n"),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from("a648fd25583644aa9c89057dfb068171\n"), Buffer.from("")],
      }));

      // Ensure env var is NOT set for these tests
      delete process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID;
      // Use ephemeral port for HTTP server
      process.env.PI_MOBILE_BRIDGE_PORT = "0";
      process.env.PI_MOBILE_BRIDGE_HOST = "192.168.1.30";
    });

    afterEach(async () => {
      // Clean up HTTP server if running
      const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
      if (sessionShutdownHandlers && sessionShutdownHandlers.length > 0) {
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: vi.fn() },
          cwd: "/test",
          model: "test-model",
        } as any;
        try {
          await sessionShutdownHandlers[0]({}, mockCtx);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    it("RED: detects device ID via spawnSync when env var not set", async () => {
      // Start server to initialize extension
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile link
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      // Assert spawnSync was called with correct command
      expect(spawnSyncMock).toHaveBeenCalledWith(
        "kdeconnect-cli",
        ["--list-devices", "--id-only"],
        expect.any(Object)
      );
    });

    it("RED: /mobile link includes -d with auto-detected device ID", async () => {
      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile link
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      // Assert spawn was called with -d and auto-detected ID
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();

      const args = spawnCall[1];
      expect(args).toContain("-d");
      expect(args).toContain("a648fd25583644aa9c89057dfb068171");
      expect(args).toContain("--share");

      // Verify URL is still present
      const shareIndex = args.indexOf("--share");
      const url = args[shareIndex + 1];
      expect(url).toMatch(/^http:\/\//);
    });

    it("RED: agent_end notification includes -d with auto-detected device ID", async () => {
      // Initialize extension (device ID detection happens on init or first use)
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Clear spawn mock to focus on agent_end notification
      spawnMock.mockClear();

      // Trigger agent_end with assistant response
      const agentEndHandlers = registeredHooks.get("agent_end");
      const event = {
        messages: [
          { role: "assistant", content: "Test response for notification" },
        ],
      };

      await agentEndHandlers![0](event);

      // Assert spawn was called with -d and auto-detected ID
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--ping-msg")
      );
      expect(spawnCall).toBeDefined();

      const args = spawnCall[1];
      expect(args).toContain("-d");
      expect(args).toContain("a648fd25583644aa9c89057dfb068171");
      expect(args).toContain("--ping-msg");

      // Verify preview is still present
      const previewIndex = args.indexOf("--ping-msg") + 1;
      expect(previewIndex).toBeGreaterThan(0);
      const preview = args[previewIndex];
      expect(preview).toBeTruthy();
    });

    it("RED: fallback to no -d flag when spawnSync returns empty stdout", async () => {
      // Mock spawnSync to return empty output
      spawnSyncMock.mockReturnValue({
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from(""), Buffer.from("")],
      });

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile link
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      // Assert spawn was called WITHOUT -d flag
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();

      const args = spawnCall[1];
      expect(args).toContain("--share");
      expect(args).not.toContain("-d");
    });

    it("RED: fallback to no -d flag when spawnSync exits with error status", async () => {
      // Mock spawnSync to return error status
      spawnSyncMock.mockReturnValue({
        stdout: Buffer.from(""),
        stderr: Buffer.from("kdeconnect-cli: command not found"),
        status: 127,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from(""), Buffer.from("kdeconnect-cli: command not found")],
      });

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile link
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      // Assert spawn was called WITHOUT -d flag
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();

      const args = spawnCall[1];
      expect(args).toContain("--share");
      expect(args).not.toContain("-d");
    });

    it("RED: fallback to no -d flag in agent_end when detection fails", async () => {
      // Mock spawnSync to fail
      spawnSyncMock.mockReturnValue({
        stdout: Buffer.from(""),
        stderr: Buffer.from("error"),
        status: 1,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from(""), Buffer.from("error")],
      });

      // Initialize extension
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Clear spawn mock
      spawnMock.mockClear();

      // Trigger agent_end
      const agentEndHandlers = registeredHooks.get("agent_end");
      const event = {
        messages: [
          { role: "assistant", content: "Test response" },
        ],
      };

      await agentEndHandlers![0](event);

      // Assert spawn was called WITHOUT -d flag
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--ping-msg")
      );
      expect(spawnCall).toBeDefined();

      const args = spawnCall[1];
      expect(args).toContain("--ping-msg");
      expect(args).not.toContain("-d");
    });

    it("RED: uses first non-empty line from spawnSync output with multiple lines", async () => {
      // Mock spawnSync to return multiple device IDs (edge case)
      spawnSyncMock.mockReturnValue({
        stdout: Buffer.from("a648fd25583644aa9c89057dfb068171\nb12345678901234567890123456789ab\n"),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from("a648fd25583644aa9c89057dfb068171\nb12345678901234567890123456789ab\n"), Buffer.from("")],
      });

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile link
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      // Assert spawn was called with FIRST device ID only
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();

      const args = spawnCall[1];
      expect(args).toContain("-d");
      expect(args).toContain("a648fd25583644aa9c89057dfb068171");
      expect(args).not.toContain("b12345678901234567890123456789ab");
    });

    it("RED: does not throw when spawnSync throws exception", async () => {
      // Mock spawnSync to throw exception
      spawnSyncMock.mockImplementation(() => {
        throw new Error("ENOENT: kdeconnect-cli not found");
      });

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Should not throw
      await expect(sessionStartHandlers![0]({}, mockCtx)).resolves.not.toThrow();

      // Trigger /mobile link - should work without -d
      const mobileCommand = registeredCommands.get("mobile");
      await expect(mobileCommand!.handler("link", mockCtx)).resolves.not.toThrow();
    });
  });

  describe("RED: KDE Device Diagnostics in Status and Notifications", () => {
    /**
     * These tests validate KDE device information surfacing in commands.
     * 
     * Expected behavior:
     * 1. /mobile status notification includes KDE device ID when detected (env or auto-detect)
     * 2. /mobile link notification includes target device ID being used
     * 3. New /mobile devices command shows detected KDE device ID or "no KDE device" message
     * 
     * Use PI_MOBILE_BRIDGE_KDE_DEVICE_ID=a648fd25583644aa9c89057dfb068171 for deterministic tests
     */

    it("RED: /mobile status includes KDE device ID when PI_MOBILE_BRIDGE_KDE_DEVICE_ID is set", async () => {
      process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID = "a648fd25583644aa9c89057dfb068171";
      process.env.PI_MOBILE_BRIDGE_PORT = "0";

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile status
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("status", mockCtx);

      // Assert notification includes device ID
      expect(mockNotify).toHaveBeenCalled();
      const statusNotification = mockNotify.mock.calls.find((call: any[]) =>
        call[0].toLowerCase().includes("kde") || call[0].includes("a648fd25583644aa9c89057dfb068171")
      );
      expect(statusNotification).toBeDefined();
      expect(statusNotification[0]).toMatch(/kde.*a648fd25583644aa9c89057dfb068171|a648fd25583644aa9c89057dfb068171/i);
    });

    it("RED: /mobile status includes auto-detected KDE device ID when env not set", async () => {
      delete process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID;
      process.env.PI_MOBILE_BRIDGE_PORT = "0";

      // Mock spawnSync to return device ID
      spawnSyncMock = vi.fn(() => ({
        stdout: Buffer.from("a648fd25583644aa9c89057dfb068171\n"),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from("a648fd25583644aa9c89057dfb068171\n"), Buffer.from("")],
      }));

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile status
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("status", mockCtx);

      // Assert notification includes auto-detected device ID
      expect(mockNotify).toHaveBeenCalled();
      const statusNotification = mockNotify.mock.calls.find((call: any[]) =>
        call[0].toLowerCase().includes("kde") || call[0].includes("a648fd25583644aa9c89057dfb068171")
      );
      expect(statusNotification).toBeDefined();
      expect(statusNotification[0]).toMatch(/kde.*a648fd25583644aa9c89057dfb068171|a648fd25583644aa9c89057dfb068171/i);
    });

    it("RED: /mobile status shows 'no KDE device' when detection fails", async () => {
      delete process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID;
      process.env.PI_MOBILE_BRIDGE_PORT = "0";

      // Mock spawnSync to return empty
      spawnSyncMock = vi.fn(() => ({
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from(""), Buffer.from("")],
      }));

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile status
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("status", mockCtx);

      // Assert notification indicates no KDE device
      expect(mockNotify).toHaveBeenCalled();
      const statusNotification = mockNotify.mock.calls.find((call: any[]) =>
        call[0].toLowerCase().includes("kde")
      );
      expect(statusNotification).toBeDefined();
      expect(statusNotification[0]).toMatch(/no kde device|kde.*none|kde.*not.*detected/i);
    });

    it("RED: /mobile link notification includes target device ID", async () => {
      process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID = "a648fd25583644aa9c89057dfb068171";
      process.env.PI_MOBILE_BRIDGE_PORT = "0";
      process.env.PI_MOBILE_BRIDGE_HOST = "192.168.1.30";

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile link
      const mobileCommand = registeredCommands.get("mobile");
      mockNotify.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      // Assert notification includes device ID
      expect(mockNotify).toHaveBeenCalled();
      const linkNotification = mockNotify.mock.calls.find((call: any[]) =>
        call[0].includes("a648fd25583644aa9c89057dfb068171")
      );
      expect(linkNotification).toBeDefined();
      expect(linkNotification[0]).toContain("a648fd25583644aa9c89057dfb068171");
    });

    it("RED: /mobile devices command shows detected KDE device ID", async () => {
      process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID = "a648fd25583644aa9c89057dfb068171";

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Trigger /mobile devices
      await mobileCommand!.handler("devices", mockCtx);

      // Assert notification shows device ID
      expect(mockNotify).toHaveBeenCalled();
      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringMatching(/a648fd25583644aa9c89057dfb068171|kde.*device/i)
      );
      
      // Verify it contains the actual device ID
      const devicesNotification = mockNotify.mock.calls[0][0];
      expect(devicesNotification).toContain("a648fd25583644aa9c89057dfb068171");
    });

    it("RED: /mobile devices shows 'no KDE device' when none detected", async () => {
      delete process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID;

      // Mock spawnSync to return empty
      spawnSyncMock = vi.fn(() => ({
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from(""), Buffer.from("")],
      }));

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Trigger /mobile devices
      await mobileCommand!.handler("devices", mockCtx);

      // Assert notification indicates no device
      expect(mockNotify).toHaveBeenCalled();
      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringMatching(/no kde device|kde.*none|not.*detected/i)
      );
    });

    it("RED: /mobile devices with auto-detected device ID shows the ID", async () => {
      delete process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID;

      // Mock spawnSync to return device ID
      spawnSyncMock = vi.fn(() => ({
        stdout: Buffer.from("a648fd25583644aa9c89057dfb068171\n"),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from("a648fd25583644aa9c89057dfb068171\n"), Buffer.from("")],
      }));

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Trigger /mobile devices
      await mobileCommand!.handler("devices", mockCtx);

      // Assert notification shows auto-detected device ID
      expect(mockNotify).toHaveBeenCalled();
      const devicesNotification = mockNotify.mock.calls[0][0];
      expect(devicesNotification).toContain("a648fd25583644aa9c89057dfb068171");
    });
  });

  describe("RED: Automatic LAN IP Detection", () => {
    /**
     * These tests validate the new resolveStatusHost() helper function
     * that automatically detects LAN IP addresses from network interfaces.
     * 
     * Expected behavior:
     * 1. If PI_MOBILE_BRIDGE_HOST env is set, use that (override)
     * 2. Otherwise, detect first non-internal IPv4 from os.networkInterfaces()
     * 3. If no LAN IPv4 exists, fallback to 127.0.0.1
     */

    let resolveStatusHost: (envHost?: string, networkInterfaces?: any) => string;

    beforeEach(async () => {
      // Attempt to import the helper function
      try {
        const module = await import("../extensions/mobile-bridge/index.ts");
        resolveStatusHost = module.resolveStatusHost;
      } catch {
        // Expected to fail in RED phase - function doesn't exist yet
        resolveStatusHost = undefined as any;
      }
    });

    it("RED: env override wins - returns PI_MOBILE_BRIDGE_HOST when set", () => {
      expect(resolveStatusHost).toBeDefined();
      expect(typeof resolveStatusHost).toBe("function");

      const result = resolveStatusHost("192.168.1.99", {
        lo: [
          {
            address: "127.0.0.1",
            netmask: "255.0.0.0",
            family: "IPv4",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "127.0.0.1/8",
          },
        ],
        enp8s0f1: [
          {
            address: "192.168.1.30",
            netmask: "255.255.255.0",
            family: "IPv4",
            mac: "ab:cd:ef:12:34:56",
            internal: false,
            cidr: "192.168.1.30/24",
          },
        ],
      });

      expect(result).toBe("192.168.1.99");
    });

    it("RED: auto-detect LAN IP - returns first non-internal IPv4 from network interfaces", () => {
      expect(resolveStatusHost).toBeDefined();
      expect(typeof resolveStatusHost).toBe("function");

      const mockNetworkInterfaces = {
        lo: [
          {
            address: "127.0.0.1",
            netmask: "255.0.0.0",
            family: "IPv4",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "127.0.0.1/8",
          },
          {
            address: "::1",
            netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
            family: "IPv6",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "::1/128",
            scopeid: 0,
          },
        ],
        enp8s0f1: [
          {
            address: "fe80::1234:5678:abcd:ef01",
            netmask: "ffff:ffff:ffff:ffff::",
            family: "IPv6",
            mac: "ab:cd:ef:12:34:56",
            internal: false,
            cidr: "fe80::1234:5678:abcd:ef01/64",
            scopeid: 2,
          },
          {
            address: "192.168.1.30",
            netmask: "255.255.255.0",
            family: "IPv4",
            mac: "ab:cd:ef:12:34:56",
            internal: false,
            cidr: "192.168.1.30/24",
          },
        ],
      };

      const result = resolveStatusHost(undefined, mockNetworkInterfaces);

      expect(result).toBe("192.168.1.30");
    });

    it("RED: fallback to 127.0.0.1 - returns localhost when only internal interfaces exist", () => {
      expect(resolveStatusHost).toBeDefined();
      expect(typeof resolveStatusHost).toBe("function");

      const mockNetworkInterfaces = {
        lo: [
          {
            address: "127.0.0.1",
            netmask: "255.0.0.0",
            family: "IPv4",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "127.0.0.1/8",
          },
          {
            address: "::1",
            netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
            family: "IPv6",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "::1/128",
            scopeid: 0,
          },
        ],
      };

      const result = resolveStatusHost(undefined, mockNetworkInterfaces);

      expect(result).toBe("127.0.0.1");
    });

    it("RED: fallback to 127.0.0.1 - returns localhost when no interfaces provided", () => {
      expect(resolveStatusHost).toBeDefined();
      expect(typeof resolveStatusHost).toBe("function");

      const result = resolveStatusHost(undefined, {});

      expect(result).toBe("127.0.0.1");
    });

    it("RED: ignores IPv6 addresses - only considers IPv4", () => {
      expect(resolveStatusHost).toBeDefined();
      expect(typeof resolveStatusHost).toBe("function");

      const mockNetworkInterfaces = {
        eth0: [
          {
            address: "fe80::1234:5678:abcd:ef01",
            netmask: "ffff:ffff:ffff:ffff::",
            family: "IPv6",
            mac: "ab:cd:ef:12:34:56",
            internal: false,
            cidr: "fe80::1234:5678:abcd:ef01/64",
            scopeid: 2,
          },
          {
            address: "2001:db8::1",
            netmask: "ffff:ffff:ffff:ffff::",
            family: "IPv6",
            mac: "ab:cd:ef:12:34:56",
            internal: false,
            cidr: "2001:db8::1/64",
            scopeid: 0,
          },
        ],
        lo: [
          {
            address: "127.0.0.1",
            netmask: "255.0.0.0",
            family: "IPv4",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "127.0.0.1/8",
          },
        ],
      };

      const result = resolveStatusHost(undefined, mockNetworkInterfaces);

      // Should fallback to 127.0.0.1 since no non-internal IPv4 exists
      expect(result).toBe("127.0.0.1");
    });

    it("RED: returns first available LAN IP when multiple interfaces exist", () => {
      expect(resolveStatusHost).toBeDefined();
      expect(typeof resolveStatusHost).toBe("function");

      const mockNetworkInterfaces = {
        lo: [
          {
            address: "127.0.0.1",
            netmask: "255.0.0.0",
            family: "IPv4",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "127.0.0.1/8",
          },
        ],
        eth0: [
          {
            address: "10.0.1.50",
            netmask: "255.255.255.0",
            family: "IPv4",
            mac: "11:22:33:44:55:66",
            internal: false,
            cidr: "10.0.1.50/24",
          },
        ],
        wlan0: [
          {
            address: "192.168.1.100",
            netmask: "255.255.255.0",
            family: "IPv4",
            mac: "aa:bb:cc:dd:ee:ff",
            internal: false,
            cidr: "192.168.1.100/24",
          },
        ],
      };

      const result = resolveStatusHost(undefined, mockNetworkInterfaces);

      // Should return one of the non-internal IPv4 addresses
      expect(["10.0.1.50", "192.168.1.100"]).toContain(result);
    });
  });

  describe("RED: Robust KDE Connect Detection Diagnostics", () => {
    /**
     * These tests validate fallback mechanisms for device ID detection:
     * 1. Parse normal --list-devices output when --id-only returns empty
     * 2. Try /usr/bin/kdeconnect-cli as absolute path fallback
     * 3. New /mobile devices debug command for diagnostics
     */

    beforeEach(() => {
      delete process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID;
      process.env.PI_MOBILE_BRIDGE_PORT = "0";

      spawnSyncMock = vi.fn();
    });

    it("RED: fallback to parsing normal --list-devices output when --id-only returns empty", async () => {
      // First call to --id-only returns empty
      // Second call to --list-devices returns normal output with device info
      let callCount = 0;
      spawnSyncMock.mockImplementation((command: string, args: string[]) => {
        callCount++;
        if (callCount === 1 && args.includes("--id-only")) {
          // First call: --id-only returns empty
          return {
            stdout: Buffer.from(""),
            stderr: Buffer.from(""),
            status: 0,
            signal: null,
            pid: 12345,
            output: [null, Buffer.from(""), Buffer.from("")],
          };
        } else if (callCount === 2 && !args.includes("--id-only")) {
          // Second call: normal --list-devices with parseable output
          return {
            stdout: Buffer.from(
              "- Pixel 3a XL: a648fd25583644aa9c89057dfb068171 on 192.168.1.19 via LAN (paired and reachable)\n"
            ),
            stderr: Buffer.from(""),
            status: 0,
            signal: null,
            pid: 12345,
            output: [
              null,
              Buffer.from(
                "- Pixel 3a XL: a648fd25583644aa9c89057dfb068171 on 192.168.1.19 via LAN (paired and reachable)\n"
              ),
              Buffer.from(""),
            ],
          };
        }
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from(""),
          status: 1,
          signal: null,
          pid: 12345,
          output: [null, Buffer.from(""), Buffer.from("")],
        };
      });

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      // Start server to trigger detection
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Verify spawnSync was called twice: first with --id-only, then without
      expect(spawnSyncMock).toHaveBeenCalledTimes(2);
      expect(spawnSyncMock).toHaveBeenNthCalledWith(
        1,
        "kdeconnect-cli",
        ["--list-devices", "--id-only"],
        expect.any(Object)
      );
      expect(spawnSyncMock).toHaveBeenNthCalledWith(
        2,
        "kdeconnect-cli",
        ["--list-devices"],
        expect.any(Object)
      );

      // Trigger /mobile link to verify extracted device ID is used
      const mobileCommand = registeredCommands.get("mobile");
      spawnMock.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      // Assert spawn includes extracted device ID
      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();
      const args = spawnCall[1];
      expect(args).toContain("-d");
      expect(args).toContain("a648fd25583644aa9c89057dfb068171");
    });

    it("RED: parses device ID from multiple device list output", async () => {
      let callCount = 0;
      spawnSyncMock.mockImplementation((command: string, args: string[]) => {
        callCount++;
        if (callCount === 1 && args.includes("--id-only")) {
          return {
            stdout: Buffer.from(""),
            stderr: Buffer.from(""),
            status: 0,
            signal: null,
            pid: 12345,
            output: [null, Buffer.from(""), Buffer.from("")],
          };
        } else if (callCount === 2 && !args.includes("--id-only")) {
          // Multiple devices in output - should extract first
          return {
            stdout: Buffer.from(
              "- Samsung Galaxy: b12345678901234567890123456789ab on 192.168.1.10 via LAN (paired)\n" +
              "- Pixel 3a XL: a648fd25583644aa9c89057dfb068171 on 192.168.1.19 via LAN (paired and reachable)\n"
            ),
            stderr: Buffer.from(""),
            status: 0,
            signal: null,
            pid: 12345,
            output: [
              null,
              Buffer.from(
                "- Samsung Galaxy: b12345678901234567890123456789ab on 192.168.1.10 via LAN (paired)\n" +
                "- Pixel 3a XL: a648fd25583644aa9c89057dfb068171 on 192.168.1.19 via LAN (paired and reachable)\n"
              ),
              Buffer.from(""),
            ],
          };
        }
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from(""),
          status: 1,
          signal: null,
          pid: 12345,
          output: [null, Buffer.from(""), Buffer.from("")],
        };
      });

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Trigger /mobile link - should use FIRST device ID from parsed output
      const mobileCommand = registeredCommands.get("mobile");
      spawnMock.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();
      const args = spawnCall[1];
      expect(args).toContain("-d");
      expect(args).toContain("b12345678901234567890123456789ab");
      expect(args).not.toContain("a648fd25583644aa9c89057dfb068171");
    });

    it("RED: fallback to /usr/bin/kdeconnect-cli when kdeconnect-cli fails", async () => {
      let callCount = 0;
      spawnSyncMock.mockImplementation((command: string, args: string[]) => {
        callCount++;
        if (command === "kdeconnect-cli") {
          // First attempts with kdeconnect-cli fail
          return {
            stdout: Buffer.from(""),
            stderr: Buffer.from("kdeconnect-cli: command not found"),
            status: 127,
            signal: null,
            pid: 12345,
            output: [null, Buffer.from(""), Buffer.from("kdeconnect-cli: command not found")],
          };
        } else if (command === "/usr/bin/kdeconnect-cli" && args.includes("--id-only")) {
          // Fallback to absolute path succeeds
          return {
            stdout: Buffer.from("a648fd25583644aa9c89057dfb068171\n"),
            stderr: Buffer.from(""),
            status: 0,
            signal: null,
            pid: 12345,
            output: [null, Buffer.from("a648fd25583644aa9c89057dfb068171\n"), Buffer.from("")],
          };
        }
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from(""),
          status: 1,
          signal: null,
          pid: 12345,
          output: [null, Buffer.from(""), Buffer.from("")],
        };
      });

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      // Start server
      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Verify spawnSync was called with /usr/bin/kdeconnect-cli
      const absolutePathCall = spawnSyncMock.mock.calls.find(
        (call: any[]) => call[0] === "/usr/bin/kdeconnect-cli"
      );
      expect(absolutePathCall).toBeDefined();

      // Trigger /mobile link - should use device ID from absolute path fallback
      const mobileCommand = registeredCommands.get("mobile");
      spawnMock.mockClear();
      await mobileCommand!.handler("link", mockCtx);

      const spawnCall = spawnMock.mock.calls.find(
        (call: any[]) => call[0] === "kdeconnect-cli" && call[1].includes("--share")
      );
      expect(spawnCall).toBeDefined();
      const args = spawnCall[1];
      expect(args).toContain("-d");
      expect(args).toContain("a648fd25583644aa9c89057dfb068171");
    });

    it("RED: /mobile devices debug shows diagnostic information", async () => {
      // Mock spawnSync to simulate detection attempt
      spawnSyncMock.mockImplementation((command: string, args: string[]) => {
        if (args.includes("--id-only")) {
          return {
            stdout: Buffer.from("a648fd25583644aa9c89057dfb068171\n"),
            stderr: Buffer.from(""),
            status: 0,
            signal: null,
            pid: 12345,
            output: [null, Buffer.from("a648fd25583644aa9c89057dfb068171\n"), Buffer.from("")],
          };
        }
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from(""),
          status: 0,
          signal: null,
          pid: 12345,
          output: [null, Buffer.from(""), Buffer.from("")],
        };
      });

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Trigger /mobile devices debug
      await mobileCommand!.handler("devices debug", mockCtx);

      // Assert notification contains diagnostic information
      expect(mockNotify).toHaveBeenCalled();
      const debugNotification = mockNotify.mock.calls.find((call: any[]) =>
        call[0].toLowerCase().includes("kde") && call[0].toLowerCase().includes("debug")
      );
      expect(debugNotification).toBeDefined();

      const notification = debugNotification[0];
      // Must contain: 'kde debug', 'PATH', and stdout/status/error info
      expect(notification.toLowerCase()).toMatch(/kde.*debug/);
      expect(notification).toMatch(/PATH/i);
      expect(notification).toMatch(/stdout|status|error|stderr|command/i);
    });

    it("RED: /mobile devices debug shows failure diagnostics when detection fails", async () => {
      // Mock spawnSync to simulate failure
      spawnSyncMock.mockImplementation((command: string, args: string[]) => {
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from("kdeconnect-cli: command not found"),
          status: 127,
          signal: null,
          pid: 12345,
          output: [null, Buffer.from(""), Buffer.from("kdeconnect-cli: command not found")],
        };
      });

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Trigger /mobile devices debug
      await mobileCommand!.handler("devices debug", mockCtx);

      // Assert notification shows failure details
      expect(mockNotify).toHaveBeenCalled();
      const debugNotification = mockNotify.mock.calls.find((call: any[]) =>
        call[0].toLowerCase().includes("debug")
      );
      expect(debugNotification).toBeDefined();

      const notification = debugNotification[0];
      expect(notification.toLowerCase()).toMatch(/kde.*debug/);
      expect(notification).toMatch(/PATH/i);
      // Should contain error info
      expect(notification).toMatch(/status.*127|error|stderr|command not found/i);
    });

    it("RED: /mobile devices debug includes PATH environment variable", async () => {
      spawnSyncMock.mockReturnValue({
        stdout: Buffer.from("a648fd25583644aa9c89057dfb068171\n"),
        stderr: Buffer.from(""),
        status: 0,
        signal: null,
        pid: 12345,
        output: [null, Buffer.from("a648fd25583644aa9c89057dfb068171\n"), Buffer.from("")],
      });

      // Reinitialize extension
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      const mobileCommand = registeredCommands.get("mobile");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      // Trigger /mobile devices debug
      await mobileCommand!.handler("devices debug", mockCtx);

      expect(mockNotify).toHaveBeenCalled();
      const debugNotification = mockNotify.mock.calls[0][0];
      // Must include PATH environment variable value
      expect(debugNotification).toMatch(/PATH.*=/);
    });
  });

  describe("RED: Phase 1 Multi-Instance Support", () => {
    /**
     * Tests for Phase 1 multi-instance registry:
     * 1. Dynamic port allocation when default 4321 is busy
     * 2. Registry write on session_start
     * 3. Registry heartbeat updates lastSeen
     * 4. Registry cleanup on session_shutdown
     * 5. GET /instances?token=... returns live instances
     * 6. GET /instances rejects invalid token with 401
     */

    let tmpDir: string;

    beforeEach(async () => {
      // Create temp directory for registry tests
      const fs = await import("node:fs/promises");
      const os = await import("node:os");
      const path = await import("node:path");
      
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-mobile-bridge-test-"));
      process.env.PI_MOBILE_BRIDGE_REGISTRY_DIR = tmpDir;
      process.env.PI_MOBILE_BRIDGE_PORT = "0";
      process.env.PI_MOBILE_BRIDGE_HEARTBEAT_MS = "50";
      process.env.PI_MOBILE_BRIDGE_STALE_MS = "100";
    });

    afterEach(async () => {
      // Cleanup temp directory
      if (tmpDir) {
        const fs = await import("node:fs/promises");
        try {
          await fs.rm(tmpDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
      delete process.env.PI_MOBILE_BRIDGE_REGISTRY_DIR;
      delete process.env.PI_MOBILE_BRIDGE_HEARTBEAT_MS;
      delete process.env.PI_MOBILE_BRIDGE_STALE_MS;
    });

    describe("Dynamic Port Allocation", () => {
      it("RED: starts on different port when default 4321 is occupied", async () => {
        const { findAvailablePort } = await import("../extensions/mobile-bridge/index.ts");
        const busyPort = await findAvailablePort(4500);

        const http = await import("node:http");
        const firstServer = http.createServer();
        
        await new Promise<void>((resolve, reject) => {
          firstServer.once("error", reject);
          firstServer.listen(busyPort, "0.0.0.0", () => {
            firstServer.off("error", reject);
            resolve();
          });
        });

        try {
          process.env.PI_MOBILE_BRIDGE_PORT = String(busyPort);
          
          // Reinitialize extension
          registeredCommands.clear();
          registeredHooks.clear();
          const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
          freshModule.default(mockPi);

          // Start mobile bridge server
          const sessionStartHandlers = registeredHooks.get("session_start");
          const mockNotify = vi.fn();
          const mockCtx: ExtensionCommandContext = {
            ui: { notify: mockNotify },
            cwd: "/test",
            model: "test-model",
          } as any;

          await sessionStartHandlers![0]({}, mockCtx);

          // Check status to get actual port
          const mobileCommand = registeredCommands.get("mobile");
          mockNotify.mockClear();
          await mobileCommand!.handler("status", mockCtx);

          const statusCall = mockNotify.mock.calls.find((call) =>
            call[0].includes("http://")
          );
          expect(statusCall).toBeDefined();
          
          const urlMatch = statusCall[0].match(/http:\/\/[^\s]+:(\d+)\/\?token=/);
          expect(urlMatch).not.toBeNull();
          
          const bridgePort = parseInt(urlMatch[1], 10);
          
          expect(bridgePort).not.toBe(busyPort);
          expect(bridgePort).toBeGreaterThan(busyPort);
          expect(bridgePort).toBeLessThan(busyPort + 100);

          // Cleanup
          const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
          await sessionShutdownHandlers![0]({}, mockCtx);
        } finally {
          // Cleanup first server
          await new Promise<void>((resolve) => {
            firstServer.close(() => resolve());
          });
        }
      });

      it("RED: findAvailablePort helper returns next available port when startPort is busy", async () => {
        // Import the helper function
        let findAvailablePort: (startPort: number) => Promise<number>;
        try {
          const module = await import("../extensions/mobile-bridge/index.ts");
          findAvailablePort = module.findAvailablePort;
        } catch {
          // Expected to fail in RED phase
          findAvailablePort = undefined as any;
        }

        expect(findAvailablePort).toBeDefined();
        expect(typeof findAvailablePort).toBe("function");

        const busyPort = await findAvailablePort(4500);

        const http = await import("node:http");
        const server = http.createServer();
        
        await new Promise<void>((resolve, reject) => {
          server.once("error", reject);
          server.listen(busyPort, "0.0.0.0", () => {
            server.off("error", reject);
            resolve();
          });
        });

        try {
          const availablePort = await findAvailablePort(busyPort);
          expect(availablePort).toBeGreaterThan(busyPort);
          expect(availablePort).toBeLessThan(busyPort + 100);
        } finally {
          await new Promise<void>((resolve) => {
            server.close(() => resolve());
          });
        }
      });

      it("RED: findAvailablePort returns startPort when available", async () => {
        let findAvailablePort: (startPort: number) => Promise<number>;
        try {
          const module = await import("../extensions/mobile-bridge/index.ts");
          findAvailablePort = module.findAvailablePort;
        } catch {
          findAvailablePort = undefined as any;
        }

        expect(findAvailablePort).toBeDefined();
        expect(typeof findAvailablePort).toBe("function");

        const candidate = await findAvailablePort(4600);
        expect(await findAvailablePort(candidate)).toBe(candidate);
      });
    });

    describe("Stale Registry Cleanup", () => {
      it("RED: cleans up stale registry files on session_start before writing own file", async () => {
        // Setup: Create registry dir with stale and fresh files
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const crypto = await import("node:crypto");
        
        const registryDir = path.join(tmpDir, "instances");
        await fs.mkdir(registryDir, { recursive: true });

        const now = Date.now();

        // Create 3 stale registry files (lastSeen older than stale threshold)
        const staleIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
        for (const id of staleIds) {
          const staleRegistry = {
            id,
            label: `Stale Instance ${id}`,
            cwd: `/stale/project/${id}`,
            port: 9999,
            lastSeen: now - 500, // 500ms ago (> 100ms STALE_MS threshold)
          };
          await fs.writeFile(
            path.join(registryDir, `${id}.json`),
            JSON.stringify(staleRegistry)
          );
        }

        // Create 1 fresh registry file (lastSeen current)
        const freshId = crypto.randomUUID();
        const freshRegistry = {
          id: freshId,
          label: "Fresh Instance",
          cwd: "/fresh/project",
          port: 8888,
          lastSeen: now, // Current timestamp
        };
        await fs.writeFile(
          path.join(registryDir, `${freshId}.json`),
          JSON.stringify(freshRegistry)
        );

        // Verify initial state: 4 files total
        const filesBeforeStart = await fs.readdir(registryDir);
        expect(filesBeforeStart.length).toBe(4);

        // Trigger session_start (should cleanup stale files and create own registry)
        registeredCommands.clear();
        registeredHooks.clear();
        const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
        freshModule.default(mockPi);

        const sessionStartHandlers = registeredHooks.get("session_start");
        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/home/user/project",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        // Verify final state: only fresh file + own new file remain (total 2)
        const filesAfterStart = await fs.readdir(registryDir);
        expect(filesAfterStart.length).toBe(2);

        // Verify stale files were deleted
        for (const staleId of staleIds) {
          const staleExists = filesAfterStart.includes(`${staleId}.json`);
          expect(staleExists).toBe(false);
        }

        // Verify fresh file still exists
        const freshExists = filesAfterStart.includes(`${freshId}.json`);
        expect(freshExists).toBe(true);

        // Verify own new file was created
        const ownFile = filesAfterStart.find((file) => file !== `${freshId}.json`);
        expect(ownFile).toBeDefined();
        expect(ownFile).toMatch(/^[a-f0-9-]+\.json$/);

        // Cleanup
        const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
        await sessionShutdownHandlers![0]({}, mockCtx);
      });
    });

    describe("Registry File Management", () => {
      it("RED: creates registry file on session_start with id, label, cwd, port, lastSeen", async () => {
        // Reinitialize extension
        registeredCommands.clear();
        registeredHooks.clear();
        const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
        freshModule.default(mockPi);

        const sessionStartHandlers = registeredHooks.get("session_start");
        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/home/user/project",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        // Check registry directory exists
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        
        const registryDir = path.join(tmpDir, "instances");
        const dirExists = await fs.access(registryDir).then(() => true).catch(() => false);
        expect(dirExists).toBe(true);

        // Check registry file exists (should be <id>.json)
        const files = await fs.readdir(registryDir);
        expect(files.length).toBe(1);
        expect(files[0]).toMatch(/^[a-f0-9-]+\.json$/);

        // Read and validate registry file content
        const registryPath = path.join(registryDir, files[0]);
        const content = await fs.readFile(registryPath, "utf-8");
        const registry = JSON.parse(content);

        expect(registry).toHaveProperty("id");
        expect(registry).toHaveProperty("label");
        expect(registry).toHaveProperty("cwd", "/home/user/project");
        expect(registry).toHaveProperty("port");
        expect(registry).toHaveProperty("lastSeen");
        
        expect(typeof registry.id).toBe("string");
        expect(typeof registry.label).toBe("string");
        expect(typeof registry.port).toBe("number");
        expect(registry.port).toBeGreaterThan(0);
        expect(typeof registry.lastSeen).toBe("number");
        expect(registry.lastSeen).toBeGreaterThan(0);

        // Token should NOT be in registry
        expect(registry).not.toHaveProperty("token");

        // Cleanup
        const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
        await sessionShutdownHandlers![0]({}, mockCtx);
      });

      it("RED: updates lastSeen via heartbeat mechanism", async () => {
        // Reinitialize extension
        registeredCommands.clear();
        registeredHooks.clear();
        const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
        freshModule.default(mockPi);

        const sessionStartHandlers = registeredHooks.get("session_start");
        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/home/user/project",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        
        const registryDir = path.join(tmpDir, "instances");
        const files = await fs.readdir(registryDir);
        const registryPath = path.join(registryDir, files[0]);

        // Read initial lastSeen
        const initialContent = await fs.readFile(registryPath, "utf-8");
        const initialRegistry = JSON.parse(initialContent);
        const initialLastSeen = initialRegistry.lastSeen;

        // Wait for heartbeat interval (50ms + buffer)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Read updated lastSeen
        const updatedContent = await fs.readFile(registryPath, "utf-8");
        const updatedRegistry = JSON.parse(updatedContent);
        const updatedLastSeen = updatedRegistry.lastSeen;

        // lastSeen should have been updated
        expect(updatedLastSeen).toBeGreaterThan(initialLastSeen);

        // Cleanup
        const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
        await sessionShutdownHandlers![0]({}, mockCtx);
      });

      it("RED: removes registry file on session_shutdown", async () => {
        // Reinitialize extension
        registeredCommands.clear();
        registeredHooks.clear();
        const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
        freshModule.default(mockPi);

        const sessionStartHandlers = registeredHooks.get("session_start");
        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/home/user/project",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        
        const registryDir = path.join(tmpDir, "instances");
        const filesBeforeShutdown = await fs.readdir(registryDir);
        expect(filesBeforeShutdown.length).toBe(1);

        // Shutdown
        const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
        await sessionShutdownHandlers![0]({}, mockCtx);

        // Registry file should be removed
        const filesAfterShutdown = await fs.readdir(registryDir);
        expect(filesAfterShutdown.length).toBe(0);
      });

      it("RED: multiple instances create separate registry files", async () => {
        // Start first instance
        registeredCommands.clear();
        registeredHooks.clear();
        const module1 = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now() + ".1");
        const mockPi1 = {
          registerCommand: vi.fn((name: string, opts: any) => {}),
          on: vi.fn((event: string, handler: Function) => {}),
          sendUserMessage: vi.fn(),
        } as any;
        module1.default(mockPi1);

        const mockNotify1 = vi.fn();
        const mockCtx1: ExtensionCommandContext = {
          ui: { notify: mockNotify1 },
          cwd: "/home/user/project1",
          model: "test-model",
        } as any;

        // Get session_start handler from mockPi1.on calls
        const sessionStartCall1 = mockPi1.on.mock.calls.find((call: any[]) => call[0] === "session_start");
        expect(sessionStartCall1).toBeDefined();
        await sessionStartCall1[1]({}, mockCtx1);

        // Start second instance
        const module2 = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now() + ".2");
        const mockPi2 = {
          registerCommand: vi.fn((name: string, opts: any) => {}),
          on: vi.fn((event: string, handler: Function) => {}),
          sendUserMessage: vi.fn(),
        } as any;
        module2.default(mockPi2);

        const mockNotify2 = vi.fn();
        const mockCtx2: ExtensionCommandContext = {
          ui: { notify: mockNotify2 },
          cwd: "/home/user/project2",
          model: "test-model",
        } as any;

        const sessionStartCall2 = mockPi2.on.mock.calls.find((call: any[]) => call[0] === "session_start");
        expect(sessionStartCall2).toBeDefined();
        await sessionStartCall2[1]({}, mockCtx2);

        // Check registry files
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        
        const registryDir = path.join(tmpDir, "instances");
        const files = (await fs.readdir(registryDir)).filter((file) => file.endsWith(".json"));
        expect(files.length).toBe(2);

        // Read both registry files and verify different cwds
        const registry1 = JSON.parse(await fs.readFile(path.join(registryDir, files[0]), "utf-8"));
        const registry2 = JSON.parse(await fs.readFile(path.join(registryDir, files[1]), "utf-8"));

        const cwds = [registry1.cwd, registry2.cwd].sort();
        expect(cwds).toEqual(["/home/user/project1", "/home/user/project2"]);

        // Cleanup
        const sessionShutdownCall1 = mockPi1.on.mock.calls.find((call: any[]) => call[0] === "session_shutdown");
        const sessionShutdownCall2 = mockPi2.on.mock.calls.find((call: any[]) => call[0] === "session_shutdown");
        await sessionShutdownCall1[1]({}, mockCtx1);
        await sessionShutdownCall2[1]({}, mockCtx2);
      });
    });

    describe("GET /instances Endpoint", () => {
      let serverUrl: string;
      let token: string;
      let port: number;

      const startServer = async () => {
        registeredCommands.clear();
        registeredHooks.clear();
        const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
        freshModule.default(mockPi);

        const sessionStartHandlers = registeredHooks.get("session_start");
        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/home/user/project",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        // Get URL and token from status
        const mobileCommand = registeredCommands.get("mobile");
        await mobileCommand!.handler("status", mockCtx);

        const statusCall = mockNotify.mock.calls.find((call) =>
          call[0].includes("http://")
        );
        expect(statusCall).toBeDefined();
        
        const urlMatch = statusCall[0].match(/http:\/\/[^\s]+:(\d+)\/\?token=([a-f0-9]+)/);
        expect(urlMatch).not.toBeNull();
        
        port = parseInt(urlMatch[1], 10);
        token = urlMatch[2];
        serverUrl = `http://127.0.0.1:${port}`;
      };

      const shutdownServer = async () => {
        const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
        if (sessionShutdownHandlers) {
          const mockCtx: ExtensionCommandContext = {
            ui: { notify: vi.fn() },
            cwd: "/test",
            model: "test-model",
          } as any;
          await sessionShutdownHandlers[0]({}, mockCtx);
        }
      };

      it("RED: GET /instances with valid token returns live instances", async () => {
        await startServer();

        const response = await fetch(`${serverUrl}/instances?token=${token}`);
        expect(response.ok).toBe(true);
        
        const data = await response.json();
        expect(data).toHaveProperty("instances");
        expect(Array.isArray(data.instances)).toBe(true);
        expect(data.instances.length).toBeGreaterThan(0);

        // Verify instance structure
        const instance = data.instances[0];
        expect(instance).toHaveProperty("id");
        expect(instance).toHaveProperty("label");
        expect(instance).toHaveProperty("cwd");
        expect(instance).toHaveProperty("port", port);
        expect(instance).toHaveProperty("lastSeen");
        
        // Token should NOT be in instance
        expect(instance).not.toHaveProperty("token");

        await shutdownServer();
      });

      it("RED: GET /instances rejects invalid token with 401", async () => {
        await startServer();

        const response = await fetch(`${serverUrl}/instances?token=invalid`);
        expect(response.status).toBe(401);
        
        const data = await response.json();
        expect(data).toHaveProperty("error");

        await shutdownServer();
      });

      it("RED: GET /instances excludes stale entries older than STALE_MS", async () => {
        // Create stale registry file manually
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const crypto = await import("node:crypto");
        
        const registryDir = path.join(tmpDir, "instances");
        await fs.mkdir(registryDir, { recursive: true });

        const staleId = crypto.randomUUID();
        const staleRegistry = {
          id: staleId,
          label: "Stale Instance",
          cwd: "/stale/project",
          port: 9999,
          lastSeen: Date.now() - 200, // 200ms ago (> 100ms STALE_MS)
        };

        await fs.writeFile(
          path.join(registryDir, `${staleId}.json`),
          JSON.stringify(staleRegistry)
        );

        // Start fresh server
        await startServer();

        const response = await fetch(`${serverUrl}/instances?token=${token}`);
        expect(response.ok).toBe(true);
        
        const data = await response.json();
        expect(data).toHaveProperty("instances");
        expect(Array.isArray(data.instances)).toBe(true);
        
        // Should only contain current instance, not stale one
        expect(data.instances.length).toBe(1);
        expect(data.instances[0].id).not.toBe(staleId);
        expect(data.instances[0].cwd).toBe("/home/user/project");

        await shutdownServer();
      });

      it("RED: GET /instances includes multiple live instances", async () => {
        // Start first instance
        await startServer();
        const token1 = token;
        const serverUrl1 = serverUrl;

        // Create second registry file manually (simulating another live instance)
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const crypto = await import("node:crypto");
        
        const registryDir = path.join(tmpDir, "instances");
        const liveId = crypto.randomUUID();
        const liveRegistry = {
          id: liveId,
          label: "Second Instance",
          cwd: "/home/user/other-project",
          port: 8888,
          lastSeen: Date.now(), // Current timestamp
        };

        await fs.writeFile(
          path.join(registryDir, `${liveId}.json`),
          JSON.stringify(liveRegistry)
        );

        const response = await fetch(`${serverUrl1}/instances?token=${token1}`);
        expect(response.ok).toBe(true);
        
        const data = await response.json();
        expect(data).toHaveProperty("instances");
        expect(Array.isArray(data.instances)).toBe(true);
        expect(data.instances.length).toBe(2);

        // Verify both instances are present
        const cwds = data.instances.map((inst: any) => inst.cwd).sort();
        expect(cwds).toEqual(["/home/user/other-project", "/home/user/project"]);

        await shutdownServer();
      });

      it("RED: GET /instances without token parameter returns 401", async () => {
        await startServer();

        const response = await fetch(`${serverUrl}/instances`);
        expect(response.status).toBe(401);

        await shutdownServer();
      });
    });
  });

  describe("RED: Phase 1 Landing Page Instance Picker UI", () => {
    /**
     * Tests for Phase 1 landing page with instance picker UI.
     * 
     * Expected behavior:
     * 1. GET / HTML includes instance picker/list area (id="instances" or text "Pi instances")
     * 2. HTML JavaScript fetches /instances?token=
     * 3. HTML renders live instances and allows switching target
     * 4. Contains JS function names like loadInstances, renderInstances
     * 
     * Tests are semantic - no exact styling required, only semantic markers.
     */

    let serverUrl: string;
    let token: string;
    let port: number;

    const startServer = async () => {
      process.env.PI_MOBILE_BRIDGE_PORT = "0";
      
      registeredCommands.clear();
      registeredHooks.clear();
      const freshModule = await import("../extensions/mobile-bridge/index.ts?t=" + Date.now());
      freshModule.default(mockPi);

      const sessionStartHandlers = registeredHooks.get("session_start");
      const mockNotify = vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/home/user/project",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      // Get URL and token from status
      const mobileCommand = registeredCommands.get("mobile");
      await mobileCommand!.handler("status", mockCtx);

      const statusCall = mockNotify.mock.calls.find((call) =>
        call[0].includes("http://")
      );
      expect(statusCall).toBeDefined();
      
      const urlMatch = statusCall[0].match(/http:\/\/[^\s]+:(\d+)\/\?token=([a-f0-9]+)/);
      expect(urlMatch).not.toBeNull();
      
      port = parseInt(urlMatch[1], 10);
      token = urlMatch[2];
      serverUrl = `http://127.0.0.1:${port}`;
    };

    const shutdownServer = async () => {
      const sessionShutdownHandlers = registeredHooks.get("session_shutdown");
      if (sessionShutdownHandlers) {
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: vi.fn() },
          cwd: "/test",
          model: "test-model",
        } as any;
        await sessionShutdownHandlers[0]({}, mockCtx);
      }
    };

    it("RED: GET / returns HTML with instance picker area", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/?token=${token}`);
      expect(response.ok).toBe(true);
      expect(response.headers.get("content-type")).toMatch(/text\/html/);
      
      const html = await response.text();
      
      // Must contain instance picker semantic markers
      // Either id="instances" or text "Pi instances"
      const hasInstancesId = html.includes('id="instances"');
      const hasPiInstancesText = html.toLowerCase().includes('pi instances');
      
      expect(hasInstancesId || hasPiInstancesText).toBe(true);

      await shutdownServer();
    });

    it("RED: GET / HTML includes JavaScript that fetches /instances endpoint", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/?token=${token}`);
      expect(response.ok).toBe(true);
      
      const html = await response.text();
      
      // Must contain fetch call to /instances?token=
      expect(html).toMatch(/\/instances\?token=/i);

      await shutdownServer();
    });

    it("RED: GET / HTML contains loadInstances function", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/?token=${token}`);
      expect(response.ok).toBe(true);
      
      const html = await response.text();
      
      // Must contain loadInstances function declaration or reference
      expect(html).toMatch(/loadInstances/);

      await shutdownServer();
    });

    it("RED: GET / HTML contains renderInstances function", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/?token=${token}`);
      expect(response.ok).toBe(true);
      
      const html = await response.text();
      
      // Must contain renderInstances function declaration or reference
      expect(html).toMatch(/renderInstances/);

      await shutdownServer();
    });

    it("RED: GET / HTML structure allows displaying multiple instances", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/?token=${token}`);
      expect(response.ok).toBe(true);
      
      const html = await response.text();
      
      // Verify all required components are present:
      // 1. Instance picker container
      const hasInstancesId = html.includes('id="instances"');
      const hasPiInstancesText = html.toLowerCase().includes('pi instances');
      expect(hasInstancesId || hasPiInstancesText).toBe(true);
      
      // 2. Fetch call to /instances endpoint
      expect(html).toMatch(/\/instances\?token=/);
      
      // 3. loadInstances function
      expect(html).toMatch(/loadInstances/);
      
      // 4. renderInstances function
      expect(html).toMatch(/renderInstances/);

      await shutdownServer();
    });

    it("RED: GET / without token parameter returns 401", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/`);
      expect(response.status).toBe(401);

      await shutdownServer();
    });

    it("RED: GET / with invalid token returns 401", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/?token=invalid`);
      expect(response.status).toBe(401);

      await shutdownServer();
    });

    it("RED: GET / HTML includes mechanism to switch between instances", async () => {
      await startServer();

      const response = await fetch(`${serverUrl}/?token=${token}`);
      expect(response.ok).toBe(true);
      
      const html = await response.text();
      
      // Must have ability to switch target:
      // - Either form action update mechanism
      // - Or navigation to selected instance URL
      // - Look for common patterns: onclick, href, action, navigate, select
      const hasSwitchingMechanism = (
        html.includes('onclick') ||
        html.includes('href') ||
        html.includes('action') ||
        html.includes('navigate') ||
        html.includes('select')
      );
      
      expect(hasSwitchingMechanism).toBe(true);

      await shutdownServer();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: Hardening
  // ─────────────────────────────────────────────────────────────────────────
  describe("Phase 2: Hardening", () => {
    // ── shared helpers ──────────────────────────────────────────────────────

    const startServer = async (
      overrideNotify?: ReturnType<typeof vi.fn>
    ): Promise<{
      serverUrl: string;
      token: string;
      port: number;
      mockCtx: ExtensionCommandContext;
      mockNotify: ReturnType<typeof vi.fn>;
    }> => {
      const sessionStartHandlers = registeredHooks.get("session_start");
      expect(sessionStartHandlers).toBeDefined();

      const mockNotify = overrideNotify ?? vi.fn();
      const mockCtx: ExtensionCommandContext = {
        ui: { notify: mockNotify },
        cwd: "/test",
        model: "test-model",
      } as any;

      await sessionStartHandlers![0]({}, mockCtx);

      const mobileCommand = registeredCommands.get("mobile");
      await mobileCommand!.handler("status", mockCtx);

      const allCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
      const urlCall = allCalls.find((s) => /https?:\/\//.test(s));
      expect(urlCall).toBeDefined();

      const urlMatch = urlCall!.match(
        /https?:\/\/[^\s]+:(\d+)\/(?:\?token=([a-f0-9]+))?/
      );
      expect(urlMatch).not.toBeNull();

      const port = parseInt(urlMatch![1], 10);
      const token = urlMatch![2] ?? "";
      const proto = urlCall!.includes("https://") ? "https" : "http";
      const serverUrl = `${proto}://127.0.0.1:${port}`;

      return { serverUrl, token, port, mockCtx, mockNotify };
    };

    const shutdownServer = async () => {
      const handlers = registeredHooks.get("session_shutdown");
      if (handlers) {
        const ctx: ExtensionCommandContext = {
          ui: { notify: vi.fn() },
          cwd: "/test",
          model: "test-model",
        } as any;
        try { await handlers[0]({}, ctx); } catch (_) { /* ignore */ }
      }
    };

    beforeEach(() => {
      process.env.PI_MOBILE_BRIDGE_PORT = "0";
    });

    afterEach(async () => {
      await shutdownServer();
      delete process.env.PI_MOBILE_BRIDGE_HTTPS;
      delete process.env.PI_MOBILE_BRIDGE_RATE_LIMIT;
    });

    // ── 1. HTTPS Support ──────────────────────────────────────────────────
    describe("HTTPS Support", () => {
      it("starts HTTP server when PI_MOBILE_BRIDGE_HTTPS is 0", async () => {
        process.env.PI_MOBILE_BRIDGE_HTTPS = "0";

        const { serverUrl } = await startServer();
        expect(serverUrl).toMatch(/^http:\/\//);
      });

      it("starts HTTPS server when PI_MOBILE_BRIDGE_HTTPS=1", async () => {
        process.env.PI_MOBILE_BRIDGE_HTTPS = "1";

        const sessionStartHandlers = registeredHooks.get("session_start");
        expect(sessionStartHandlers).toBeDefined();

        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/test",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        const mobileCommand = registeredCommands.get("mobile");
        await mobileCommand!.handler("status", mockCtx);

        const allCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
        const urlCall = allCalls.find((s) => /https:\/\//.test(s));
        expect(urlCall).toBeDefined();
        expect(urlCall).toMatch(/^.*https:\/\//);
      });

      it("GET /health over HTTPS returns { alive: true }", async () => {
        process.env.PI_MOBILE_BRIDGE_HTTPS = "1";

        const sessionStartHandlers = registeredHooks.get("session_start");
        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/test",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        const mobileCommand = registeredCommands.get("mobile");
        await mobileCommand!.handler("status", mockCtx);

        const allCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
        const urlCall = allCalls.find((s) => /https:\/\//.test(s));
        expect(urlCall).toBeDefined();

        const urlMatch = urlCall!.match(/https:\/\/[^\s]+:(\d+)/);
        expect(urlMatch).not.toBeNull();
        const port = parseInt(urlMatch![1], 10);

        const previousTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        try {
          const response = await fetch(`https://127.0.0.1:${port}/health`);
          expect(response.ok).toBe(true);
          const data = await response.json();
          expect(data).toHaveProperty("alive", true);
        } finally {
          if (typeof previousTlsSetting === "string") {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting;
          } else {
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
          }
        }
      });

      it("/mobile status URL starts with https:// when HTTPS enabled", async () => {
        process.env.PI_MOBILE_BRIDGE_HTTPS = "1";

        const sessionStartHandlers = registeredHooks.get("session_start");
        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/test",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        const mobileCommand = registeredCommands.get("mobile");
        mockNotify.mockClear();
        await mobileCommand!.handler("status", mockCtx);

        const allCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
        const urlCall = allCalls.find((s) => /https:\/\//.test(s));
        expect(urlCall).toBeDefined();
        expect(urlCall).toMatch(/https:\/\/[\d.]+:\d+/);
      });
    });

    // ── 2. Token in Authorization Header ─────────────────────────────────
    describe("Token in Authorization Header", () => {
      it("POST /send accepts token via Authorization: Bearer header", async () => {
        const { serverUrl, token } = await startServer();

        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ message: "hello from bearer" }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data).toHaveProperty("success", true);
      });

      it("POST /send with body token still works (backward compatible)", async () => {
        const { serverUrl, token } = await startServer();

        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: "body token works" }),
        });

        expect(response.ok).toBe(true);
      });

      it("GET /answers accepts token via Authorization: Bearer header", async () => {
        const { serverUrl, token } = await startServer();

        const response = await fetch(`${serverUrl}/answers`, {
          headers: { "Authorization": `Bearer ${token}` },
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data).toHaveProperty("answers");
      });

      it("GET /answers with query param token still works (backward compatible)", async () => {
        const { serverUrl, token } = await startServer();

        const response = await fetch(`${serverUrl}/answers?token=${token}`);
        expect(response.ok).toBe(true);
      });

      it("GET /instances accepts token via Authorization: Bearer header", async () => {
        const { serverUrl, token } = await startServer();

        const response = await fetch(`${serverUrl}/instances`, {
          headers: { "Authorization": `Bearer ${token}` },
        });

        // Should be 200, not 401
        expect(response.status).not.toBe(401);
        expect(response.ok).toBe(true);
      });

      it("POST /send with invalid bearer token returns 401", async () => {
        const { serverUrl } = await startServer();

        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer notvalidtoken",
          },
          body: JSON.stringify({ message: "rejected" }),
        });

        expect(response.status).toBe(401);
      });
    });

    // ── 3. Token Rotation ─────────────────────────────────────────────────
    describe("Token Rotation", () => {
      it("/mobile rotate command exists and calls notify", async () => {
        const { mockCtx, mockNotify } = await startServer();

        const mobileCommand = registeredCommands.get("mobile");
        mockNotify.mockClear();
        await mobileCommand!.handler("rotate", mockCtx);

        expect(mockNotify).toHaveBeenCalled();
      });

      it("/mobile rotate generates a new token (notify includes new URL)", async () => {
        const { mockCtx, mockNotify, token: oldToken } = await startServer();

        const mobileCommand = registeredCommands.get("mobile");
        mockNotify.mockClear();
        await mobileCommand!.handler("rotate", mockCtx);

        const allCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
        const urlCall = allCalls.find((s) => /token=/.test(s));
        expect(urlCall).toBeDefined();

        // New token should differ from old token
        const newTokenMatch = urlCall!.match(/token=([a-f0-9]+)/);
        expect(newTokenMatch).not.toBeNull();
        const newToken = newTokenMatch![1];
        expect(newToken).not.toBe(oldToken);
        expect(newToken.length).toBeGreaterThanOrEqual(32);
      });

      it("old token rejected after rotation", async () => {
        const { serverUrl, mockCtx, token: oldToken } = await startServer();

        const mobileCommand = registeredCommands.get("mobile");
        await mobileCommand!.handler("rotate", mockCtx);

        // Old token should now be rejected
        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: oldToken, message: "should fail" }),
        });

        expect(response.status).toBe(401);
      });

      it("new token works after rotation", async () => {
        const { serverUrl, mockCtx, mockNotify } = await startServer();

        const mobileCommand = registeredCommands.get("mobile");
        mockNotify.mockClear();
        await mobileCommand!.handler("rotate", mockCtx);

        // Extract new token from notification
        const allCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
        const urlCall = allCalls.find((s) => /token=/.test(s));
        expect(urlCall).toBeDefined();
        const newTokenMatch = urlCall!.match(/token=([a-f0-9]+)/);
        expect(newTokenMatch).not.toBeNull();
        const newToken = newTokenMatch![1];

        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: newToken, message: "new token works" }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data).toHaveProperty("success", true);
      });
    });

    // ── 4. Enhanced Rate Limiting ─────────────────────────────────────────
    describe("Enhanced Rate Limiting", () => {
      it("PI_MOBILE_BRIDGE_RATE_LIMIT=5 overrides default limit", async () => {
        process.env.PI_MOBILE_BRIDGE_RATE_LIMIT = "5";

        // Reinitialize with the new env
        registeredCommands.clear();
        registeredHooks.clear();
        const freshModule = await import(
          "../extensions/mobile-bridge/index.ts?t=rate" + Date.now()
        );
        freshModule.default(mockPi);

        const { serverUrl, token } = await startServer();

        // 5 requests succeed
        for (let i = 0; i < 5; i++) {
          const r = await fetch(`${serverUrl}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, message: `msg ${i}` }),
          });
          expect(r.ok).toBe(true);
        }

        // 6th should be rate-limited
        const r6 = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: "over limit" }),
        });
        expect(r6.status).toBe(429);
      });

      it("429 response includes Retry-After header or retryAfter field", async () => {
        const { serverUrl, token } = await startServer();

        // Exhaust default limit (10)
        for (let i = 0; i < 10; i++) {
          await fetch(`${serverUrl}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, message: `msg ${i}` }),
          });
        }

        const r = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: "over" }),
        });

        expect(r.status).toBe(429);

        // Either header or body field must be present
        const hasHeader = r.headers.has("Retry-After");
        const body = await r.json();
        const hasField =
          typeof body.retryAfter === "number" ||
          typeof body["retry-after"] === "number" ||
          typeof body.retryAfterMs === "number";

        expect(hasHeader || hasField).toBe(true);
      });

      it("rate limit is tracked per-token, not just per-IP", async () => {
        // This test verifies that rotating the token resets the rate limit counter
        const { serverUrl, mockCtx, mockNotify } = await startServer();

        const mobileCommand = registeredCommands.get("mobile");

        // Exhaust rate limit with first token
        const statusCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
        const urlCall = statusCalls.find((s) => /token=/.test(s));
        const tokenMatch = urlCall?.match(/token=([a-f0-9]+)/);
        const firstToken = tokenMatch ? tokenMatch[1] : "";

        for (let i = 0; i < 10; i++) {
          await fetch(`${serverUrl}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: firstToken, message: `msg ${i}` }),
          });
        }

        // Rotate to get a new token
        mockNotify.mockClear();
        await mobileCommand!.handler("rotate", mockCtx);

        const rotateCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
        const rotateUrlCall = rotateCalls.find((s) => /token=/.test(s));
        const newTokenMatch = rotateUrlCall?.match(/token=([a-f0-9]+)/);
        const newToken = newTokenMatch ? newTokenMatch[1] : "";

        // New token should not be rate-limited yet
        const r = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: newToken, message: "fresh token" }),
        });

        expect(r.ok).toBe(true);
        expect(r.status).not.toBe(429);
      });
    });

    // ── 5. Input Validation ───────────────────────────────────────────────
    describe("Input Validation", () => {
      it("POST /send with empty message returns 400", async () => {
        const { serverUrl, token } = await startServer();

        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: "" }),
        });

        expect(response.status).toBe(400);
      });

      it("POST /send with message > 10000 chars returns 400 with length error", async () => {
        const { serverUrl, token } = await startServer();

        const longMessage = "x".repeat(10001);
        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: longMessage }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data).toHaveProperty("error");
        expect(data.error).toMatch(/length|too long|max|limit/i);
      });

      it("POST /send with non-string message returns 400", async () => {
        const { serverUrl, token } = await startServer();

        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: 12345 }),
        });

        expect(response.status).toBe(400);
      });

      it("POST /send with missing message field returns 400", async () => {
        const { serverUrl, token } = await startServer();

        const response = await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        expect(response.status).toBe(400);
      });
    });

    // ── 6. Error Logging ──────────────────────────────────────────────────
    describe("Error Logging", () => {
      it("getBridgeLogs() is exported and returns an array", async () => {
        const module = await import("../extensions/mobile-bridge/index.ts");
        expect(typeof module.getBridgeLogs).toBe("function");
        const logs = module.getBridgeLogs();
        expect(Array.isArray(logs)).toBe(true);
      });

      it("getBridgeLogs() returns string array", async () => {
        const module = await import("../extensions/mobile-bridge/index.ts");
        const logs = module.getBridgeLogs();
        for (const entry of logs) {
          expect(typeof entry).toBe("string");
        }
      });

      it("getBridgeLogs() includes server start entry after session_start", async () => {
        await startServer();

        const module = await import("../extensions/mobile-bridge/index.ts");
        const logs = module.getBridgeLogs();
        const hasStartEntry = logs.some(
          (l) => /start|listen|server|port/i.test(l)
        );
        expect(hasStartEntry).toBe(true);
      });

      it("getBridgeLogs() includes auth failure entry after bad token", async () => {
        const { serverUrl } = await startServer();

        await fetch(`${serverUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "badtoken", message: "fail" }),
        });

        const module = await import("../extensions/mobile-bridge/index.ts");
        const logs = module.getBridgeLogs();
        const hasAuthEntry = logs.some(
          (l) => /auth|unauthori[sz]|401|invalid token/i.test(l)
        );
        expect(hasAuthEntry).toBe(true);
      });

      it("getBridgeLogs() includes rate limit hit entry after 429", async () => {
        const { serverUrl, token } = await startServer();

        for (let i = 0; i <= 10; i++) {
          await fetch(`${serverUrl}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, message: `m${i}` }),
          });
        }

        const module = await import("../extensions/mobile-bridge/index.ts");
        const logs = module.getBridgeLogs();
        const hasRateEntry = logs.some(
          (l) => /rate.?limit|429|too many/i.test(l)
        );
        expect(hasRateEntry).toBe(true);
      });

      it("/mobile logs command notifies recent bridge log entries", async () => {
        const { mockCtx, mockNotify } = await startServer();

        const mobileCommand = registeredCommands.get("mobile");
        mockNotify.mockClear();
        await mobileCommand!.handler("logs", mockCtx);

        expect(mockNotify).toHaveBeenCalled();
        // Notification should include some log content
        const notification = mockNotify.mock.calls[0][0] as string;
        expect(notification.length).toBeGreaterThan(0);
      });
    });

    // ── 7. Graceful KDE Connect Degradation ──────────────────────────────
    describe("Graceful KDE Connect Degradation", () => {
      it("agent_end does not throw when KDE Connect spawn errors", async () => {
        spawnMock.mockImplementation((_cmd: string, _args: string[]) => {
          const child = new EventEmitter() as any;
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          child.kill = vi.fn();
          setTimeout(() => child.emit("error", new Error("kdeconnect unavailable")), 5);
          return child;
        });

        const agentEndHandlers = registeredHooks.get("agent_end");
        expect(agentEndHandlers).toBeDefined();

        await expect(
          agentEndHandlers![0]({
            messages: [{ role: "assistant", content: "hi" }],
          })
        ).resolves.not.toThrow();
      });

      it("agent_end logs KDE failure when spawn errors", async () => {
        spawnMock.mockImplementation((_cmd: string, _args: string[]) => {
          const child = new EventEmitter() as any;
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          child.kill = vi.fn();
          setTimeout(() => child.emit("error", new Error("kdeconnect unavailable")), 5);
          return child;
        });

        const agentEndHandlers = registeredHooks.get("agent_end");
        await agentEndHandlers![0]({
          messages: [{ role: "assistant", content: "response" }],
        });

        // Allow async error handling to complete
        await new Promise((r) => setTimeout(r, 50));

        const module = await import("../extensions/mobile-bridge/index.ts");
        if (typeof module.getBridgeLogs === "function") {
          const logs = module.getBridgeLogs();
          const hasKdeError = logs.some(
            (l) => /kde|kdeconnect|notification|error/i.test(l)
          );
          expect(hasKdeError).toBe(true);
        } else {
          // getBridgeLogs not yet implemented — this test will FAIL on that dependency
          expect(typeof module.getBridgeLogs).toBe("function");
        }
      });

      it("/mobile status shows kde: unavailable when spawn detection fails", async () => {
        // Mock spawnSync to fail (KDE Connect not installed)
        spawnSyncMock = vi.fn(() => {
          throw new Error("ENOENT");
        });

        registeredCommands.clear();
        registeredHooks.clear();
        const freshModule = await import(
          "../extensions/mobile-bridge/index.ts?t=kdeunavail" + Date.now()
        );
        freshModule.default(mockPi);

        process.env.PI_MOBILE_BRIDGE_PORT = "0";
        delete process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID;

        const sessionStartHandlers = registeredHooks.get("session_start");
        const mockNotify = vi.fn();
        const mockCtx: ExtensionCommandContext = {
          ui: { notify: mockNotify },
          cwd: "/test",
          model: "test-model",
        } as any;

        await sessionStartHandlers![0]({}, mockCtx);

        const mobileCommand = registeredCommands.get("mobile");
        mockNotify.mockClear();
        await mobileCommand!.handler("status", mockCtx);

        const allCalls: string[] = mockNotify.mock.calls.map((c: any[]) => c[0]);
        const statusCall = allCalls.find(
          (s) => /kde.*unavailab|kde.*none|kde.*not.*detected/i.test(s)
        );
        expect(statusCall).toBeDefined();
      });
    });
  });
});
