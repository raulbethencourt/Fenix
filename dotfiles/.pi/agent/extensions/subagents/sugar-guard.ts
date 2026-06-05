import * as fs from "node:fs";
import * as path from "node:path";

export function shouldBlockSugarTester(agent: string, cwd: string): { block: boolean; message?: string } {
	if (agent !== "tester") {
		return { block: false };
	}

	if (fs.existsSync(path.join(cwd, "sugar_version.php"))) {
		return {
			block: true,
			message: "Sugar project detected; use sugar-tester instead of tester.",
		};
	}

	return { block: false };
}
