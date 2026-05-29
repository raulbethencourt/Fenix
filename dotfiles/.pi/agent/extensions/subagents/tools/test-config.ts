import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import * as fs from "node:fs";
import * as path from "node:path";

interface TestConfig {
	runner: string;
	testDir: string;
	testPattern: string;
	runCommand: string;
	singleFileCommand: string;
	detected: boolean;
	confirmedByUser: boolean;
}

const CONFIG_FILENAME = ".pi/test-config.json";

// Detection patterns — language agnostic, ordered by specificity
const DETECTORS: Array<{
	files: string[];
	runner: string;
	testDir: string;
	testPattern: string;
	runCommand: string;
	singleFileCommand: string;
}> = [
	{
		files: ["vitest.config.ts", "vitest.config.js", "vitest.config.mts"],
		runner: "vitest",
		testDir: "tests",
		testPattern: "**/*.test.{ts,js}",
		runCommand: "npx vitest run",
		singleFileCommand: "npx vitest run {file}",
	},
	{
		files: ["jest.config.ts", "jest.config.js", "jest.config.mjs"],
		runner: "jest",
		testDir: "tests",
		testPattern: "**/*.test.{ts,js}",
		runCommand: "npx jest",
		singleFileCommand: "npx jest {file}",
	},
	{
		files: ["phpunit.xml", "phpunit.xml.dist"],
		runner: "phpunit",
		testDir: "tests",
		testPattern: "**/*Test.php",
		runCommand: "vendor/bin/phpunit",
		singleFileCommand: "vendor/bin/phpunit {file}",
	},
	{
		files: ["pytest.ini", "pyproject.toml", "setup.cfg"],
		runner: "pytest",
		testDir: "tests",
		testPattern: "**/test_*.py",
		runCommand: "pytest",
		singleFileCommand: "pytest {file}",
	},
	{
		files: ["go.mod"],
		runner: "go test",
		testDir: ".",
		testPattern: "**/*_test.go",
		runCommand: "go test ./...",
		singleFileCommand: "go test {file}",
	},
	{
		files: [".bats"],
		runner: "bats",
		testDir: "tests",
		testPattern: "**/*.bats",
		runCommand: "bats tests/",
		singleFileCommand: "bats {file}",
	},
	{
		files: ["mocha.opts", ".mocharc.yml", ".mocharc.js", ".mocharc.json"],
		runner: "mocha",
		testDir: "test",
		testPattern: "**/*.test.{ts,js}",
		runCommand: "npx mocha",
		singleFileCommand: "npx mocha {file}",
	},
];

function detectTestConfig(projectRoot: string): TestConfig | null {
	for (const detector of DETECTORS) {
		for (const file of detector.files) {
			if (fs.existsSync(path.join(projectRoot, file))) {
				return {
					runner: detector.runner,
					testDir: detector.testDir,
					testPattern: detector.testPattern,
					runCommand: detector.runCommand,
					singleFileCommand: detector.singleFileCommand,
					detected: true,
					confirmedByUser: false,
				};
			}
		}
	}
	return null;
}

function getConfigPath(projectRoot: string): string {
	return path.join(projectRoot, CONFIG_FILENAME);
}

function loadConfig(projectRoot: string): TestConfig | null {
	const configPath = getConfigPath(projectRoot);
	if (fs.existsSync(configPath)) {
		try {
			return JSON.parse(fs.readFileSync(configPath, "utf-8"));
		} catch {
			return null;
		}
	}
	return null;
}

function saveConfig(projectRoot: string, config: TestConfig): void {
	const configPath = getConfigPath(projectRoot);
	const dir = path.dirname(configPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export default function (pi: ExtensionAPI) {
	const projectRoot = process.cwd();

	pi.registerTool({
		name: "test_config",
		label: "Test Config",
		description:
			"Detect, read, or update the project's test configuration. Auto-detects test runners (vitest, jest, phpunit, pytest, go test, bats, mocha) from config files. Stores config at .pi/test-config.json.",
		promptSnippet: "Detect and manage project test infrastructure configuration",
		promptGuidelines: [
			"Use op='detect' at the start of a session to check if the project has test infrastructure",
			"Use op='read' to get the current stored test config",
			"Use op='update' to set or override test config fields after user confirmation",
			"The singleFileCommand uses {file} as placeholder for the test file path",
		],
		parameters: Type.Object({
			op: Type.Union(
				[
					Type.Literal("detect"),
					Type.Literal("read"),
					Type.Literal("update"),
				],
				{ description: "Operation: detect scans for test infra, read returns stored config, update modifies config" },
			),
			config: Type.Optional(
				Type.Object({
					runner: Type.Optional(Type.String({ description: "Test runner name" })),
					testDir: Type.Optional(Type.String({ description: "Directory containing tests" })),
					testPattern: Type.Optional(Type.String({ description: "Glob pattern for test files" })),
					runCommand: Type.Optional(Type.String({ description: "Command to run all tests" })),
					singleFileCommand: Type.Optional(Type.String({ description: "Command to run a single test file. Use {file} as placeholder." })),
					confirmedByUser: Type.Optional(Type.Boolean({ description: "Set to true after user confirms the config" })),
				}, { description: "Config fields to update (for op='update')" }),
			),
		}),
		async execute(toolCallId, params, signal, onUpdate) {
			void toolCallId;
			void signal;
			void onUpdate;

			const { op, config: updateFields } = params;

			switch (op) {
				case "detect": {
					// Check for existing stored config first
					const existing = loadConfig(projectRoot);
					if (existing && existing.confirmedByUser) {
						return {
							content: [{ type: "text", text: `Test config already confirmed:\n${JSON.stringify(existing, null, 2)}` }],
						};
					}

					// Auto-detect
					const detected = detectTestConfig(projectRoot);
					if (detected) {
						saveConfig(projectRoot, detected);
						return {
							content: [{ type: "text", text: `Detected test infrastructure:\n${JSON.stringify(detected, null, 2)}\n\nStored at ${getConfigPath(projectRoot)}. Ask user to confirm or adjust.` }],
						};
					}

					return {
						content: [{ type: "text", text: "No test infrastructure detected. Ask user about their test setup." }],
					};
				}

				case "read": {
					const config = loadConfig(projectRoot);
					if (config) {
						return {
							content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
						};
					}
					return {
						content: [{ type: "text", text: "No test config found. Run op='detect' first." }],
					};
				}

				case "update": {
					if (!updateFields) {
						throw new Error("update requires config fields");
					}
					const existing = loadConfig(projectRoot) || {
						runner: "",
						testDir: "tests",
						testPattern: "",
						runCommand: "",
						singleFileCommand: "",
						detected: false,
						confirmedByUser: false,
					};

					// Merge updates
					const updated: TestConfig = {
						...existing,
						...(updateFields.runner !== undefined && { runner: updateFields.runner }),
						...(updateFields.testDir !== undefined && { testDir: updateFields.testDir }),
						...(updateFields.testPattern !== undefined && { testPattern: updateFields.testPattern }),
						...(updateFields.runCommand !== undefined && { runCommand: updateFields.runCommand }),
						...(updateFields.singleFileCommand !== undefined && { singleFileCommand: updateFields.singleFileCommand }),
						...(updateFields.confirmedByUser !== undefined && { confirmedByUser: updateFields.confirmedByUser }),
					};

					saveConfig(projectRoot, updated);
					return {
						content: [{ type: "text", text: `Config updated:\n${JSON.stringify(updated, null, 2)}` }],
					};
				}
			}
		},
	});
}
