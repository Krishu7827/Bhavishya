/**
 * Mock User Flow - Simulates how an AI agent (like Claude) would use agentmarket
 */

import dotenv from 'dotenv';
dotenv.config();

import chalk from 'chalk';
import ora from 'ora';
import { fetchAgents } from './dist/core/registry.js';
import { classify } from './dist/core/classifier.js';

// Mock task scenarios that an AI might encounter
const MOCK_TASKS = [
  {
    user_request: "Can you help me create a financial report for Q4 2025?",
    agent_thinking: "This requires accounting expertise for financial analysis and report generation.",
    expected_specialty: "accounting"
  },
  {
    user_request: "I need to review this contract before signing it.",
    agent_thinking: "This is a legal task requiring contract review expertise.",
    expected_specialty: "legal"
  },
  {
    user_request: "Design a logo for my new startup.",
    agent_thinking: "This needs design skills - UI/UX and branding expertise.",
    expected_specialty: "design"
  },
  {
    user_request: "Set up a Kubernetes cluster for our microservices.",
    agent_thinking: "This is DevOps work involving infrastructure and deployment.",
    expected_specialty: "devops"
  },
  {
    user_request: "Write a blog post about AI trends in 2026.",
    agent_thinking: "This requires content creation and writing skills.",
    expected_specialty: "content"
  }
];

/**
 * Simulate AI agent's decision-making process
 */
async function simulateAgentFlow(taskScenario) {
  console.log(chalk.bold.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold.yellow('🤖 AI Agent Workflow Simulation'));
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  // Step 1: User makes a request
  console.log(chalk.bold('👤 User Request:'));
  console.log(chalk.white(`   "${taskScenario.user_request}"\n`));

  await sleep(1000);

  // Step 2: AI agent thinks about the task
  console.log(chalk.bold('🧠 AI Agent Thinking:'));
  console.log(chalk.gray(`   ${taskScenario.agent_thinking}`));
  console.log(chalk.gray(`   I should delegate this to a specialist...\n`));

  await sleep(1500);

  // Step 3: Classify the task
  console.log(chalk.bold('🔍 Task Classification:'));
  const spinner1 = ora('Analyzing task requirements...').start();
  await sleep(800);
  
  const specialty = await classify(taskScenario.user_request);
  const specialtyArray = [specialty]; // Convert to array for fetchAgents
  spinner1.succeed(`Detected specialty: ${chalk.cyan(specialty)}`);
  console.log();

  await sleep(500);

  // Step 4: Search for specialists
  console.log(chalk.bold('📡 Searching agentmarket:'));
  const spinner2 = ora('Calling MCP tool: agentmarket_scan...').start();
  await sleep(1000);

  try {
    const agents = await fetchAgents(specialtyArray);
    spinner2.succeed(`Found ${chalk.green(agents.length)} specialist${agents.length !== 1 ? 's' : ''}`);
    console.log();

    if (agents.length === 0) {
      console.log(chalk.yellow('⚠️  No specialists available for this task.'));
      console.log(chalk.gray('   The AI would handle this task itself or notify the user.\n'));
      return;
    }

    // Step 5: Display available specialists
    console.log(chalk.bold('📋 Available Specialists:\n'));
    
    agents.forEach((agent, index) => {
      console.log(chalk.bold(`   ${index + 1}. ${agent.name}`));
      console.log(chalk.gray(`      Specialties: ${agent.specialty.join(', ')}`));
      console.log(chalk.gray(`      MCP Endpoint: ${agent.mcp_endpoint}`));
      console.log(chalk.gray(`      Pricing: $${agent.price_per_million_input_tokens}/$${agent.price_per_million_output_tokens} per 1M tokens`));
      console.log(chalk.gray(`      Rating: ${agent.rating || 'New'} | Tasks: ${agent.tasks_completed || 0}`));
      console.log();
    });

    await sleep(1000);

    // Step 6: AI selects the best specialist
    console.log(chalk.bold('🎯 AI Agent Decision:'));
    const selectedAgent = selectBestAgent(agents);
    console.log(chalk.green(`   → Selected: ${selectedAgent.name}`));
    console.log(chalk.gray(`   Reason: Best match for specialty, competitive pricing\n`));

    await sleep(800);

    // Step 7: Handoff to specialist
    console.log(chalk.bold('🤝 Task Handoff:'));
    const spinner3 = ora('Connecting to specialist MCP endpoint...').start();
    await sleep(1200);
    spinner3.succeed('Connected successfully');

    console.log(chalk.gray(`   Sending task to: ${selectedAgent.mcp_endpoint}`));
    console.log(chalk.gray(`   Estimated cost: ${estimateCost(taskScenario.user_request, selectedAgent)}`));
    console.log();

    await sleep(500);

    // Step 8: Mock specialist response
    console.log(chalk.bold('✨ Specialist Response:'));
    const spinner4 = ora('Specialist is working on the task...').start();
    await sleep(2000);
    spinner4.succeed('Task completed!');

    const mockResponse = generateMockResponse(taskScenario);
    console.log(chalk.white(`\n   ${mockResponse}\n`));

    await sleep(500);

    // Step 9: Payment processing
    console.log(chalk.bold('💰 Payment Processing:'));
    console.log(chalk.gray(`   Calculating final cost based on token usage...`));
    await sleep(800);
    console.log(chalk.green(`   ✓ Payment of ${chalk.bold('$0.08 USDC')} sent to ${selectedAgent.wallet_address.slice(0, 10)}...`));
    console.log(chalk.gray(`   Platform fee (5%): $0.004 | Specialist receives: $0.076\n`));

    await sleep(500);

    // Step 10: Final summary
    console.log(chalk.bold.green('✅ Task Completed Successfully!\n'));
    console.log(chalk.gray('   The AI agent successfully:'));
    console.log(chalk.gray('   1. Identified the task type'));
    console.log(chalk.gray('   2. Found a qualified specialist'));
    console.log(chalk.gray('   3. Delegated the work'));
    console.log(chalk.gray('   4. Received results'));
    console.log(chalk.gray('   5. Processed payment'));

  } catch (error) {
    spinner2.fail('Error searching for specialists');
    console.error(chalk.red(`\n   Error: ${error.message}\n`));
  }
}

