/**
 * RED tests for the Sugar-TDD guard.
 *
 * The guard is a pure function `shouldBlockSugarTester(agent, cwd)` exported
 * from `extensions/subagents/sugar-guard.ts` (not yet implemented).
 *
 * It returns `{ block: true, message: string }` when:
 *   - agent === "tester"
 *   - AND `sugar_version.php` exists at `cwd`
 *
 * It returns `{ block: false }` otherwise.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { shouldBlockSugarTester } from "../extensions/subagents/sugar-guard.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sugar-guard-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("shouldBlockSugarTester", () => {
  describe("Sugar project (sugar_version.php present) + agent=tester", () => {
    it("returns block:true with a message redirecting to sugar-tester", () => {
      fs.writeFileSync(path.join(tmpDir, "sugar_version.php"), "<?php $sugar_version = '12.0';");

      const result = shouldBlockSugarTester("tester", tmpDir);

      expect(result.block).toBe(true);
      expect(result.message).toMatch(/sugar-tester/i);
    });
  });

  describe("Non-Sugar project (no sugar_version.php) + agent=tester", () => {
    it("returns block:false so dispatch proceeds normally", () => {
      // tmpDir has no sugar_version.php
      const result = shouldBlockSugarTester("tester", tmpDir);

      expect(result.block).toBe(false);
    });
  });

  describe("Sugar project + agent=sugar-tester", () => {
    it("returns block:false — sugar-tester is always allowed", () => {
      fs.writeFileSync(path.join(tmpDir, "sugar_version.php"), "<?php $sugar_version = '12.0';");

      const result = shouldBlockSugarTester("sugar-tester", tmpDir);

      expect(result.block).toBe(false);
    });
  });

  describe("Sugar project + other agents", () => {
    it("returns block:false for worker", () => {
      fs.writeFileSync(path.join(tmpDir, "sugar_version.php"), "<?php");

      expect(shouldBlockSugarTester("worker", tmpDir).block).toBe(false);
    });

    it("returns block:false for scout", () => {
      fs.writeFileSync(path.join(tmpDir, "sugar_version.php"), "<?php");

      expect(shouldBlockSugarTester("scout", tmpDir).block).toBe(false);
    });
  });
});
