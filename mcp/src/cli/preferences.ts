/**
 * Preferences Command - Manage auto-selection preferences
 */

import inquirer from "inquirer";
import {
  loadPreferences,
  savePreferences,
  updatePreference,
  resetPreferences,
} from "../core/preferences.js";
import {
  displaySuccess,
  displayError,
  displayInfo,
} from "../core/display.js";

/**
 * Run the preferences command
 */
export async function runPreferences(): Promise<void> {
  displayInfo("Manage your agentmarket preferences\n");

  const prefs = loadPreferences();

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to configure?",
      choices: [
        { name: "Toggle auto-delegation", value: "auto" },
        { name: "Set maximum price per task", value: "maxPrice" },
        { name: "Set minimum rating threshold", value: "minRating" },
        { name: "View current preferences", value: "view" },
        { name: "Reset to defaults", value: "reset" },
        { name: "Exit", value: "exit" },
      ],
    },
  ]);

  switch (answers.action) {
    case "auto":
      await configureAutoDelegation(prefs);
      break;
    case "maxPrice":
      await configureMaxPrice(prefs);
      break;
    case "minRating":
      await configureMinRating(prefs);
      break;
    case "view":
      displayCurrentPreferences(prefs);
      break;
    case "reset":
      await confirmReset();
      break;
    case "exit":
      displayInfo("Preferences unchanged.");
      break;
  }
}

async function configureAutoDelegation(prefs: any): Promise<void> {
  const { enabled } = await inquirer.prompt([
    {
      type: "confirm",
      name: "enabled",
      message: "Enable automatic delegation to specialists?",
      default: prefs.auto_delegate,
    },
  ]);

  updatePreference("auto_delegate", enabled);
  
  if (enabled) {
    displaySuccess("\n✅ Auto-delegation enabled!");
    displayInfo("Specialists will be selected automatically when:");
    displayInfo("  • Task cost is within your budget");
    displayInfo("  • Agent meets minimum rating threshold");
    displayInfo("  • Your wallet is funded\n");
  } else {
    displaySuccess("\n✅ Auto-delegation disabled!");
    displayInfo("You will be prompted to select specialists manually.\n");
  }
}

async function configureMaxPrice(prefs: any): Promise<void> {
  const { maxPrice } = await inquirer.prompt([
    {
      type: "number",
      name: "maxPrice",
      message: "Maximum price per task (in USDC):",
      default: prefs.max_price_per_task,
      validate: (input) => {
        if (input <= 0) return "Price must be greater than 0";
        if (input > 100) return "Price seems too high. Maximum is 100 USDC.";
        return true;
      },
    },
  ]);

  updatePreference("max_price_per_task", maxPrice);
  displaySuccess(`\n✅ Maximum price set to $${maxPrice.toFixed(2)} USDC per task\n`);
}

async function configureMinRating(prefs: any): Promise<void> {
  const { minRating } = await inquirer.prompt([
    {
      type: "number",
      name: "minRating",
      message: "Minimum agent rating (0-5):",
      default: prefs.min_rating_threshold,
      validate: (input) => {
        if (input < 0 || input > 5) return "Rating must be between 0 and 5";
        return true;
      },
    },
  ]);

  updatePreference("min_rating_threshold", minRating);
  displaySuccess(`\n✅ Minimum rating threshold set to ${minRating.toFixed(1)}⭐\n`);
}

function displayCurrentPreferences(prefs: any): void {
  console.log("\n" + "=".repeat(60));
  console.log("Current Preferences");
  console.log("=".repeat(60) + "\n");

  console.log(`Auto-delegation: ${prefs.auto_delegate ? "✅ Enabled" : "❌ Disabled"}`);
  console.log(`Max price per task: $${prefs.max_price_per_task.toFixed(2)} USDC`);
  console.log(`Min rating threshold: ${prefs.min_rating_threshold.toFixed(1)}⭐`);
  console.log(`Min tasks threshold: ${prefs.min_tasks_threshold}`);
  console.log(`\nUsage Stats:`);
  console.log(`  Total delegated tasks: ${prefs.total_delegated_tasks}`);
  console.log(`  Total spent: $${prefs.total_spent.toFixed(2)} USDC`);
  
  if (Object.keys(prefs.favorite_agents).length > 0) {
    console.log(`\nFavorite Agents:`);
    for (const [specialty, agentId] of Object.entries(prefs.favorite_agents)) {
      console.log(`  ${specialty}: ${agentId}`);
    }
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

async function confirmReset(): Promise<void> {
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "⚠️  Reset all preferences to defaults? This cannot be undone.",
      default: false,
    },
  ]);

  if (confirm) {
    resetPreferences();
    displaySuccess("\nPreferences reset to defaults.\n");
  } else {
    displayInfo("\nReset cancelled.\n");
  }
}
