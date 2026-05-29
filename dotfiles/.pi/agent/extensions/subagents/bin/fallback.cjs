#!/usr/bin/env node
/**
 * fallback - Toggle or set fallback mode for subagents
 * 
 * Usage:
 *   fallback          # Toggle (on <-> off)
 *   fallback on       # Enable
 *   fallback off      # Disable
 *   fallback status   # Show status
 */
const fs = require("node:fs");
const path = require("node:path");

const STATE_FILE = path.join(__dirname, "..", "fallback-mode.json");

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {
    // Ignore errors
  }
  return { enabled: false, lastToggled: "" };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const state = loadState();

  if (mode === "status" || mode === undefined) {
    if (mode === undefined) {
      // Toggle
      state.enabled = !state.enabled;
      state.lastToggled = new Date().toISOString();
      saveState(state);
      console.log(`Fallback mode ${state.enabled ? "ENABLED" : "DISABLED"}`);
    } else {
      // Show status
      console.log(`Fallback mode: ${state.enabled ? "ENABLED" : "DISABLED"}`);
      if (state.lastToggled) {
        console.log(`Last toggled: ${state.lastToggled}`);
      }
    }
  } else if (mode === "on") {
    state.enabled = true;
    state.lastToggled = new Date().toISOString();
    saveState(state);
    console.log("Fallback mode ENABLED");
  } else if (mode === "off") {
    state.enabled = false;
    state.lastToggled = new Date().toISOString();
    saveState(state);
    console.log("Fallback mode DISABLED");
  } else {
    console.error("Invalid mode. Use: on, off, or status");
    console.error("");
    console.error("Usage:");
    console.error("  fallback          # Toggle (on <-> off)");
    console.error("  fallback on       # Enable");
    console.error("  fallback off      # Disable");
    console.error("  fallback status   # Show status");
    process.exit(1);
  }
}

main();