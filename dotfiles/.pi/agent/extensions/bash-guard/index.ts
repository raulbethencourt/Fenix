import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
    DynamicBorder,
    isToolCallEventType,
} from "@mariozechner/pi-coding-agent";
import type { SelectItem } from "@mariozechner/pi-tui";
import { Container, SelectList, Text } from "@mariozechner/pi-tui";
import { parse as shellParse } from "shell-quote";

export type Severity = "high" | "medium";

export type Risk = {
    severity: Severity;
    reasons: string[];
};

export type OpToken = { op: string;[k: string]: unknown };

export type Token = string | OpToken;

export function isOpToken(t: Token): t is OpToken {
    return typeof t === "object" && t !== null && "op" in t;
}

export function tokensToStrings(tokens: Token[]): string[] {
    return tokens.filter((t) => typeof t === "string") as string[];
}

export function splitOnOps(tokens: Token[], splitOps: string[]): Token[][] {
    const out: Token[][] = [];
    let current: Token[] = [];
    for (const t of tokens) {
        if (isOpToken(t) && splitOps.includes(t.op)) {
            if (current.length) out.push(current);
            current = [];
            continue;
        }
        current.push(t);
    }
    if (current.length) out.push(current);
    return out;
}

export function hasFlag(args: string[], flag: string): boolean {
    if (args.includes(flag)) return true;
    // For short flags like "-i", check if it appears inside a bundle like "-ni"
    if (flag.length === 2 && flag.startsWith("-")) {
        return args.some((a) => a.startsWith("-") && !a.startsWith("--") && a.includes(flag[1]));
    }
    return false;
}

export function anyArgStartsWith(args: string[], prefix: string): boolean {
    return args.some((a) => a.startsWith(prefix));
}

