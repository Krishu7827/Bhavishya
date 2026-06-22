/**
 * Publish Command - Register your agent as a specialist
 */

import inquirer from "inquirer";
import { registerAgent } from "../core/registry.js";
import type { Agent } from "../core/registry.js";
import { KNOWN_SPECIALTIES } from "../core/classifier.js";
import {
  displaySuccess,
  displayError,
  displayInfo,
  createSpinner,
} from "../core/display.js";
import { runWalletSetup } from "./setup-wallet.js";

// Common specialty options (not exhaustive - custom ones allowed)
const SPECIALTY_CHOICES = [
  { name: "Accounting (invoice, tax, financial)", value: "accounting" },
  { name: "Legal (contracts, compliance, policy)", value: "legal" },
  { name: "Design (UI/UX, branding, graphics)", value: "design" },
  { name: "DevOps (deployment, infrastructure, cloud)", value: "devops" },
  { name: "Content (copywriting, SEO, marketing)", value: "content" },
  { name: "Data Science (ML, analytics, modeling)", value: "data-science" },
  { name: "Security (pentesting, audits, compliance)", value: "security" },
  { name: "Marketing (campaigns, social media, ads)", value: "marketing" },
  { name: "Custom (enter your own specialty tags)", value: "custom" },
];

/**
 * Run the publish command
 */
export async function runPublish(): Promise<void> {
  displayInfo("Publish your agent to agentmarket\n");

  // Gather basic agent information
  const basicInfo = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Agent name:",
      validate: (input) => input.length > 0 || "Name is required",
    },
    {
      type: "checkbox",
      name: "specialty",
      message: "Select specialties (use spacebar to select, can choose multiple):",
      choices: SPECIALTY_CHOICES,
      validate: (input) =>
        input.length > 0 || "Select at least one specialty or choose Custom",
    },
  ]);

  let finalSpecialties: string[] = basicInfo.specialty;

  // If custom was selected, prompt for custom tags
  if (finalSpecialties.includes("custom")) {
    const customInput = await inquirer.prompt([
      {
        type: "input",
        name: "customSpecialties",
        message: "Enter custom specialty tags (comma-separated, e.g., blockchain-dev, data-science):",
        validate: (input) => input.trim().length > 0 || "Enter at least one custom specialty",
      },
    ]);

    // Parse custom specialties
    const customTags = customInput.customSpecialties
      .split(",")
      .map((s: string) => s.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter((s: string) => s.length > 0 && /^[a-z0-9-]+$/.test(s));

    // Remove "custom" and add actual custom tags
    finalSpecialties = finalSpecialties.filter((s: string) => s !== "custom").concat(customTags);
  }

  // Deduplicate specialties (in case user selected and added same one)
  finalSpecialties = [...new Set(finalSpecialties)];

  const answers = { ...basicInfo, specialty: finalSpecialties };

  // MCP endpoint explanation
  console.log("\n" + "─".repeat(70));
  displayInfo("\n🔌 MCP Endpoint Setup\n");
  console.log("Your MCP endpoint is where your agent receives tasks.");
  console.log("This needs to be a publicly accessible URL.\n");
  
  console.log("Options:");
  console.log("  1. Deploy to cloud (Vercel, Railway, Render)");
  console.log("  2. Use ngrok for local development: https://ngrok.com");
  console.log("  3. Use a test URL for now (you can update it later)\n");
  
  const { hasEndpoint } = await inquirer.prompt([
    {
      type: "list",
      name: "hasEndpoint",
      message: "Do you have an MCP endpoint ready?",
      choices: [
        { name: "Yes - I have a deployed endpoint", value: "yes" },
        { name: "No - Use a placeholder for now", value: "placeholder" },
        { name: "Help - Show me how to set one up", value: "help" },
      ],
    },
  ]);

  let mcpEndpoint: string;

  if (hasEndpoint === "help") {
    displayInfo("\n📖 How to set up your MCP endpoint:\n");
    console.log("1. **Local Development (Testing)**:");
    console.log("   • Install ngrok: https://ngrok.com/download");
    console.log("   • Run your MCP server: npx agentmarket server");
    console.log("   • In another terminal: ngrok http 3000");
    console.log("   • Copy the ngrok URL (e.g., https://abc123.ngrok.io)\n");
    
    console.log("2. **Production (Recommended)**:");
    console.log("   • Deploy your agent to Vercel/Railway/Render");
    console.log("   • Use your deployment URL as the endpoint\n");
    
    console.log("3. **For Now**:");
    console.log("   • You can use a placeholder and update it later");
    console.log("   • Agents won't receive tasks until endpoint is valid\n");
    
    const { continueSetup } = await inquirer.prompt([
      {
        type: "confirm",
        name: "continueSetup",
        message: "Continue with publish?",
        default: true,
      },
    ]);
    
    if (!continueSetup) {
      displayInfo("Setup cancelled. Come back when you have an endpoint!");
      return;
    }
    
    const { endpoint } = await inquirer.prompt([
      {
        type: "input",
        name: "endpoint",
        message: "Your MCP endpoint URL (or placeholder):",
        default: "https://placeholder.example.com/mcp",
        validate: (input) =>
          input.startsWith("http") || "Must start with http:// or https://",
      },
    ]);
    mcpEndpoint = endpoint;
  } else if (hasEndpoint === "placeholder") {
    mcpEndpoint = "https://placeholder.example.com/mcp";
    displayInfo(`\nUsing placeholder: ${mcpEndpoint}`);
    displayInfo("⚠️  Remember to update this later or you won't receive tasks!\n");
  } else {
    const { endpoint } = await inquirer.prompt([
      {
        type: "input",
        name: "endpoint",
        message: "Your MCP endpoint URL:",
        validate: (input) =>
          input.startsWith("http") || "Must start with http:// or https://",
      },
    ]);
    mcpEndpoint = endpoint;
  }

  const finalAnswers = {
    ...answers,
    mcp_endpoint: mcpEndpoint,
  };

  // Run wallet and pricing setup
  displayInfo("\n📋 Let's set up your wallet and pricing...\n");
  
  const walletSetup = await runWalletSetup();
  
  if (!walletSetup) {
    displayError("Wallet setup cancelled.");
    return;
  }

  // Final confirmation
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Publish this agent to agentmarket?",
      default: true,
    },
  ]);

  if (!confirm) {
    displayInfo("Publishing cancelled.");
    return;
  }

  const spinner = createSpinner("Publishing agent...");
  spinner.start();

  try {
    const agentData: Omit<Agent, "id" | "created_at" | "updated_at"> = {
      name: finalAnswers.name,
      specialty: finalAnswers.specialty,
      price_per_million_input_tokens: walletSetup.inputPrice,
      price_per_million_output_tokens: walletSetup.outputPrice,
      wallet_address: walletSetup.walletAddress,
      mcp_endpoint: finalAnswers.mcp_endpoint,
      rating: 0,
      total_tasks: 0,
      response_time_avg: 0,
    };

    const agent = await registerAgent(agentData);

    spinner.stop();

    if (agent) {
      displaySuccess(`Agent "${agent.name}" published successfully!`);
      displayInfo(`\nAgent ID: ${agent.id}`);
      displayInfo(`Specialties: ${agent.specialty.join(", ")}`);
      displayInfo(`Pricing: $${agent.price_per_million_input_tokens}/$${agent.price_per_million_output_tokens} per 1M tokens (input/output)`);
      displayInfo("\nYour agent is now listed in the marketplace.");
    } else {
      displayError("Failed to publish agent. Please try again.");
    }
  } catch (error) {
    spinner.stop();
    displayError(
      `Publishing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}