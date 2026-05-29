import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
    createServer as createHttpServer,
    type IncomingMessage,
    type Server as HttpServer,
    type ServerResponse,
} from "node:http";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import { homedir, networkInterfaces, tmpdir } from "node:os";
import type {
    AgentEndEvent,
    ExtensionAPI,
    ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";

const SMOKE_TOKEN = "MOBILE_BRIDGE_SMOKE_OK";
const SMOKE_PROMPT = `Reply exactly: ${SMOKE_TOKEN}`;
const DEFAULT_PORT = 4321;
const MAX_ANSWERS = 10;
const SERVER_HOST = "0.0.0.0";
const STATUS_HOST = "127.0.0.1";
const DEFAULT_HEARTBEAT_MS = 5_000;
const DEFAULT_STALE_MS = 30_000;
const INSTANCES_DIR_NAME = "instances";
const MAX_PREFERRED_PORT = 5_000;
const MAX_PORT = 65_535;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const KDECONNECT_PREFIX = "Pi finished: ";
const MAX_NOTIFICATION_PREVIEW = 80;
const KDECONNECT_TIMEOUT_MS = 5_000;
const MAX_DEBUG_VALUE_LENGTH = 72;
const MAX_MESSAGE_LENGTH = 10_000;
const MAX_LOG_ENTRIES = 100;
const RECENT_LOG_COUNT = 10;
const TLS_CONFIG_DIR = path.join(homedir(), ".config", "pi", "mobile-bridge");
const TLS_KEY_FILE = "tls-key.pem";
const TLS_CERT_FILE = "tls-cert.pem";

const KDECONNECT_DETECTION_COMMANDS = [
    { command: "kdeconnect-cli", args: ["--list-devices", "--id-only"], parser: "idOnly" },
    { command: "kdeconnect-cli", args: ["--list-devices"], parser: "list" },
    { command: "/usr/bin/kdeconnect-cli", args: ["--list-devices", "--id-only"], parser: "idOnly" },
    { command: "/usr/bin/kdeconnect-cli", args: ["--list-devices"], parser: "list" },
] as const;

type KdeConnectDetectionAttempt = {
    command: string;
    args: string[];
    status: number | null;
    stdout: string;
    stderr: string;
    error?: string;
    parsedId?: string;
};

type KdeConnectDetection = {
    deviceId?: string;
    envDeviceId?: string;
    attempts: KdeConnectDetectionAttempt[];
};

type MobileBridgeRegistryEntry = {
    id: string;
    label: string;
    cwd: string;
    port: number;
    lastSeen: number;
    url?: string;
};

type RateLimitResult = {
    allowed: boolean;
    retryAfter: number;
};

type TlsCredentials = {
    key: string;
    cert: string;
};

const logs: string[] = [];
let cachedKdeConnectDetection: KdeConnectDetection | undefined;
let hasCachedKdeConnectDetection = false;

function addBridgeLog(message: string) {
    const entry = `${new Date().toISOString()} ${message}`;
    logs.push(entry);

    if (logs.length > MAX_LOG_ENTRIES) {
        logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }
}

export function getBridgeLogs(): string[] {
    return [...logs];
}

function extractAssistantText(event: AgentEndEvent): string | undefined {
    const messages = Array.isArray(event?.messages) ? event.messages : [];

    for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index] as {
            role?: string;
            content?: unknown;
        };

        if (message?.role !== "assistant") {
            continue;
        }

        const content = message.content;
        if (typeof content === "string") {
            return content;
        }

        if (!Array.isArray(content)) {
            return undefined;
        }

        const text = content
            .filter((part): part is { type?: string; text?: unknown } => typeof part === "object" && part !== null)
            .filter((part) => part.type === "text" && typeof part.text === "string")
            .map((part) => part.text)
            .join("");

        return text || undefined;
    }

    return undefined;
}

function parsePort(value: string | undefined): number {
    if (!value) {
        return DEFAULT_PORT;
    }

    const port = Number.parseInt(value, 10);
    return Number.isInteger(port) && port >= 0 ? port : DEFAULT_PORT;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getSpawn(): typeof childProcess.spawn | undefined {
    try {
        return (childProcess as { spawn?: typeof childProcess.spawn }).spawn;
    } catch {
        return undefined;
    }
}

function getSpawnSync(): typeof childProcess.spawnSync | undefined {
    try {
        return (childProcess as { spawnSync?: typeof childProcess.spawnSync }).spawnSync;
    } catch {
        return undefined;
    }
}

function isHttpsEnabled(): boolean {
    return process.env.PI_MOBILE_BRIDGE_HTTPS !== "0";
}

function getTlsFilePaths() {
    return {
        keyPath: path.join(TLS_CONFIG_DIR, TLS_KEY_FILE),
        certPath: path.join(TLS_CONFIG_DIR, TLS_CERT_FILE),
    };
}

async function readTlsCredentials(): Promise<TlsCredentials | undefined> {
    const { keyPath, certPath } = getTlsFilePaths();

    try {
        const [key, cert] = await Promise.all([
            fs.readFile(keyPath, "utf8"),
            fs.readFile(certPath, "utf8"),
        ]);

        return { key, cert };
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
            return undefined;
        }

        throw error;
    }
}

