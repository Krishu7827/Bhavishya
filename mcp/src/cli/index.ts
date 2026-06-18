#!/usr/bin/env node
/**
 * CLI Entry Point - Routes to install or publish commands
 */

import dotenv from "dotenv";
dotenv.config();

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version
const packageJsonPath = join(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log(`\n⚡ agentmarket v${packageJson.version}\n`);

  switch (command) {
    case "install":
      const { runInstall } = await import("./install.js");
      await runInstall();
      break;

    case "publish":
      const { runPublish } = await import("./publish.js");
      await runPublish();
      break;

    case "preferences":
    case "prefs":
      // Manage user preferences
      const { runPreferences } = await import("./preferences.js");
      await runPreferences();
      break;

    case "server":
      // Start MCP server (stdio)
      const { startServer } = await import("../mcp/server.js");
      await startServer();
      break;

    case "http-server":
      // Start HTTP server (REST API)
      const { startHttpServer } = await import("../mcp/http-server.js");
      await startHttpServer();
      break;

    case "--version":
    case "-v":
      console.log(packageJson.version);
      break;

    case "--help":
    case "-h":
    default:
      console.log(`Usage:
  npx agentmarket install       # Setup agentmarket to use specialists
  npx agentmarket publish       # Publish your agent as a specialist
  npx agentmarket preferences   # Manage auto-selection preferences
  npx agentmarket server        # Start MCP server (stdio - for Claude Code)
  npx agentmarket http-server   # Start HTTP server (REST API - for remote agents)

Options:
  --version, -v                 Show version
  --help, -h                   Show this help message

Environment Variables:
  PORT                         HTTP server port (default: 3000)
  PRICE_PER_REQUEST           Enable payment requirement (USDC)
  PLATFORM_WALLET_ADDRESS     Platform wallet for fee collection
  NODE_ENV                    production | development (affects network)
  ANTHROPIC_API_KEY           Enable LLM classification for auto-selection
`);
      break;
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
