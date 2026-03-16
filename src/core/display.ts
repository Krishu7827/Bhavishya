/**
 * Terminal UI - displays agent choices and task status
 */

import chalk from "chalk";
import inquirer from "inquirer";
import ora, { Ora } from "ora";
import type { Agent } from "./registry.js";
import type { Specialty } from "./classifier.js";

/**
 * Format agent choices for display in terminal
 */
export function formatChoices(specialty: Specialty, agents: Agent[]): string {
  if (agents.length === 0) {
    return "No specialists found for this task.";
  }

  const header = chalk.bold.yellow(`\n⚡ agentmarket — ${specialty} task detected\n`);
  
  const table = chalk.white("   Top specialists:");
  const border = "   ┌" + "─".repeat(70) + "┐";
  const rows = agents.map((agent, idx) => {
    const num = chalk.cyan(`${idx + 1}.`);
    const name = agent.name.padEnd(20);
    const rating = `⭐ ${agent.rating.toFixed(1)}`;
    const price = `$${agent.price_per_million_input_tokens.toFixed(2)}/$${agent.price_per_million_output_tokens.toFixed(2)}/1M`;
    return `   │ ${num} ${name} ${rating}   ${price.padEnd(25)} │`;
  });
  const bottomBorder = "   └" + "─".repeat(70) + "┘";

  const instructions = chalk.gray("\n   [1] [2] [3] Choose specialist");
  const autoAssign = chalk.gray("   [A] Auto-assign best rated");
  const skip = chalk.gray("   [S] Skip — let Claude handle it\n");
  const working = chalk.dim("   Claude is already working while you decide...\n");

  return [
    header,
    table,
    border,
    ...rows,
    bottomBorder,
    instructions,
    autoAssign,
    skip,
    working
  ].join("\n");
}

/**
 * Display specialist choices and prompt for selection
 */
export async function promptAgentSelection(
  agents: Agent[]
): Promise<Agent | null> {
  const choices: Array<{ name: string; value: Agent | null; short: string }> = agents.map((agent, idx) => ({
    name: `${idx + 1}. ${agent.name} (⭐ ${agent.rating.toFixed(1)}) - $${agent.price_per_million_input_tokens.toFixed(2)}/$${agent.price_per_million_output_tokens.toFixed(2)} per 1M tokens`,
    value: agent,
    short: agent.name
  }));

  choices.push(
    {
      name: "A. Auto-assign best rated",
      value: agents[0], // Best rated is first (sorted by rating)
      short: "Auto"
    },
    {
      name: "S. Skip — let Claude handle it",
      value: null,
      short: "Skip"
    }
  );

  const { selected } = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: "Choose specialist:",
      choices,
    },
  ]);

  return selected;
}

/**
 * Display incoming task to specialist agent
 */
export function displayIncomingTask(
  task: string,
  budget: number,
  requesterRating: number,
  requesterTasks: number
): string {
  const header = chalk.bold.green("\n📥 Incoming task from Agent #" + "a3f9...");
  const taskText = chalk.white(`\n   "${task}"`);
  const budgetText = chalk.yellow(`   Budget: ${budget.toFixed(2)} USDC`);
  const ratingText = chalk.gray(
    `   Requester rating: ⭐ ${requesterRating.toFixed(1)} (${requesterTasks} tasks)`
  );
  const prompt = chalk.white("\n   [A] Accept   [D] Decline\n");

  return [header, taskText, budgetText, ratingText, prompt].join("\n");
}

/**
 * Create a spinner for async operations
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: "yellow",
    spinner: "dots"
  });
}

/**
 * Display success message
 */
export function displaySuccess(message: string): void {
  console.log(chalk.green("✓ " + message));
}

/**
 * Display error message
 */
export function displayError(message: string): void {
  console.log(chalk.red("✗ " + message));
}

/**
 * Display info message
 */
export function displayInfo(message: string): void {
  console.log(chalk.blue("ℹ " + message));
}

/**
 * Prompt for task rating (1-5 stars)
 */
export async function promptRating(): Promise<number> {
  const { rating } = await inquirer.prompt([
    {
      type: "list",
      name: "rating",
      message: "Rate the specialist's work:",
      choices: [
        { name: "⭐⭐⭐⭐⭐ Excellent", value: 5 },
        { name: "⭐⭐⭐⭐ Good", value: 4 },
        { name: "⭐⭐⭐ Average", value: 3 },
        { name: "⭐⭐ Poor", value: 2 },
        { name: "⭐ Very Poor", value: 1 },
      ],
    },
  ]);

  return rating;
}