function isIPv4Address(value: string): boolean {
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)
        && value.split(".").every((segment) => {
            const octet = Number.parseInt(segment, 10);
            return octet >= 0 && octet <= 255;
        });
}

async function ensureTlsCredentials(): Promise<TlsCredentials | undefined> {
    const { keyPath, certPath } = getTlsFilePaths();
    let generated = false;

    try {
        await fs.mkdir(TLS_CONFIG_DIR, { recursive: true });
        await Promise.all([
            removeRegistryEntry(keyPath),
            removeRegistryEntry(certPath),
        ]);

        const runSpawnSync = getSpawnSync();
        if (typeof runSpawnSync !== "function") {
            throw new Error("spawnSync unavailable");
        }

        const statusHost = resolveStatusHost(process.env.PI_MOBILE_BRIDGE_HOST, networkInterfaces());
        const subjectAltNameEntries = [
            "IP:127.0.0.1",
            ...(isIPv4Address(statusHost) && statusHost !== "127.0.0.1" ? [`IP:${statusHost}`] : []),
            "DNS:localhost",
        ];

        const result = runSpawnSync("openssl", [
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-keyout",
            keyPath,
            "-out",
            certPath,
            "-days",
            "365",
            "-nodes",
            "-subj",
            "/CN=pi-mobile-bridge",
            "-addext",
            `subjectAltName=${subjectAltNameEntries.join(",")}`,
        ], {
            encoding: "utf8",
            stdio: "pipe",
        });

        generated = true;

        if (result.error || result.status !== 0) {
            throw new Error(
                normalizeSpawnOutput(result.stderr)
                || result.error?.message
                || `openssl exited with status ${result.status ?? "unknown"}`,
            );
        }

        await Promise.all([
            fs.chmod(keyPath, 0o600),
            fs.chmod(certPath, 0o600).catch(() => undefined),
        ]);

        return await readTlsCredentials();
    } catch (error) {
        if (generated) {
            await Promise.all([
                removeRegistryEntry(keyPath),
                removeRegistryEntry(certPath),
            ]);
        }

        addBridgeLog(`tls setup failed: ${error instanceof Error ? error.message : String(error)}; falling back to http`);
        return undefined;
    }
}

function getRateLimitMaxRequests(): number {
    return parsePositiveInteger(process.env.PI_MOBILE_BRIDGE_RATE_LIMIT, RATE_LIMIT_MAX_REQUESTS);
}

function getRegistryBaseDir(): string {
    return process.env.PI_MOBILE_BRIDGE_REGISTRY_DIR || path.join(tmpdir(), "pi-mobile-bridge");
}

function getInstancesDir(): string {
    return path.join(getRegistryBaseDir(), INSTANCES_DIR_NAME);
}

function getHeartbeatMs(): number {
    return parsePositiveInteger(process.env.PI_MOBILE_BRIDGE_HEARTBEAT_MS, DEFAULT_HEARTBEAT_MS);
}

function getStaleMs(): number {
    return parsePositiveInteger(process.env.PI_MOBILE_BRIDGE_STALE_MS, DEFAULT_STALE_MS);
}

function toRegistryEntry(value: unknown): MobileBridgeRegistryEntry | undefined {
    if (!value || typeof value !== "object") {
        return undefined;
    }

    const record = value as Record<string, unknown>;
    const { id, label, cwd, port, lastSeen } = record;

    if (
        typeof id !== "string"
        || typeof label !== "string"
        || typeof cwd !== "string"
        || typeof port !== "number"
        || !Number.isFinite(port)
        || typeof lastSeen !== "number"
        || !Number.isFinite(lastSeen)
        || (typeof record.url !== "undefined" && typeof record.url !== "string")
    ) {
        return undefined;
    }

    return {
        id,
        label,
        cwd,
        port,
        lastSeen,
        url: typeof record.url === "string" ? record.url : undefined,
    };
}

async function writeRegistryEntry(filePath: string, entry: MobileBridgeRegistryEntry): Promise<void> {
    const directory = path.dirname(filePath);
    const tempPath = path.join(directory, `${path.basename(filePath)}.${randomUUID()}.tmp`);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(entry), "utf8");
    await fs.rename(tempPath, filePath);
}

async function removeRegistryEntry(filePath: string): Promise<void> {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    }
}

async function cleanupStaleRegistryEntries(now = Date.now()): Promise<void> {
    const instancesDir = getInstancesDir();
    const staleMs = getStaleMs();
    let fileNames: string[] = [];

    try {
        fileNames = await fs.readdir(instancesDir);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return;
        }

        throw error;
    }

    await Promise.all(
        fileNames
            .filter((fileName) => fileName.endsWith(".json"))
            .map(async (fileName) => {
                const filePath = path.join(instancesDir, fileName);

                try {
                    const content = await fs.readFile(filePath, "utf8");
                    const record = JSON.parse(content) as { lastSeen?: unknown };

                    if (typeof record.lastSeen !== "number" || !Number.isFinite(record.lastSeen)) {
                        return;
                    }

                    if (now - record.lastSeen > staleMs) {
                        await removeRegistryEntry(filePath);
                    }
                } catch {
                    return;
                }
            }),
    );
}

