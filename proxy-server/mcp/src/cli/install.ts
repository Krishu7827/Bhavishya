/**
 * Install Command - Setup agentmarket for using specialist agents
 */

import { homedir, platform } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import inquirer from "inquirer";
import { displaySuccess, displayError, displayInfo, createSpinner } from "../core/display.js";

/**
 * Check if Claude Code CLI is available (claude mcp add)
 */
function isClaudeCliAvailable(): boolean {
  try {
    execSync("claude --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install via Claude Code CLI using 'claude mcp add'
 */
function installViaCli(scriptPath: string): boolean {
  try {
    execSync(`claude mcp add agentmarket node ${scriptPath} server`, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Find Claude Desktop configuration path based on OS
 */
function findClaudeConfigPath(): string | null {
  const possiblePaths = [
    // macOS Desktop app
    join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    // Linux Desktop app
    join(homedir(), ".config", "claude", "mcp.json"),
    // Windows Desktop app
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

  const scriptPath = join(homedir(), "Desktop", "future", "dist", "cli", "index.js");

  // Method 1: Try Claude Code CLI first (claude mcp add)
  if (isClaudeCliAvailable()) {
    displayInfo("Found Claude Code CLI (claude command)");

    const { confirm } = await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: "Add agentmarket to Claude Code via CLI? (recommended)",
      default: true,
    }]);

    if (confirm) {
      const spinner = createSpinner("Adding agentmarket to Claude Code...");
      spinner.start();
      const success = installViaCli(scriptPath);
      spinner.stop();

      if (success) {
        displaySuccess("agentmarket added to Claude Code!");
        displayInfo("\nTest it:");
        displayInfo("  claude mcp list");
        displayInfo("  claude \"Help me audit a smart contract\"");
        return;
      } else {
        displayError("CLI install failed, trying config file method...");
      }
    }
  }

  // Method 2: Try Desktop app config file
  const claudeConfigPath = findClaudeConfigPath();

  if (!claudeConfigPath) {
    displayError(
      "Claude Code config not found. Make sure Claude Code is installed."
    );
    displayInfo("\nTried:");
    displayInfo("  1. claude mcp add (CLI method) - claude not found");
    displayInfo("  2. Config file at:");
    displayInfo("     ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)");
    displayInfo("     ~/.config/claude/mcp.json (Linux)");
    displayInfo("     %APPDATA%/Claude/claude_desktop_config.json (Windows)");
    displayInfo("\nInstall Claude Code:");
    displayInfo("  curl -fsSL https://claude.ai/install.sh | bash");
    displayInfo("\nOr add manually:");
    displayInfo(`  claude mcp add agentmarket node ${scriptPath} server`);
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