export function analyzeSegment(seg: Token[]): Risk | null {
    const reasons: string[] = [];
    let severity: Severity = "medium";

    const ops = seg.filter(isOpToken).map((o) => o.op);
    const args = tokensToStrings(seg);
    if (args.length === 0) return null;

    const cmd = args[0];
    const rest = args.slice(1);

    // Shell redirection / pipes are handled on the whole command, but keep some segment checks too.
    if (
        ops.includes("|") &&
        (args.includes("sh") ||
            args.includes("bash") ||
            args.includes("zsh") ||
            args.includes("fish"))
    ) {
        reasons.push("pipe to a shell (possible remote code execution)");
        severity = "high";
    }

    // sudo
    if (cmd === "sudo") {
        reasons.push("sudo (elevated privileges)");
        severity = "high";
    }

    // rm/rmdir/unlink
    if (cmd === "rm" || cmd === "rmdir" || cmd === "unlink") {
        severity = "high";
        reasons.push(`${cmd} (file deletion)`);
        if (rest.some((a) => a.includes("-r") || a.includes("-R")))
            reasons.push("recursive delete (-r/-R)");
        if (rest.some((a) => a.includes("-f")))
            reasons.push("forced delete (-f)");
        if (ops.includes("glob"))
            reasons.push("glob pattern expansion (may delete many files)");
    }

    // find -delete
    if (cmd === "find" && rest.includes("-delete")) {
        severity = "high";
        reasons.push("find -delete (bulk deletion)");
    }

    // git operations — skip read-only subcommands entirely
    const GIT_READONLY = new Set([
        "status", "log", "diff", "show", "branch", "tag",
        "remote", "ls-files", "ls-tree", "describe", "shortlog",
        "blame", "grep", "rev-parse", "rev-list", "cat-file",
        "fsck", "stash", "fetch", "config",
    ]);
    if (cmd === "git") {
        const sub = rest[0];
        const subArgs = rest.slice(1);

        if (GIT_READONLY.has(sub)) {
            // purely informational — do not flag
        } else {
        reasons.push(sub ? `git ${sub} (git command)` : "git (git command)");

        if (sub === "rm") {
            severity = "high";
            reasons.push(
                "git rm (deletes files from working tree and stages deletions)",
            );
        }
        if (
            sub === "clean" &&
            (subArgs.some((a) => a.includes("-f")) ||
                subArgs.includes("-d") ||
                subArgs.includes("-x"))
        ) {
            severity = "high";
            reasons.push("git clean (can delete untracked files)");
        }
        if (sub === "reset" && subArgs.includes("--hard")) {
            severity = "high";
            reasons.push("git reset --hard (discard changes)");
        }
        if (
            (sub === "checkout" || sub === "restore") &&
            (subArgs.includes(".") ||
                subArgs.includes("--") ||
                subArgs.includes("--source"))
        ) {
            severity = severity === "high" ? "high" : "medium";
            reasons.push("git checkout/restore (can overwrite working tree)");
        }
        if (
            sub === "push" &&
            (subArgs.includes("--force") ||
                subArgs.includes("--force-with-lease") ||
                subArgs.includes("-f"))
        ) {
            severity = "high";
            reasons.push("git push --force (rewrite remote history)");
        }
        if (sub === "reflog" && subArgs.includes("expire")) {
            severity = "high";
            reasons.push("git reflog expire (can remove recovery history)");
        }
        if (sub === "gc" && subArgs.some((a) => a.startsWith("--prune"))) {
            severity = "high";
            reasons.push("git gc --prune (can permanently delete objects)");
        }
        } // end else (non-readonly git)
    }

    // Database CLI tools — destructive operations
    if (cmd === "mysql" || cmd === "mariadb") {
        const joined = rest.join(" ");
        if (/\b(DROP|TRUNCATE)\b/i.test(joined)) {
            severity = "high";
            reasons.push("destructive SQL via mysql/mariadb CLI (DROP/TRUNCATE)");
        }
        if (/\bDELETE\s+FROM\s+\w+\s*(?:;|$|"|')/i.test(joined)) {
            severity = "high";
            reasons.push("DELETE FROM without WHERE clause via mysql CLI");
        }
    }
    if (cmd === "psql") {
        const joined = rest.join(" ");
        if (/\b(DROP|TRUNCATE)\b/i.test(joined)) {
            severity = "high";
            reasons.push("destructive SQL via psql CLI (DROP/TRUNCATE)");
        }
        if (/\bDELETE\s+FROM\s+\w+\s*(?:;|$|"|')/i.test(joined)) {
            severity = "high";
            reasons.push("DELETE FROM without WHERE clause via psql CLI");
        }
    }
    if (cmd === "sqlite3" || cmd === "sqlite") {
        const joined = rest.join(" ");
        if (/\b(DROP|TRUNCATE)\b/i.test(joined)) {
            severity = "high";
            reasons.push("destructive SQL via sqlite3 CLI (DROP/TRUNCATE)");
        }
        if (/\bDELETE\s+FROM\s+\w+\s*(?:;|$|"|')/i.test(joined)) {
            severity = "high";
            reasons.push("DELETE FROM without WHERE clause via sqlite3 CLI");
        }
    }
    if (cmd === "redis-cli") {
        const joined = rest.join(" ");
        if (/\b(FLUSHALL|FLUSHDB)\b/i.test(joined)) {
            severity = "high";
            reasons.push("Redis FLUSHALL/FLUSHDB (wipes all data)");
        }
    }
    if (cmd === "mongosh" || cmd === "mongo") {
        const joined = rest.join(" ");
        if (/\b(dropDatabase|dropCollection|drop\(\))/.test(joined)) {
            severity = "high";
            reasons.push("MongoDB drop database/collection");
        }
    }
    // Elasticsearch — curl DELETE to ES port
    if (cmd === "curl" && rest.some(a => a === "DELETE" || a === "-XDELETE")) {
        const joined = rest.join(" ");
        if (/:9200\//.test(joined) || /localhost:9200/.test(joined) || /\b_all\b/.test(joined)) {
            severity = "high";
            reasons.push("Elasticsearch index deletion (curl DELETE to :9200)");
        }
    }

    // truncate
    if (cmd === "truncate") {
        severity = severity === "high" ? "high" : "medium";
        reasons.push("truncate (in-place size change, can erase contents)");
    }

    // dd of=
    if (
        cmd === "dd" &&
        (anyArgStartsWith(rest, "of=") || rest.includes("of"))
    ) {
        severity = "high";
        reasons.push("dd with output file/device (can overwrite data)");
    }

    // Disk / volume management (prompt aggressively; high risk)
    // Linux: mkfs.*, wipefs, parted, fdisk, gdisk/sgdisk, lsblk, cryptsetup, LVM tools, zpool
    // macOS: diskutil, hdiutil, gpt, newfs_*, asr
    if (cmd.startsWith("mkfs")) {
        severity = "high";
        reasons.push("mkfs (filesystem formatting)");
    }
    if (cmd.startsWith("newfs_")) {
        severity = "high";
        reasons.push("newfs_* (filesystem formatting)");
    }
    if (cmd === "wipefs") {
        severity = "high";
        reasons.push("wipefs (disk signature wipe)");
    }
    if (cmd === "diskutil") {
        severity = "high";
        reasons.push("diskutil (disk management command)");
        if (rest.includes("eraseDisk") || rest.includes("eraseVolume")) {
            reasons.push("diskutil erase (destructive disk operation)");
        }
    }
    if (cmd === "hdiutil") {
        severity = "high";
        reasons.push("hdiutil (disk image management command)");
    }
    if (cmd === "gpt") {
        severity = "high";
        reasons.push("gpt (partition table manipulation)");
    }
    if (cmd === "asr") {
        severity = "high";
        reasons.push("asr (Apple Software Restore; can overwrite volumes)");
    }
    if (
        cmd === "parted" ||
        cmd === "fdisk" ||
        cmd === "gdisk" ||
        cmd === "sgdisk"
    ) {
        severity = "high";
        reasons.push(`${cmd} (disk/partition management)`);
    }
    if (cmd === "lsblk") {
        // Usually read-only, but still disk-related; prompt as requested.
        severity = severity === "high" ? "high" : "medium";
        reasons.push("lsblk (disk listing)");
    }
    if (cmd === "cryptsetup") {
        severity = "high";
        reasons.push("cryptsetup (disk encryption management)");
    }
    if (cmd === "pvcreate" || cmd === "vgcreate" || cmd === "lvcreate") {
        severity = "high";
        reasons.push(`${cmd} (LVM volume management)`);
    }
    if (cmd === "zpool") {
        severity = "high";
        reasons.push("zpool (ZFS pool management)");
    }

    // chmod/chown recursive
    if (
        cmd === "chmod" &&
        (rest.includes("-R") || rest.includes("--recursive"))
    ) {
        severity = severity === "high" ? "high" : "medium";
        reasons.push("chmod -R (recursive permission changes)");
    }
    if (
        cmd === "chown" &&
        (rest.includes("-R") || rest.includes("--recursive"))
    ) {
        severity = severity === "high" ? "high" : "medium";
        reasons.push("chown -R (recursive ownership changes)");
    }

    // mv/cp overwriting
    if (cmd === "mv" && (rest.includes("-f") || rest.includes("--force"))) {
        severity = severity === "high" ? "high" : "medium";
        reasons.push("mv --force/-f (can overwrite files)");
    }
    if (cmd === "cp" && (rest.includes("-f") || rest.includes("--force"))) {
        severity = severity === "high" ? "high" : "medium";
        reasons.push("cp --force/-f (can overwrite files)");
    }

    // sed/perl in-place
    if (cmd === "sed" && (hasFlag(rest, "-i") || rest.includes("--in-place"))) {
        severity = severity === "high" ? "high" : "medium";
        reasons.push("sed -i (in-place file modification)");
    }
    if (
        cmd === "perl" &&
        (rest.includes("-pi") || (rest.includes("-p") && rest.includes("-i")))
    ) {
        severity = severity === "high" ? "high" : "medium";
        reasons.push("perl -pi/-i (in-place file modification)");
    }

    // kill/shutdown/systemctl
    if (cmd === "kill" || cmd === "pkill" || cmd === "killall") {
        severity = severity === "high" ? "high" : "medium";
        reasons.push(`${cmd} (process termination)`);
        if (rest.includes("-9")) {
            severity = "high";
            reasons.push("SIGKILL (-9)");
        }
    }
    if (cmd === "shutdown" || cmd === "reboot") {
        severity = "high";
        reasons.push(`${cmd} (system power operation)`);
    }
    if (
        cmd === "systemctl" &&
        (rest.includes("stop") || rest.includes("disable"))
    ) {
        severity = severity === "high" ? "high" : "medium";
        reasons.push("systemctl stop/disable (service disruption)");
    }

    // Remote execution patterns
    if ((cmd === "curl" || cmd === "wget") && ops.includes("|")) {
        severity = "high";
        reasons.push("curl/wget piped (possible remote code execution)");
    }

    // Infra deletes
    if (cmd === "kubectl" && rest[0] === "delete") {
        severity = "high";
        reasons.push("kubectl delete (resource deletion)");
    }
    if (cmd === "terraform" && rest[0] === "destroy") {
        severity = "high";
        reasons.push("terraform destroy (infrastructure teardown)");
    }
    if (
        cmd === "aws" &&
        rest[0] === "s3" &&
        rest[1] === "rm" &&
        rest.includes("--recursive")
    ) {
        severity = "high";
        reasons.push("aws s3 rm --recursive (bulk deletion)");
    }
    if (cmd === "gcloud" && rest.includes("delete")) {
        severity = "high";
        reasons.push("gcloud delete (resource deletion)");
    }

    if (reasons.length === 0) return null;
    return { severity, reasons };
}

export function analyzeBashCommand(command: string): Risk | null {
    let tokens: Token[];
    try {
        tokens = shellParse(command) as Token[];
    } catch {
        // Fallback: shell-quote failed (e.g. heredocs, process substitutions).
        // Run a quick regex scan for known-dangerous patterns rather than
        // blindly prompting on every complex-but-harmless command.
        const DANGER = [
            /\bsudo\b/,
            /\brm\b[^#\n]*-[a-zA-Z]*[rRfF]/,
            /\b(curl|wget)\b[^#\n]*\|\s*(ba?sh|zsh|fish|sh)\b/,
            /\bmkfs\b/, /\bwipefs\b/, /\bdd\b[^#\n]*\bof=/,
            /\b(shutdown|reboot|halt|poweroff)\b/,
            /\bterraform\s+destroy\b/, /\bkubectl\s+delete\b/,
            /\bgit\s+(push|reset\s+--hard|clean\s+-[a-zA-Z]*f)\b/,
            /\bDROP\s+(DATABASE|TABLE|SCHEMA)\b/i,
            /\bTRUNCATE\s+TABLE\b/i,
            /\b(FLUSHALL|FLUSHDB)\b/i,
            /\b(dropDatabase|dropCollection)\b/,
            /\bcurl\b[^#\n]*-X\s*DELETE[^#\n]*:9200/,
        ];
        for (const p of DANGER) {
            if (p.test(command)) {
                return { severity: "high", reasons: ["unparsed shell command with dangerous pattern"] };
            }
        }
        return null; // can't parse, no obvious danger — allow through
    }

    const reasons: string[] = [];
    let severity: Severity = "medium";

    // Whole-command operator checks
    const ops = tokens.filter(isOpToken).map((t) => t.op);
    // Only flag output redirection — it can overwrite files.
    // Input redirection (<, <<) and bare pipes (|) are not flagged here;
    // dangerous pipe patterns (curl|bash, pipe-to-shell) are caught at
    // segment level with high severity.
    // Redirections to /dev/null, /dev/stdout, /dev/stderr are always harmless — skip them.
    const REDIRECT_OPS = new Set([">", ">>", "2>", "2>>"]);
    const NULL_TARGETS = new Set(["/dev/null", "/dev/stdout", "/dev/stderr"]);
    const hasHarmfulRedirect = tokens.some((t, i) => {
        if (!isOpToken(t) || !REDIRECT_OPS.has(t.op)) return false;
        const next = tokens[i + 1];
        const target = typeof next === "string" ? next : null;
        return target === null || !NULL_TARGETS.has(target);
    });
    if (hasHarmfulRedirect) {
        reasons.push("shell output redirection (can overwrite files)");
        severity = severity === "high" ? "high" : "medium";
    }

    // Segment analysis (split on &&, ||, ;)
    const segments = splitOnOps(tokens, ["&&", "||", ";"]);
    for (const seg of segments) {
        const segRisk = analyzeSegment(seg);
        if (!segRisk) continue;
        if (segRisk.severity === "high") severity = "high";
        for (const r of segRisk.reasons) reasons.push(r);
    }

    // De-duplicate reasons
    const uniq = [...new Set(reasons)];
    if (uniq.length === 0) return null;
    return { severity, reasons: uniq };
}

async function promptRunOrAbort(
    ctx: ExtensionContext,
    command: string,
    risk: Risk,
): Promise<"run" | "abort"> {
    if (!ctx.hasUI) return "abort";

    const reasonsText = risk.reasons.map((r) => `• ${r}`).join("\n");
    const header = `Command flagged as ${risk.severity.toUpperCase()} risk:`;
    const body = `${header}\n\n${reasonsText}\n\nCommand:\n${command}`;

    const items: SelectItem[] = [
        { value: "run", label: "Run", description: "Execute the command" },
        { value: "abort", label: "Abort", description: "Block this command" },
    ];

    const choice = await ctx.ui.custom<"run" | "abort">(
        (tui, theme, _kb, done) => {
            const container = new Container();
            container.addChild(
                new DynamicBorder((s: string) => theme.fg("warning", s)),
            );
            container.addChild(
                new Text(
                    theme.fg(
                        "warning",
                        theme.bold("Potentially destructive bash command"),
                    ),
                    1,
                    0,
                ),
            );
            container.addChild(new Text(body, 1, 0));

            const list = new SelectList(items, items.length, {
                selectedPrefix: (t) => theme.fg("accent", t),
                selectedText: (t) => theme.fg("accent", t),
                description: (t) => theme.fg("muted", t),
                scrollInfo: (t) => theme.fg("dim", t),
                noMatch: (t) => theme.fg("warning", t),
            });

            list.onSelect = (item) => done(item.value as "run" | "abort");
            list.onCancel = () => done("abort");
            container.addChild(list);

            container.addChild(
                new DynamicBorder((s: string) => theme.fg("warning", s)),
            );

            return {
                render: (w) => container.render(w),
                invalidate: () => container.invalidate(),
                handleInput: (data) => {
                    list.handleInput(data);
                    tui.requestRender();
                },
            };
        },
        { overlay: true },
    );

    return choice ?? "abort";
}

// PI_SUBAGENT_DEPTH is 0 (or unset) in the main session and >= 1 in spawned subagent processes.
// Behaviour branches on this: interactive prompting in the main session, headless hard-block
// for catastrophic operations in subagents (where stdin is /dev/null and no UI is available).
const _subagentDepth = Number(process.env.PI_SUBAGENT_DEPTH ?? "0");
const _isSubagent = Number.isFinite(_subagentDepth) && _subagentDepth >= 1;

// Hard-block patterns for subagent (headless) mode. Criteria: unrecoverable by default AND
// unlikely to be intentional in an automated context. Fewer false positives over broad coverage —
// the interactive prompt handles the rest for main sessions.
const HEADLESS_BLOCKED: Array<{ pattern: RegExp; reason: string }> = [
    // Recursive deletion
    {
        pattern:
            /(?<!\bgit\s+)\brm\b[^#\n]*\s-(?:[a-zA-Z]*[rR]|-\brecursive\b)/,
        reason: "recursive delete (rm -r / -rf / -Rf)",
    },
    // Privilege escalation
    { pattern: /\bsudo\b/, reason: "elevated privileges (sudo)" },
    // Remote code execution via pipe-to-shell
    {
        pattern: /\b(curl|wget)\b[^#\n]*\|\s*(ba?sh|zsh|fish|dash|sh)\b/,
        reason: "pipe to shell (remote code execution)",
    },
    // Disk / filesystem destruction
    { pattern: /\bmkfs/, reason: "filesystem formatting (mkfs)" },
    { pattern: /\bnewfs_\w+/, reason: "filesystem formatting (newfs_*)" },
    { pattern: /\bwipefs\b/, reason: "disk signature wipe" },
    {
        pattern: /\bdiskutil\s+(erase|zeroDisk|secureErase|reformat)/i,
        reason: "destructive disk operation (diskutil)",
    },
    {
        pattern: /\bdd\b[^#\n]*\bof=\/dev\//,
        reason: "raw disk write (dd of=/dev/...)",
    },
    {
        pattern: /\b(parted|fdisk|gdisk|sgdisk)\b/,
        reason: "partition table management",
    },
    { pattern: /\bcryptsetup\b/, reason: "disk encryption management" },
    { pattern: /\bzpool\b/, reason: "ZFS pool management" },
    // System power
    {
        pattern: /\b(shutdown|reboot|halt|poweroff)\b/,
        reason: "system power operation",
    },
    // Infrastructure teardown
    {
        pattern: /\bterraform\s+destroy\b/,
        reason: "infrastructure teardown (terraform destroy)",
    },
    { pattern: /\bkubectl\s+delete\b/, reason: "Kubernetes resource deletion" },
    {
        pattern: /\baws\s+s3\s+rm\b[^#\n]*--recursive/,
        reason: "bulk S3 deletion (aws s3 rm --recursive)",
    },
    // Destructive git operations
    {
        pattern: /\bgit\s+commit\b/,
        reason: "git commit (commits are main-session operations)",
    },
    {
        pattern: /\bgit\s+pull\b/,
        reason: "git pull (pulls are main-session operations)",
    },
    {
        pattern: /\bgit\s+push\b/,
        reason: "git push (pushes are main-session operations)",
    },
    {
        pattern: /\bgit\s+reset\b[^#\n]*--hard\b/,
        reason: "discard all uncommitted changes (git reset --hard)",
    },
    {
        pattern: /\bgit\s+clean\b[^#\n]*-[a-zA-Z]*f/,
        reason: "delete untracked files (git clean -f)",
    },
    {
        pattern: /\bgit\s+reflog\s+expire\b/,
        reason: "expire reflog (removes recovery history)",
    },
    {
        pattern: /\bgit\s+gc\b[^#\n]*--prune\b/,
        reason: "prune unreachable objects (git gc --prune)",
    },
    // Database destruction
    {
        pattern: /\bDROP\s+(DATABASE|TABLE|SCHEMA)\b/i,
        reason: "DROP DATABASE/TABLE/SCHEMA (irreversible data loss)",
    },
    {
        pattern: /\bTRUNCATE\s+(TABLE\s+)?\w/i,
        reason: "TRUNCATE TABLE (deletes all rows, irreversible)",
    },
    {
        pattern: /\bDELETE\s+FROM\s+\w+\s*(?:;|$|"|')/i,
        reason: "DELETE FROM without WHERE clause (mass deletion)",
    },
    // MySQL/MariaDB
    {
        pattern: /\bmysql\b[^#\n]*\b(DROP|TRUNCATE)\b/i,
        reason: "destructive SQL via mysql CLI",
    },
    // PostgreSQL
    {
        pattern: /\bpsql\b[^#\n]*\b(DROP|TRUNCATE)\b/i,
        reason: "destructive SQL via psql CLI",
    },
    // SQLite
    {
        pattern: /\bsqlite3?\b[^#\n]*\b(DROP|TRUNCATE)\b/i,
        reason: "destructive SQL via sqlite3 CLI",
    },
    {
        pattern: /\bsqlite3?\b[^#\n]*\bDELETE\s+FROM\s+\w+\s*(?:;|$|"|')/i,
        reason: "mass DELETE via sqlite3 CLI (no WHERE clause)",
    },
    // Redis
    {
        pattern: /\bredis-cli\b[^#\n]*\b(FLUSHALL|FLUSHDB)\b/i,
        reason: "Redis FLUSHALL/FLUSHDB (wipes all data)",
    },
    // MongoDB
    {
        pattern: /\b(mongosh|mongo)\b[^#\n]*\b(dropDatabase|dropCollection|drop\(\))/,
        reason: "MongoDB drop database/collection",
    },
    // Elasticsearch
    {
        pattern: /\bcurl\b[^#\n]*-X\s*DELETE[^#\n]*localhost:9200/,
        reason: "Elasticsearch index deletion via curl DELETE",
    },
    {
        pattern: /\bcurl\b[^#\n]*-X\s*DELETE[^#\n]*:9200\//,
        reason: "Elasticsearch index deletion via curl DELETE",
    },
    {
        pattern: /\bcurl\b[^#\n]*DELETE[^#\n]*_all\b/,
        reason: "Elasticsearch delete _all indices",
    },
];

// ── Protected Folders (non-bypassable, ALL contexts) ─────────────────
// These directories are completely off-limits for write operations.
// No agent, no bypass, no escape hatch. Hard-block always.
const HOME = process.env.HOME || "/home/rabeta";
const PROTECTED_FOLDERS = [
    `${HOME}/.ssh`,
    `${HOME}/personal`,
    `${HOME}/secure`,
    `${HOME}/Documents`,
];

export function isProtectedPath(filePath: string): boolean {
    // Resolve ~ to HOME
    const resolved = filePath.startsWith("~")
        ? filePath.replace(/^~/, HOME)
        : filePath;
    return PROTECTED_FOLDERS.some(
        (folder) => resolved === folder || resolved.startsWith(folder + "/"),
    );
}

// ── Test File Protection ──────────────────────────────────────────────
// CRITICAL: Existing test files are immutable. If a test fails, fix the
// source code — never modify the test. New test files may be created.

let testGuardBypassed = false;

export const TEST_FILE_PATTERNS = [
	/\.test\.[tj]sx?$/,
	/\.spec\.[tj]sx?$/,
	/_test\.go$/,
	/test_[^/]*\.py$/,
	/\.test\.py$/,
	/__tests__\//,
];

export function isTestFile(filePath: string): boolean {
	return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}

export function testFileExists(filePath: string): boolean {
	try {
		return require("fs").existsSync(filePath);
	} catch {
		return false;
	}
}

export default function(pi: ExtensionAPI) {
    // ── Protected folders guard (applies to ALL contexts, non-bypassable) ──
    pi.on("tool_call", async (event) => {
        // Block write tool to protected folders
        if (isToolCallEventType("write", event)) {
            const path = event.input.path as string;
            if (path && isProtectedPath(path)) {
                return {
                    block: true,
                    reason:
                        `HARD BLOCKED: "${path}" is inside a protected folder. ` +
                        "These directories are completely off-limits: " +
                        PROTECTED_FOLDERS.join(", ") +
                        ". This cannot be bypassed.",
                };
            }
        }

        // Block edit tool to protected folders
        if (isToolCallEventType("edit", event)) {
            const path = event.input.path as string;
            if (path && isProtectedPath(path)) {
                return {
                    block: true,
                    reason:
                        `HARD BLOCKED: "${path}" is inside a protected folder. ` +
                        "These directories are completely off-limits: " +
                        PROTECTED_FOLDERS.join(", ") +
                        ". This cannot be bypassed.",
                };
            }
        }

        // Block read tool to protected folders
        if (isToolCallEventType("read", event)) {
            const path = event.input.path as string;
            if (path && isProtectedPath(path)) {
                return {
                    block: true,
                    reason:
                        `HARD BLOCKED: "${path}" is inside a protected folder. ` +
                        "These directories are completely off-limits (no read, no write): " +
                        PROTECTED_FOLDERS.join(", ") +
                        ". This cannot be bypassed.",
                };
            }
        }

        // Block bash commands that target protected folders
        if (isToolCallEventType("bash", event)) {
            const command = event.input.command as string;
            for (const folder of PROTECTED_FOLDERS) {
                // Check both the full path and ~ shorthand
                const tildeForm = folder.replace(HOME, "~");
                if (command.includes(folder) || command.includes(tildeForm)) {
                    // Allow purely read-only commands (ls, cat, file, stat, wc, head, tail, less, more, tree)
                    const READ_ONLY_CMDS = /^\s*(ls|cat|file|stat|wc|head|tail|less|more|tree|find|grep|rg|fd|bat)\b/;
                    if (!READ_ONLY_CMDS.test(command)) {
                        return {
                            block: true,
                            reason:
                                `HARD BLOCKED: command references protected folder "${folder}". ` +
                                "These directories are completely off-limits for write operations. " +
                                "This cannot be bypassed.",
                        };
                    }
                }
            }
        }
    });

    // ── Test file immutability guard (applies to ALL contexts) ──────────
    pi.on("tool_call", async (event) => {
        if (testGuardBypassed) return;

        // Guard write tool — block overwriting existing test files
        if (isToolCallEventType("write", event)) {
            const path = event.input.path as string;
            if (path && isTestFile(path) && testFileExists(path)) {
                return {
                    block: true,
                    reason:
                        `Blocked by bash-guard: "${path}" is an existing test file. ` +
                        "Test files are IMMUTABLE — if a test fails, fix the source code, not the test. " +
                        "Only the user can authorize changes to existing tests.",
                };
            }
        }

        // Guard edit tool — block editing existing test files
        if (isToolCallEventType("edit", event)) {
            const path = event.input.path as string;
            if (path && isTestFile(path)) {
                return {
                    block: true,
                    reason:
                        `Blocked by bash-guard: "${path}" is an existing test file. ` +
                        "Test files are IMMUTABLE — if a test fails, fix the source code, not the test. " +
                        "Only the user can authorize changes to existing tests.",
                };
            }
        }
    });

    if (_isSubagent) {
        // Subagent mode: hard-block catastrophic operations, no prompting.
        pi.on("tool_call", async (event) => {
            if (!isToolCallEventType("bash", event)) return;
            const command = event.input.command;
            for (const { pattern, reason } of HEADLESS_BLOCKED) {
                if (pattern.test(command)) {
                    return {
                        block: true,
                        reason:
                            `Blocked by bash-guard: ${reason}. ` +
                            "This is a non-interactive subagent session — catastrophic operations are not permitted. " +
                            "Propose a safer alternative or ask the parent agent to confirm with the user.",
                    };
                }
            }
        });
        return;
    }

    // Main session mode: interactive prompting.
    pi.registerFlag("bash-guard-auto-allow", {
        description:
            "If set, bash-guard will not block when no UI is available (non-interactive modes).",
        type: "boolean",
        default: false,
    });

    // Avoid annoying retry loops: if the exact command was aborted recently, auto-block it.
    const recentlyAborted = new Map<string, number>();
    const ABORT_REMEMBER_MS = 60_000;

    // Toggle test-file guard bypass
    pi.registerCommand("test-guard", {
        description: "Toggle test file immutability guard (allows editing existing tests when bypassed)",
        handler: async (_args, ctx) => {
            testGuardBypassed = !testGuardBypassed;
            if (testGuardBypassed) {
                ctx.ui.notify(
                    "⚠️  Test guard BYPASSED — agents can now modify existing test files. Run /test-guard again to re-enable.",
                    "warning",
                );
            } else {
                ctx.ui.notify(
                    "✅ Test guard ACTIVE — existing test files are immutable.",
                    "success",
                );
            }
        },
    });

    pi.on("tool_call", async (event, ctx) => {
        if (!isToolCallEventType("bash", event)) return;

        const command = event.input.command;
        const risk = analyzeBashCommand(command);
        if (!risk) return;

        const now = Date.now();
        // Prune expired entries to prevent unbounded map growth
        for (const [k, t] of recentlyAborted) {
            if (now - t >= ABORT_REMEMBER_MS) recentlyAborted.delete(k);
        }
        const lastAbort = recentlyAborted.get(command);
        if (lastAbort && now - lastAbort < ABORT_REMEMBER_MS) {
            return {
                block: true,
                reason: "Blocked by bash-guard: command was already aborted recently. Ask the user for a safer alternative; do not retry the same command.",
            };
        }

        if (!ctx.hasUI && pi.getFlag("bash-guard-auto-allow")) {
            // Non-interactive mode: allow when explicitly requested.
            return;
        }

        const choice = await promptRunOrAbort(ctx, command, risk);
        if (choice === "run") return;

        recentlyAborted.set(command, now);
        return {
            block: true,
            reason: "Blocked by user via bash-guard (potentially destructive command). Ask the user for confirmation or propose a non-destructive alternative.",
        };
    });
}
