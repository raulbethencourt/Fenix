import { readFile, writeFile } from "node:fs/promises";

export async function readTextFile(absolutePath: string): Promise<string> {
  return readFile(absolutePath, "utf8");
}

export async function writeTextFile(absolutePath: string, content: string): Promise<void> {
  await writeFile(absolutePath, content, "utf8");
}
