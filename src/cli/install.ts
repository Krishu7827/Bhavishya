/**
 * Install Command - Setup agentmarket for using specialist agents
 */

import { homedir, platform } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import inquirer from "inquirer";
import { displaySuccess, displayError, displayInfo, createSpinner } from "../core/display.js";

/**
 * Find Claude Code configuration path based on OS
 */
function findClaudeConfigPath(): string | null {
  const possiblePaths = [
    // Linux
    join(homedir(), ".config", "claude", "mcp.json"),
    // macOS
    join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    // Windows
    join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Run the install command
 */
export async function runInstall(): Promise<void> {
  displayInfo("Installing agentmarket...");

  // Check if Claude Code is installed
  const claudeConfigPath = findClaudeConfigPath();

  if (!claudeConfigPath) {
    displayError(
      "Claude Code config not found. Make sure Claude Code is installed."
    );
    displayInfo("\nLooked in:");
    displayInfo("  ~/.config/claude/mcp.json (Linux)");
    displayInfo("  ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)");
    displayInfo("  %APPDATA%/Claude/claude_desktop_config.json (Windows)");
    displayInfo("\nYou can add agentmarket manually to your Claude config.");
    return;
  }

  displayInfo(`Found Claude config at: ${claudeConfigPath}`);

  // Ask for confirmation
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message:
        "This will add agentmarket to your Claude Code MCP configuration. Continue?",
      default: true,
    },
  ]);

  if (!confirm) {
    displayInfo("Installation cancelled.");
    return;
  }

  const spinner = createSpinner("Configuring Claude Code...");
  spinner.start();

  try {
    // Read current config
    const config = JSON.parse(readFileSync(claudeConfigPath, "utf-8"));

    // Add agentmarket MCP server
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers.agentmarket = {
      command: "npx",
      args: ["agentmarket", "server"],
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL || "",
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
      },
    };

    // Write updated config
    writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));

    spinner.stop();
    displaySuccess("agentmarket installed successfully!");
    displayInfo("\nRestart Claude Code to activate agentmarket.");
    displayInfo(
      "\nNote: Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY in your environment."
    );
  } catch (error) {
    spinner.stop();
    displayError(
      `Installation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