/**
 * Select the best agent from available options
 */
function selectBestAgent(agents) {
  // Simple selection logic: prefer higher-rated agents, or newest if no ratings
  return agents.sort((a, b) => {
    if (a.rating !== b.rating) return b.rating - a.rating;
    return b.tasks_completed - a.tasks_completed;
  })[0];
}

/**
 * Estimate task cost
 */
function estimateCost(taskDescription, agent) {
  const estimatedInputTokens = taskDescription.length * 3; // rough estimate
  const estimatedOutputTokens = 5000; // assume specialist generates ~5k tokens
  
  const inputCost = (estimatedInputTokens / 1000000) * agent.price_per_million_input_tokens;
  const outputCost = (estimatedOutputTokens / 1000000) * agent.price_per_million_output_tokens;
  const totalCost = inputCost + outputCost;
  
  return `~$${totalCost.toFixed(4)} USDC (${estimatedInputTokens} input + ${estimatedOutputTokens} output tokens)`;
}

/**
 * Generate mock response from specialist
 */
function generateMockResponse(taskScenario) {
  const responses = {
    accounting: "I've prepared the Q4 2025 financial report with revenue analysis, expense breakdown, and profit margins. Key findings: 23% revenue growth, EBITDA of $1.2M, and positive cash flow.",
    legal: "I've reviewed the contract and identified 3 key concerns: indemnification clause needs revision, termination notice period is unfavorable, and IP ownership terms require clarification.",
    design: "I've created a modern, minimalist logo concept with 3 variations. The primary design uses blue/green gradient symbolizing growth and innovation, with clean typography.",
    devops: "Kubernetes cluster is configured with 3 worker nodes, auto-scaling enabled, Ingress controller deployed, and monitoring via Prometheus/Grafana. CI/CD pipeline ready.",
    content: "I've written a 1,500-word blog post covering: AI democratization trends, multimodal AI breakthrough, AI safety regulations, and predictions for enterprise adoption in 2026."
  };

  return responses[taskScenario.expected_specialty] || "Task completed successfully with high-quality results.";
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run multiple task scenarios
 */
async function runAllScenarios() {
  console.log(chalk.bold.magenta('\n╔══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║                                                          ║'));
  console.log(chalk.bold.magenta('║          🚀 AGENTMARKET USER FLOW SIMULATION 🚀          ║'));
  console.log(chalk.bold.magenta('║                                                          ║'));
  console.log(chalk.bold.magenta('║      Demonstrating how AI agents delegate tasks to      ║'));
  console.log(chalk.bold.magenta('║           specialists via MCP marketplace                ║'));
  console.log(chalk.bold.magenta('║                                                          ║'));
  console.log(chalk.bold.magenta('╚══════════════════════════════════════════════════════════╝\n'));

  await sleep(1000);

  // Run a random task scenario
  const randomTask = MOCK_TASKS[Math.floor(Math.random() * MOCK_TASKS.length)];
  await simulateAgentFlow(randomTask);

  console.log(chalk.bold.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.gray('💡 Tip: Run this script multiple times to see different task scenarios!\n'));
  console.log(chalk.gray('📚 Available scenarios:'));
  MOCK_TASKS.forEach((task, i) => {
    console.log(chalk.gray(`   ${i + 1}. ${task.expected_specialty.toUpperCase()}: "${task.user_request}"`));
  });
  console.log();
}

// Run the simulation
runAllScenarios().catch(console.error);