async function readRegistryEntries(now = Date.now()): Promise<MobileBridgeRegistryEntry[]> {
    const instancesDir = getInstancesDir();
    const staleCutoff = now - getStaleMs();
    let fileNames: string[] = [];

    try {
        fileNames = await fs.readdir(instancesDir);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return [];
        }

        throw error;
    }

    const entries = await Promise.all(
        fileNames
            .filter((fileName) => fileName.endsWith(".json"))
            .map(async (fileName) => {
                try {
                    const content = await fs.readFile(path.join(instancesDir, fileName), "utf8");
                    const entry = toRegistryEntry(JSON.parse(content));

                    if (!entry || entry.lastSeen < staleCutoff) {
                        return undefined;
                    }

                    return entry;
                } catch {
                    return undefined;
                }
            }),
    );

    return entries.filter((entry): entry is MobileBridgeRegistryEntry => Boolean(entry));
}

async function canBindPort(port: number): Promise<boolean> {
    return await new Promise((resolve) => {
        const probe = createHttpServer();
        let settled = false;

        const finish = (result: boolean) => {
            if (settled) {
                return;
            }

            settled = true;
            resolve(result);
        };

        probe.once("error", () => {
            finish(false);
        });

        probe.listen(port, SERVER_HOST, () => {
            probe.close(() => {
                finish(true);
            });
        });
    });
}

export async function findAvailablePort(startPort: number): Promise<number> {
    if (startPort === 0) {
        return 0;
    }

    if (!Number.isInteger(startPort) || startPort < 0 || startPort > MAX_PORT) {
        throw new Error(`Invalid mobile bridge port: ${startPort}`);
    }

    if (await canBindPort(startPort)) {
        return startPort;
    }

    if (startPort < MAX_PREFERRED_PORT) {
        for (let port = startPort + 1; port < MAX_PREFERRED_PORT; port++) {
            if (await canBindPort(port)) {
                return port;
            }
        }
    }

    for (let port = Math.max(startPort + 1, MAX_PREFERRED_PORT); port <= MAX_PORT; port++) {
        if (await canBindPort(port)) {
            return port;
        }
    }

    throw new Error(`Unable to find an available mobile bridge port from ${startPort}`);
}

export function resolveStatusHost(
    envHost?: string,
    interfaces?: ReturnType<typeof networkInterfaces>,
): string {
    const host = envHost?.trim();
    if (host) {
        return host;
    }

    const resolvedInterfaces = interfaces ?? networkInterfaces();

    for (const entries of Object.values(resolvedInterfaces)) {
        for (const entry of entries || []) {
            if (!entry || entry.internal) {
                continue;
            }

            if (entry.family === "IPv4" || entry.family === 4) {
                return entry.address;
            }
        }
    }

    return STATUS_HOST;
}

function createNotificationPreview(text: string): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) {
        return KDECONNECT_PREFIX.trimEnd();
    }

    const available = MAX_NOTIFICATION_PREVIEW - KDECONNECT_PREFIX.length;
    if (normalized.length <= available) {
        return `${KDECONNECT_PREFIX}${normalized}`;
    }

    if (available <= 1) {
        return `${KDECONNECT_PREFIX.slice(0, Math.max(0, MAX_NOTIFICATION_PREVIEW - 1))}…`;
    }

    return `${KDECONNECT_PREFIX}${normalized.slice(0, available - 1).trimEnd()}…`;
}

function normalizeSpawnOutput(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    if (Buffer.isBuffer(value)) {
        return value.toString("utf8");
    }

    return "";
}

function parseKdeConnectIdOnly(stdout: string): string | undefined {
    return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
}

function parseKdeConnectList(stdout: string): string | undefined {
    for (const line of stdout.split(/\r?\n/)) {
        const match = line.match(/:\s*([a-f0-9]+)\s+on\s+/i);
        if (match?.[1]) {
            return match[1];
        }
    }

    return undefined;
}

function truncateDebugValue(value: string, maxLength = MAX_DEBUG_VALUE_LENGTH): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized || normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function isKdeUnavailable(detection: KdeConnectDetection): boolean {
    if (detection.deviceId || detection.envDeviceId || detection.attempts.length === 0) {
        return false;
    }

    const hasSuccessfulCommand = detection.attempts.some((attempt) => attempt.status === 0 && !attempt.error);
    const hasFailure = detection.attempts.some(
        (attempt) => Boolean(attempt.error) || (typeof attempt.status === "number" && attempt.status !== 0),
    );

    return hasFailure && !hasSuccessfulCommand;
}

