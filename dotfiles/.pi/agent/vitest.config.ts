import { defineConfig } from "vitest/config";

const PI_NODE_MODULES = "/home/rabeta/.config/nvm/versions/node/v24.15.0/lib/node_modules/@earendil-works/pi-coding-agent/node_modules";
const PI_PKG = "/home/rabeta/.config/nvm/versions/node/v24.15.0/lib/node_modules/@earendil-works/pi-coding-agent";

function normalizeVitestTimestampSuffix() {
  return {
    name: "normalize-vitest-timestamp-suffix",
    enforce: "pre" as const,
    async resolveId(source: string, importer?: string) {
      const normalized = source
        .replace(/\?t=([^&]+)\.(\d+)$/, "?t=$1&instance=$2")
        .replace(/\?\.(\d+)$/, "?instance=$1");

      if (normalized === source) {
        return null;
      }

      return this.resolve(normalized, importer, { skipSelf: true });
    },
  };
}

export default defineConfig({
  plugins: [normalizeVitestTimestampSuffix()],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@mariozechner/pi-coding-agent": PI_PKG,
      "@mariozechner/pi-tui": `${PI_NODE_MODULES}/@earendil-works/pi-tui`,
      "@mariozechner/pi-ai": `${PI_NODE_MODULES}/@earendil-works/pi-ai`,
      "@mariozechner/pi-agent-core": `${PI_NODE_MODULES}/@earendil-works/pi-agent-core`,
      "typebox": `${PI_NODE_MODULES}/typebox`,
      "shell-quote": "/home/rabeta/.pi/agent/extensions/bash-guard/node_modules/shell-quote",
    },
  },
});
