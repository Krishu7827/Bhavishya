/**
 * Wallet Setup Helper - Helps users create and configure their wallet
 */

import inquirer from "inquirer";
import { createWallet, exportWalletData } from "../payments/wallet.js";
import {
  displaySuccess,
  displayError,
  displayInfo,
  createSpinner,
} from "../core/display.js";
import chalk from "chalk";

/**
 * Pricing calculator - helps users understand what to charge
 */
function displayPricingGuidelines(): void {
  console.log(chalk.bold.yellow("\n💰 Pricing Guidelines\n"));
  
  console.log("Industry standard pricing for AI models (per 1M tokens):\n");
  
  console.log(chalk.cyan("Budget Models:"));
  console.log("  • Input:  $0.15 - $0.30");
  console.log("  • Output: $0.60 - $1.25\n");
   
  console.log(chalk.cyan("Standard Models:"));
  console.log("  • Input:  $0.30 - $1.00");
  console.log("  • Output: $1.50 - $5.00\n");
  
  console.log(chalk.cyan("Premium/Specialized Models:"));
  console.log("  • Input:  $1.00 - $3.00");
  console.log("  • Output: $5.00 - $15.00\n");
  
  console.log(chalk.gray("Tip: Output tokens typically cost 3-5x input tokens"));
  console.log(chalk.gray("Tip: Add 20-30% markup for your specialized expertise\n"));
}

/**
 * Estimate cost for a typical task
 */
function calculateEstimate(inputPrice: number, outputPrice: number): void {
  console.log(chalk.bold.yellow("\n📊 Cost Estimation Examples\n"));
  
  const scenarios = [
    { name: "Simple query", input: 1000, output: 500 },
    { name: "Medium task", input: 5000, output: 2000 },
    { name: "Complex task", input: 20000, output: 10000 },
  ];
  
  scenarios.forEach(scenario => {
    const inputCost = (scenario.input / 1_000_000) * inputPrice;
    const outputCost = (scenario.output / 1_000_000) * outputPrice;
    const total = inputCost + outputCost;
    
    console.log(chalk.cyan(`${scenario.name}:`));
    console.log(`  ${scenario.input.toLocaleString()} input + ${scenario.output.toLocaleString()} output tokens`);
    console.log(`  Cost: $${total.toFixed(4)} USDC\n`);
  });
}

/**
 * Create a new wallet for the agent
 */
export async function setupNewWallet(): Promise<{
  address: string;
  walletId: string;
  seed: string;
} | null> {
  console.log(chalk.bold.yellow("\n🔐 Wallet Setup\n"));
  
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Do you have a wallet on Base network?",
      choices: [
        { name: "No - Create a new wallet for me", value: "create" },
        { name: "Yes - I'll provide my existing wallet address", value: "existing" },
      ],
    },
  ]);
  
  if (action === "existing") {
    return null; // User will enter manually
  }
  
  // Create new wallet
  displayInfo("Creating a new wallet on Base network...");
  
  const spinner = createSpinner("Setting up wallet...");
  spinner.start();
  
  try {
    const wallet = await createWallet();
    const walletData = await exportWalletData(wallet);
    
    spinner.stop();
    
    displaySuccess("Wallet created successfully!\n");
    
    console.log(chalk.bold("⚠️  IMPORTANT - Save this information securely:\n"));
    console.log(chalk.yellow("Wallet Address:"));
    console.log(chalk.white(`  ${walletData.address}\n`));
    console.log(chalk.yellow("Wallet ID:"));
    console.log(chalk.white(`  ${walletData.walletId}\n`));
    console.log(chalk.yellow("Seed Phrase (NEVER SHARE THIS):"));
    console.log(chalk.white(`  ${walletData.seed}\n`));
    
    console.log(chalk.red("⚠️  Store your seed phrase in a safe place!"));
    console.log(chalk.gray("   Without it, you cannot recover your wallet.\n"));
    
    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: "Have you saved your wallet information?",
        default: false,
      },
    ]);
    
    if (!confirmed) {
      displayError("Please save your wallet information before continuing.");
      return null;
    }
    
    return walletData;
  } catch (error) {
    spinner.stop();
    displayError(
      `Failed to create wallet: ${error instanceof Error ? error.message : String(error)}`
    );
    
    displayInfo("\nNote: Wallet creation requires Coinbase CDP credentials.");
    displayInfo("For now, you can use a test wallet address or skip this step.");
    
    return null;
  }
}

/**
 * Full wallet setup flow
 */
export async function runWalletSetup(): Promise<{
  walletAddress: string;
  inputPrice: number;
  outputPrice: number;
} | null> {
  console.log(chalk.bold.cyan("\n⚡ Agent Wallet & Pricing Setup\n"));
  
  // Show pricing guidelines
  const { showGuidelines } = await inquirer.prompt([
    {
      type: "confirm",
      name: "showGuidelines",
      message: "Would you like to see pricing guidelines?",
      default: true,
    },
  ]);
  
  if (showGuidelines) {
    displayPricingGuidelines();
  }
  
  // Get pricing
  const pricing = await inquirer.prompt([
    {
      type: "input",
      name: "inputPrice",
      message: "Price per 1M input tokens (USDC):",
      default: "0.30",
      validate: (input) => {
        const price = parseFloat(input);
        return !isNaN(price) && price > 0 || "Enter a valid price";
      },
      filter: (input) => parseFloat(input),
    },
    {
      type: "input",
      name: "outputPrice",
      message: "Price per 1M output tokens (USDC):",
      default: "1.50",
      validate: (input) => {
        const price = parseFloat(input);
        return !isNaN(price) && price > 0 || "Enter a valid price";
      },
      filter: (input) => parseFloat(input),
    },
  ]);
  
  // Show cost estimates
  const { showEstimates } = await inquirer.prompt([
    {
      type: "confirm",
      name: "showEstimates",
      message: "See cost estimates for typical tasks?",
      default: true,
    },
  ]);
  
  if (showEstimates) {
    calculateEstimate(pricing.inputPrice, pricing.outputPrice);
  }
  
  // Setup wallet
  const walletData = await setupNewWallet();
  
  let walletAddress: string;
  
  if (walletData) {
    walletAddress = walletData.address;
    displayInfo(`Using new wallet: ${walletAddress}`);
  } else {
    // User provides existing wallet
    const { address } = await inquirer.prompt([
      {
        type: "input",
        name: "address",
        message: "Your wallet address (Base network):",
        validate: (input) =>
          input.startsWith("0x") && input.length === 42 ||
          "Enter a valid Ethereum address",
      },
    ]);
    walletAddress = address;
  }
  
  return {
    walletAddress,
    inputPrice: pricing.inputPrice,
    outputPrice: pricing.outputPrice,
  };
}
