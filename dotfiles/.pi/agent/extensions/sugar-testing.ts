import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type TestType = "curl" | "phpunit" | "scheduler";

function parseSugarTestArgs(args: string): { type?: TestType; name?: string; error?: string } {
  const trimmed = args.trim();
  if (!trimmed) {
    return { error: "Usage: /sugar-test <curl|phpunit|scheduler> <test-name>" };
  }

  const [rawType, ...rest] = trimmed.split(/\s+/);
  const type = rawType?.toLowerCase() as TestType;
  if (!rawType || !["curl", "phpunit", "scheduler"].includes(type)) {
    return { error: "Invalid test type. Use one of: curl, phpunit, scheduler" };
  }

  const name = rest.join(" ").trim();
  if (!name) {
    return { error: "Missing test name. Usage: /sugar-test <curl|phpunit|scheduler> <test-name>" };
  }

  return { type, name };
}

export default function (pi: ExtensionAPI) {
  // bns test --json provides native structured output, no parser needed.
  pi.registerCommand("sugar-test", {
    description: "Delegate SugarCRM test execution to sugar-tester: /sugar-test <curl|phpunit|scheduler> <test-name>",
    handler: async (args, ctx) => {
      const parsed = parseSugarTestArgs(args);
      if (parsed.error) {
        ctx.ui.notify(parsed.error, "error");
        return;
      }

      const task = [
        `Run SugarCRM ${parsed.type} test: ${parsed.name}`,
        "",
        "Use the `sugar-tester` subagent.",
        "Required behavior:",
        "- Execute with safe_bash using project-appropriate command for this test type.",
        "- For bns tests, use --json for machine-readable results by default.",
        "- Report command run, totals, failures (if any), warnings, and next debug step.",
      ].join("\n");

      const instruction = [
        "Delegate this task to the subagent tool now.",
        "Call:",
        "subagent({",
        '  "agent": "sugar-tester",',
        `  "task": ${JSON.stringify(task)}`,
        "})",
      ].join("\n");

      if (ctx.isIdle()) {
        pi.sendUserMessage(instruction);
      } else {
        pi.sendUserMessage(instruction, { deliverAs: "followUp" });
      }

      ctx.ui.notify(`Delegated to sugar-tester (${parsed.type}): ${parsed.name}`, "info");
    },
  });
}