async function detectKdeConnectDevice(options?: { refresh?: boolean }): Promise<KdeConnectDetection> {
    const envDeviceId = process.env.PI_MOBILE_BRIDGE_KDE_DEVICE_ID?.trim();
    if (envDeviceId) {
        return {
            deviceId: envDeviceId,
            envDeviceId,
            attempts: [],
        };
    }

    if (!options?.refresh && hasCachedKdeConnectDetection) {
        return cachedKdeConnectDetection || { attempts: [] };
    }

    const attempts: KdeConnectDetectionAttempt[] = [];

    const runSpawnSync = getSpawnSync();

    if (typeof runSpawnSync !== "function") {
        attempts.push({
            command: "spawnSync",
            args: [],
            status: null,
            stdout: "",
            stderr: "",
            error: "spawnSync unavailable",
        });
    } else {
        for (const attempt of KDECONNECT_DETECTION_COMMANDS) {
            try {
                const result = runSpawnSync(attempt.command, [...attempt.args], {
                    encoding: "utf8",
                    timeout: KDECONNECT_TIMEOUT_MS,
                });
                const stdout = normalizeSpawnOutput(result.stdout);
                const stderr = normalizeSpawnOutput(result.stderr);
                const parsedId = attempt.parser === "idOnly"
                    ? parseKdeConnectIdOnly(stdout)
                    : parseKdeConnectList(stdout);

                attempts.push({
                    command: attempt.command,
                    args: [...attempt.args],
                    status: typeof result.status === "number" ? result.status : null,
                    stdout,
                    stderr,
                    error: result.error?.message,
                    parsedId,
                });

                if (!result.error && result.status === 0 && parsedId) {
                    cachedKdeConnectDetection = {
                        deviceId: parsedId,
                        attempts,
                    };
                    hasCachedKdeConnectDetection = true;
                    return cachedKdeConnectDetection;
                }
            } catch (error) {
                attempts.push({
                    command: attempt.command,
                    args: [...attempt.args],
                    status: null,
                    stdout: "",
                    stderr: "",
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    cachedKdeConnectDetection = { attempts };
    hasCachedKdeConnectDetection = true;

    if (isKdeUnavailable(cachedKdeConnectDetection)) {
        addBridgeLog(`kde detect unavailable: ${formatKdeConnectDebug(cachedKdeConnectDetection)}`);
    }

    return cachedKdeConnectDetection;
}

async function getKdeConnectDeviceId(): Promise<string | undefined> {
    const detection = await detectKdeConnectDevice();
    return detection.deviceId;
}

function formatKdeDeviceInfo(detection: KdeConnectDetection): string {
    if (detection.deviceId) {
        return `kde: ${detection.deviceId}`;
    }

    return isKdeUnavailable(detection) ? "kde: unavailable" : "kde: no KDE device";
}

function formatKdeConnectDebug(detection: KdeConnectDetection): string {
    const parts = [
        "mobile devices debug — kde debug",
        `PATH=${truncateDebugValue(process.env.PATH || "", 120)}`,
    ];

    if (detection.envDeviceId) {
        parts.push(`env=${detection.envDeviceId}`);
        parts.push("commands=skipped (env override)");
    } else {
        for (const attempt of detection.attempts) {
            const command = `${attempt.command} ${attempt.args.join(" ")}`.trim();
            const details = [
                `${command || "command"} status=${attempt.status ?? "none"}`,
            ];

            if (attempt.error) {
                details.push(`error=${truncateDebugValue(attempt.error)}`);
            }
            if (attempt.stdout) {
                details.push(`stdout=${truncateDebugValue(attempt.stdout)}`);
            }
            if (attempt.stderr) {
                details.push(`stderr=${truncateDebugValue(attempt.stderr)}`);
            }
            if (attempt.parsedId) {
                details.push(`id=${attempt.parsedId}`);
            }

            parts.push(details.join(" "));
        }

        if (!detection.attempts.length) {
            parts.push("commands=none");
        }
    }

    parts.push(`final=${detection.deviceId || "none"}`);
    return parts.join("; ");
}

async function createKdeConnectArgs(baseArgs: string[]): Promise<{ args: string[]; deviceId?: string }> {
    const deviceId = await getKdeConnectDeviceId();
    return {
        args: deviceId ? [...baseArgs, "-d", deviceId] : baseArgs,
        deviceId,
    };
}

async function createKdeConnectShareArgs(url: string): Promise<{ args: string[]; deviceId?: string }> {
    return createKdeConnectArgs(["--share", url]);
}

async function createKdeConnectPingArgs(preview: string): Promise<{ args: string[]; deviceId?: string }> {
    return createKdeConnectArgs(["--ping-msg", preview]);
}

async function notifyKdeConnect(text: string) {
    try {
        const preview = createNotificationPreview(text);
        const { args } = await createKdeConnectPingArgs(preview);
        const runSpawn = getSpawn();
        if (typeof runSpawn !== "function") {
            throw new Error("spawn unavailable");
        }

        const child = runSpawn("kdeconnect-cli", args, { stdio: "ignore" });
        child.on("error", (error) => {
            addBridgeLog(`kde notification error: ${error instanceof Error ? error.message : String(error)}`);
        });
        child.on("exit", (code) => {
            if (typeof code === "number" && code !== 0) {
                addBridgeLog(`kde notification exit: ${code}`);
            }
        });
        child.unref?.();
    } catch (error) {
        addBridgeLog(`kde notification setup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function extractBearerToken(request: IncomingMessage): string | undefined {
    const header = request.headers.authorization;
    if (typeof header !== "string") {
        return undefined;
    }

    const match = header.trim().match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || undefined;
}

function extractToken(
    request: IncomingMessage,
    url: URL,
    bodyToken?: unknown,
): string | undefined {
    const queryToken = url.searchParams.get("token")?.trim();
    if (queryToken) {
        return queryToken;
    }

    if (typeof bodyToken === "string" && bodyToken.trim()) {
        return bodyToken.trim();
    }

    return extractBearerToken(request);
}

function isValidToken(input: string | undefined, expected: string | undefined): boolean {
    if (!input || !expected) {
        return false;
    }

    const a = Buffer.from(input);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
        return false;
    }

    return timingSafeEqual(a, b);
}

function sweepRateLimitRequests(requestsByClient: Map<string, number[]>, now = Date.now()) {
    for (const [clientKey, timestamps] of requestsByClient) {
        const newestTimestamp = timestamps[timestamps.length - 1];
        if (typeof newestTimestamp !== "number" || now - newestTimestamp >= RATE_LIMIT_WINDOW_MS) {
            requestsByClient.delete(clientKey);
            continue;
        }

        requestsByClient.set(
            clientKey,
            timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS),
        );
    }
}

function consumeRateLimit(
    requestsByClient: Map<string, number[]>,
    clientKey: string,
    maxRequests: number,
    now = Date.now(),
): RateLimitResult {
    const recentRequests = (requestsByClient.get(clientKey) || []).filter(
        (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );

    if (recentRequests.length >= maxRequests) {
        requestsByClient.set(clientKey, recentRequests);
        const oldestTimestamp = recentRequests[0] ?? now;
        const retryAfter = Math.max(1, Math.ceil((oldestTimestamp + RATE_LIMIT_WINDOW_MS - now) / 1_000));
        return { allowed: false, retryAfter };
    }

    recentRequests.push(now);
    requestsByClient.set(clientKey, recentRequests);
    return { allowed: true, retryAfter: 0 };
}

function json(
    response: ServerResponse,
    statusCode: number,
    body: unknown,
    headers: Record<string, string> = {},
) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        ...headers,
    });
    response.end(JSON.stringify(body));
}

function html(response: ServerResponse, statusCode: number, body: string) {
    response.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
    response.end(body);
}

function readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = "";
        let settled = false;

        const onData = (chunk: string) => {
            body += chunk;
        };
        const onEnd = () => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            resolve(body);
        };
        const onError = (error: Error) => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            request.destroy();
            reject(error);
        };
        const cleanup = () => {
            request.off("data", onData);
            request.off("end", onEnd);
            request.off("error", onError);
            request.setTimeout(0);
        };

        request.setEncoding("utf8");
        request.setTimeout(10_000, () => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            request.destroy();
            resolve("");
        });
        request.on("data", onData);
        request.once("end", onEnd);
        request.once("error", onError);
    });
}

function createIndexHtml() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pi Mobile Bridge</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #282828; color: #d4be98; }
    main { max-width: 44rem; margin: 0 auto; display: grid; gap: 1rem; }
    section { background: #32302f; border: 1px solid #45403d; border-radius: 1rem; padding: 1rem; }
    h1, h2 { margin-top: 0; color: #d8a657; }
    code { color: #d8a657; }
    textarea, input, button { width: 100%; box-sizing: border-box; margin-top: 0.75rem; }
    textarea, input, button, .instance-link { padding: 0.75rem; border-radius: 0.75rem; }
    textarea, input, pre { border: 1px solid #45403d; background: #3c3836; color: inherit; }
    button, .instance-link { border: 0; background: #7daea3; color: #282828; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease; }
    button:hover, .instance-link:hover { background: #89b482; }
    pre, ul { white-space: pre-wrap; padding: 0.75rem; border-radius: 0.75rem; }
    pre { margin-bottom: 0; }
    ul { margin: 0; padding-left: 1.25rem; background: #3c3836; border: 1px solid #45403d; }
    li + li { margin-top: 0.5rem; }
    .muted { color: #928374; }
    .instance-grid { display: grid; gap: 0.75rem; margin-top: 0.75rem; }
    .instance-card { display: grid; gap: 0.35rem; padding: 0.75rem; border-radius: 0.75rem; background: #3c3836; border: 1px solid #45403d; }
    .instance-meta { color: #a89984; font-size: 0.9rem; }
    .status-ready, .status-success { color: #a9b665; }
    .status-error { color: #ea6962; }
  </style>
</head>
<body>
  <main>
    <section aria-labelledby="send-heading">
      <h1 id="send-heading">Pi Mobile Bridge</h1>
      <p class="muted">Use the token from <code>/mobile status</code> to send prompts and inspect recent answers.</p>
      <input id="token" placeholder="token" />
      <textarea id="message" rows="5" placeholder="Send a message to Pi"></textarea>
      <button id="send" type="button">Send</button>
      <pre id="result" class="status-ready">Ready.</pre>
    </section>

    <section aria-labelledby="answers-heading">
      <h2 id="answers-heading">Recent answers</h2>
      <ul id="answers"><li class="muted">No answers yet.</li></ul>
    </section>

    <section aria-labelledby="instances-heading">
      <h2 id="instances-heading">Pi instances</h2>
      <p class="muted">Switch to another running Pi instance. Tokens are reused as a temporary MVP placeholder.</p>
      <div id="instances" class="instance-grid">Loading instances…</div>
    </section>
  </main>
  <script>
    const params = new URLSearchParams(location.search);
    const tokenInput = document.getElementById('token');
    const messageInput = document.getElementById('message');
    const result = document.getElementById('result');
    const instancesContainer = document.getElementById('instances');
    const answersList = document.getElementById('answers');
    const tokenFromUrl = params.get('token');

    function getToken() {
      return (tokenFromUrl || tokenInput.value || '').trim();
    }

    function setResultStatus(value, type) {
      result.className = type === 'error' ? 'status-error' : type === 'success' ? 'status-success' : 'status-ready';
      result.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function getInstanceUrl(instance, token) {
      if (instance && typeof instance.url === 'string' && instance.url) {
        return instance.url;
      }

      const hostname = location.hostname || '127.0.0.1';
      return location.protocol + '//' + hostname + ':' + instance.port + '/?token=' + encodeURIComponent(token);
    }

    function renderInstances(instances) {
      if (!Array.isArray(instances) || instances.length === 0) {
        instancesContainer.innerHTML = '<p class="muted">No live Pi instances found.</p>';
        return;
      }

      const token = getToken();
      instancesContainer.innerHTML = instances.map((instance) => {
        const label = escapeHtml(instance.label || ('Pi on ' + instance.port));
        const cwd = escapeHtml(instance.cwd || '');
        const targetUrl = escapeHtml(getInstanceUrl(instance, token));
        return '<article class="instance-card">'
          + '<strong>' + label + '</strong>'
          + '<span class="instance-meta">' + cwd + ' · port ' + escapeHtml(instance.port) + '</span>'
          + '<a class="instance-link" href="' + targetUrl + '" onclick="window.location.href=this.href; return false;">Open instance</a>'
          + '</article>';
      }).join('');
    }

    async function loadInstances() {
      const token = getToken();
      if (!token) {
        instancesContainer.innerHTML = '<p class="muted">Missing token.</p>';
        return;
      }

      const response = await fetch('/instances?token=' + encodeURIComponent(token));
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        instancesContainer.innerHTML = '<p class="muted">Unable to load instances.</p>';
        return;
      }

      renderInstances(data.instances || []);
    }

    function renderAnswers(answers) {
      if (!Array.isArray(answers) || answers.length === 0) {
        answersList.innerHTML = '<li class="muted">No answers yet.</li>';
        return;
      }

      answersList.innerHTML = answers
        .slice()
        .reverse()
        .map((answer) => '<li>' + escapeHtml(answer) + '</li>')
        .join('');
    }

    async function loadAnswers() {
      const token = getToken();
      if (!token) {
        renderAnswers([]);
        return;
      }

      const response = await fetch('/answers?token=' + encodeURIComponent(token));
      const data = await response.json().catch(() => ({}));
      renderAnswers(response.ok ? (data.answers || []) : []);
    }

    tokenInput.value = getToken();

    if (tokenFromUrl) {
      tokenInput.setAttribute('style', 'display:none');
    }

    document.getElementById('send').addEventListener('click', async () => {
      const token = getToken();
      const message = messageInput.value.trim();
      const response = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, message }),
      });
      const data = await response.json().catch(() => ({}));
      setResultStatus(data, response.ok ? 'success' : 'error');

      if (response.ok) {
        messageInput.value = '';
        await loadAnswers();
      }
    });

    void loadInstances();
    void loadAnswers();
  </script>
</body>
</html>`;
}

async function notifyStatus(
    ctx: ExtensionCommandContext,
    pendingSmoke: boolean,
    lastAnswer: string | undefined,
    serverUrl: string | undefined,
    busy: boolean,
) {
    const answerText = lastAnswer?.trim() ? lastAnswer : "no answer yet";
    const bridgeText = serverUrl ? `; bridge: ${serverUrl}` : "; bridge: offline";
    const kdeText = formatKdeDeviceInfo(await detectKdeConnectDevice());
    ctx.ui.notify(
        `mobile status — pending smoke: ${pendingSmoke ? "yes" : "no"}; busy: ${busy ? "yes" : "no"}; last answer: ${answerText}${bridgeText}; ${kdeText}`,
    );
}

async function notifyDevices(ctx: ExtensionCommandContext) {
    ctx.ui.notify(`mobile devices — ${formatKdeDeviceInfo(await detectKdeConnectDevice())}`);
}

async function notifyDevicesDebug(ctx: ExtensionCommandContext) {
    ctx.ui.notify(formatKdeConnectDebug(await detectKdeConnectDevice({ refresh: true })));
}

function notifyHelp(ctx: ExtensionCommandContext) {
    ctx.ui.notify("mobile help — use /mobile smoke, /mobile status, /mobile devices, /mobile devices debug, /mobile link, /mobile rotate, or /mobile logs");
}

export default function (pi: ExtensionAPI) {
    cachedKdeConnectDetection = undefined;
    hasCachedKdeConnectDetection = false;

    let pendingSmoke = false;
    let lastAnswer: string | undefined;
    let smokeCtx: ExtensionCommandContext | undefined;
    let busy = false;
    let answers: string[] = [];
    let server: HttpServer | HttpsServer | undefined;
    let serverPort: number | undefined;
    let serverProtocol: "http" | "https" = isHttpsEnabled() ? "https" : "http";
    let instanceCwd = process.cwd();
    let instanceLabel = path.basename(instanceCwd) || instanceCwd;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let token = randomBytes(32).toString("hex");
    const instanceId = randomUUID();
    const requestsByClient = new Map<string, number[]>();

    const getServerUrl = () => (
        serverPort
            ? `${serverProtocol}://${resolveStatusHost(process.env.PI_MOBILE_BRIDGE_HOST, networkInterfaces())}:${serverPort}/?token=${token}`
            : undefined
    );

    const getRegistryFilePath = () => path.join(getInstancesDir(), `${instanceId}.json`);

    const writeOwnRegistry = async () => {
        if (!serverPort) {
            return;
        }

        await writeRegistryEntry(getRegistryFilePath(), {
            id: instanceId,
            label: instanceLabel,
            cwd: instanceCwd,
            port: serverPort,
            lastSeen: Date.now(),
            url: getServerUrl(),
        });
    };

    const stopHeartbeat = () => {
        if (!heartbeatTimer) {
            return;
        }

        clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
    };

    const startHeartbeat = () => {
        stopHeartbeat();
        heartbeatTimer = setInterval(() => {
            sweepRateLimitRequests(requestsByClient);
            void writeOwnRegistry().catch(() => undefined);
        }, getHeartbeatMs());
        heartbeatTimer.unref?.();
    };

    const shareBridgeLink = async (url: string) => {
        try {
            const { args, deviceId } = await createKdeConnectShareArgs(url);
            const runSpawn = getSpawn();
            if (typeof runSpawn !== "function") {
                throw new Error("spawn unavailable");
            }

            const child = runSpawn("kdeconnect-cli", args, {
                stdio: "ignore",
            });
            child.on("error", (error) => {
                addBridgeLog(`kde share error: ${error instanceof Error ? error.message : String(error)}`);
            });
            child.on("exit", (code) => {
                if (typeof code === "number" && code !== 0) {
                    addBridgeLog(`kde share exit: ${code}`);
                }
            });
            child.unref?.();
            return deviceId;
        } catch (error) {
            addBridgeLog(`kde share setup failed: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    };

    const closeServer = async () => {
        if (!server) {
            serverPort = undefined;
            serverProtocol = "http";
            return;
        }

        const activeServer = server;
        server = undefined;
        serverPort = undefined;
        serverProtocol = "http";

        await new Promise<void>((resolve, reject) => {
            activeServer.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    };

    const startServer = async () => {
        if (server && server.listening) {
            return;
        }

        const httpsCredentials = isHttpsEnabled() ? await ensureTlsCredentials() : undefined;
        serverProtocol = httpsCredentials ? "https" : "http";

        const requestHandler = async (request: IncomingMessage, response: ServerResponse) => {
            try {
                const url = new URL(request.url || "/", `${serverProtocol}://${STATUS_HOST}`);
                const clientIp = request.socket.remoteAddress || "unknown";
                const logUnauthorized = (receivedToken?: string) => {
                    addBridgeLog(
                        `auth failure path=${url.pathname} ip=${clientIp} token=${truncateDebugValue(receivedToken || "missing", 24)}`,
                    );
                };

                if (request.method === "GET" && url.pathname === "/health") {
                    json(response, 200, { alive: true, timestamp: Date.now() });
                    return;
                }

                if (request.method === "GET" && url.pathname === "/answers") {
                    const requestToken = extractToken(request, url);
                    if (!isValidToken(requestToken, token)) {
                        logUnauthorized(requestToken);
                        json(response, 401, { error: "unauthorized" });
                        return;
                    }

                    json(response, 200, { answers });
                    return;
                }

                if (request.method === "GET" && url.pathname === "/instances") {
                    const requestToken = extractToken(request, url);
                    if (!isValidToken(requestToken, token)) {
                        logUnauthorized(requestToken);
                        json(response, 401, { error: "unauthorized" });
                        return;
                    }

                    json(response, 200, { instances: await readRegistryEntries() });
                    return;
                }

                if (request.method === "POST" && url.pathname === "/send") {
                    const rawBody = await readBody(request);
                    const body = rawBody ? JSON.parse(rawBody) as { token?: unknown; message?: unknown } : {};
                    const requestToken = extractToken(request, url, body.token);

                    if (!isValidToken(requestToken, token)) {
                        logUnauthorized(requestToken);
                        json(response, 401, { error: "unauthorized" });
                        return;
                    }

                    if (typeof body.message !== "string" || !body.message.trim()) {
                        json(response, 400, { error: "message required" });
                        return;
                    }

                    if (body.message.length > MAX_MESSAGE_LENGTH) {
                        json(response, 400, { error: `message too long (max ${MAX_MESSAGE_LENGTH} chars)` });
                        return;
                    }

                    const rateLimitKey = requestToken ? `token:${requestToken}` : `ip:${clientIp}`;
                    const rateLimit = consumeRateLimit(
                        requestsByClient,
                        rateLimitKey,
                        getRateLimitMaxRequests(),
                    );
                    if (!rateLimit.allowed) {
                        addBridgeLog(`rate limit hit path=${url.pathname} key=${truncateDebugValue(rateLimitKey, 48)} retryAfter=${rateLimit.retryAfter}`);
                        json(
                            response,
                            429,
                            { error: "rate limit exceeded", retryAfter: rateLimit.retryAfter },
                            { "Retry-After": String(rateLimit.retryAfter) },
                        );
                        return;
                    }

                    if (busy) {
                        pi.sendUserMessage(body.message, { deliverAs: "followUp" });
                        json(response, 200, { success: true, queued: true });
                        return;
                    }

                    pi.sendUserMessage(body.message);
                    json(response, 200, { success: true, queued: false });
                    return;
                }

                if (request.method === "GET" && url.pathname === "/") {
                    const requestToken = extractToken(request, url);
                    if (!isValidToken(requestToken, token)) {
                        logUnauthorized(requestToken);
                        json(response, 401, { error: "unauthorized" });
                        return;
                    }

                    html(response, 200, createIndexHtml());
                    return;
                }

                json(response, 404, { error: "not found" });
            } catch {
                json(response, 400, { error: "bad request" });
            }
        };

        server = httpsCredentials
            ? createHttpsServer(httpsCredentials, (request, response) => {
                void requestHandler(request, response);
            })
            : createHttpServer((request, response) => {
                void requestHandler(request, response);
            });

        const requestedPort = parsePort(process.env.PI_MOBILE_BRIDGE_PORT);
        const listenPort = requestedPort === 0 ? 0 : await findAvailablePort(requestedPort);

        await new Promise<void>((resolve, reject) => {
            server!.once("error", reject);
            server!.listen(listenPort, SERVER_HOST, () => {
                const address = server!.address();
                server!.off("error", reject);

                if (!address || typeof address === "string") {
                    reject(new Error("Unable to resolve mobile bridge port"));
                    return;
                }

                serverPort = address.port;
                addBridgeLog(`server start protocol=${serverProtocol} port=${serverPort}`);
                resolve();
            });
        });
    };

    pi.registerCommand("mobile", {
        description: "Mobile bridge smoke helpers",
        handler: async (args, ctx) => {
            const parts = args.trim().split(/\s+/).filter(Boolean).map((part) => part.toLowerCase());
            const subcommand = parts[0];
            const detail = parts[1];

            if (!subcommand || subcommand === "status") {
                await notifyStatus(ctx, pendingSmoke, lastAnswer, getServerUrl(), busy);
                return;
            }

            if (subcommand === "smoke") {
                smokeCtx = ctx;
                pendingSmoke = true;
                pi.sendUserMessage(SMOKE_PROMPT);
                ctx.ui.notify("mobile smoke started — waiting for assistant reply");
                return;
            }

            if (subcommand === "devices") {
                if (detail === "debug") {
                    await notifyDevicesDebug(ctx);
                    return;
                }

                await notifyDevices(ctx);
                return;
            }

            if (subcommand === "rotate") {
                token = randomBytes(32).toString("hex");
                await writeOwnRegistry().catch(() => undefined);
                addBridgeLog("token rotated");
                ctx.ui.notify(`mobile rotate — ${getServerUrl() || "bridge offline"}`);
                return;
            }

            if (subcommand === "logs") {
                const recentLogs = getBridgeLogs().slice(-RECENT_LOG_COUNT);
                ctx.ui.notify(
                    recentLogs.length
                        ? `mobile logs — ${recentLogs.join("\n")}`
                        : "mobile logs — no bridge logs yet",
                );
                return;
            }

            if (subcommand === "link") {
                const serverUrl = getServerUrl();
                if (!server?.listening || !serverUrl) {
                    ctx.ui.notify("mobile link not running — start a session first");
                    return;
                }

                const deviceId = await shareBridgeLink(serverUrl);
                ctx.ui.notify(
                    deviceId
                        ? `mobile link sent to ${deviceId} — ${serverUrl}`
                        : `mobile link sent — ${serverUrl}; ${formatKdeDeviceInfo(await detectKdeConnectDevice())}`,
                );
                return;
            }

            notifyHelp(ctx);
        },
    });

    pi.on("session_start", async (_event, ctx) => {
        instanceCwd = typeof ctx?.cwd === "string" && ctx.cwd ? ctx.cwd : process.cwd();
        instanceLabel = path.basename(instanceCwd) || instanceCwd;

        await startServer();
        await cleanupStaleRegistryEntries();
        await writeOwnRegistry();
        startHeartbeat();
        await getKdeConnectDeviceId();
    });

    pi.on("session_shutdown", async () => {
        stopHeartbeat();

        try {
            await closeServer();
        } finally {
            await removeRegistryEntry(getRegistryFilePath());
        }
    });

    pi.on("agent_start", async () => {
        busy = true;
    });

    pi.on("agent_end", async (event) => {
        busy = false;

        const text = extractAssistantText(event);
        if (!text) {
            return;
        }

        lastAnswer = text;
        answers = [...answers, text].slice(-MAX_ANSWERS);
        await notifyKdeConnect(text);

        if (!pendingSmoke || !text.includes(SMOKE_TOKEN)) {
            return;
        }

        pendingSmoke = false;
        smokeCtx?.ui.notify("mobile smoke success — token captured");
        smokeCtx = undefined;
    });
}
