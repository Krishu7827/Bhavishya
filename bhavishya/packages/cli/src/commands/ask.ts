import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { API_BASE_URL, GATEWAY_URL } from '../core/config';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const FUTURE_DIR = path.join(homedir(), '.future');
const CREDENTIALS_FILE = path.join(FUTURE_DIR, 'credentials.json');

interface Model {
  modelId: string;
  modelName: string;
  publisherName: string;
  tags: string[];
  matchScore: number;
  whyMatched: string;
  contextWindow?: number;
  pricingNotes?: string;
}

interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  publisherId: string;
  email: string;
  name: string;
}

async function loadCredentials(): Promise<Credentials | null> {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    return null;
  }
  
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
  if (creds.expiresAt < Date.now()) {
    return null;
  }
  
  return creds;
}

export const askCommand = new Command('ask')
  .description('Ask Future to suggest models for a query with interactive selection')
  .argument('<query>', 'The query to match models against')
  .option('-l, --list', 'Show all models instead of AI suggestions')
  .option('-n, --number <count>', 'Number of models to show', '5')
  .action(async (query: string, options: { list?: boolean; number?: string }) => {
    try {
      console.log(chalk.blue(`\n🔍 Finding models for: "${query}"\n`));

      // Fetch models
      let models: Model[] = [];

      if (options.list) {
        // Fetch all models
        const response = await fetch(`${API_BASE_URL}/models`);
        if (!response.ok) {
          console.log(chalk.red('❌ Failed to fetch models'));
          return;
        }
        
        const allModels = await response.json() as any;
        models = allModels.map((m: any) => ({
          modelId: m.id,
          modelName: m.name,
          publisherName: m.publisher?.name || m.publisher?.email || 'Unknown',
          tags: m.tags || [],
          matchScore: 0.5,
          whyMatched: 'All available models',
          contextWindow: m.contextWindow,
          pricingNotes: m.pricingNotes,
        }));
      } else {
        // Get AI suggestions
        const response = await fetch(`${API_BASE_URL}/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          console.log(chalk.red('❌ Failed to get suggestions'));
          return;
        }

        const data = await response.json() as any;
        models = data.suggestions || [];
      }

      if (models.length === 0) {
        console.log(chalk.yellow('❌ No matching models found. Try a different query.\n'));
        console.log(chalk.gray('💡 Tip: Use --list to see all available models'));
        return;
      }

      // Limit number of models shown
      const limit = parseInt(options.number || '5');
      const displayModels = models.slice(0, limit);

      // Display models with numbers
      console.log(chalk.bold('📋 Available Models:\n'));
      displayModels.forEach((model, index) => {
        const num = chalk.cyan(`[${index + 1}]`);
        const name = chalk.bold.white(model.modelName);
        const publisher = chalk.gray(`by ${model.publisherName}`);
        const tags = model.tags.length > 0 ? chalk.blue(model.tags.map(t => `#${t}`).join(' ')) : '';
        
        console.log(`  ${num} ${name} ${publisher}`);
        if (tags) console.log(`      ${tags}`);
        if (model.whyMatched && model.matchScore > 0) {
          const score = chalk.yellow(`${(model.matchScore * 100).toFixed(0)}% match`);
          console.log(`      ${score} - ${model.whyMatched}`);
        }
        if (model.contextWindow) {
          console.log(`      ${chalk.gray(`Context: ${model.contextWindow.toLocaleString()} tokens`)}`);
        }
        if (model.pricingNotes) {
          console.log(`      ${chalk.gray(model.pricingNotes)}`);
        }
        console.log('');
      });

      // Interactive selection with arrow keys
      const choices = displayModels.map((model, index) => ({
        name: `${index + 1}. ${model.modelName} (${model.publisherName})`,
        value: index.toString(),
      }));

      const { selectedIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedIndex',
          message: 'Select a model to use (use arrow keys):',
          choices,
          pageSize: Math.min(displayModels.length, 10),
        },
      ]);

      const selectedModel = displayModels[parseInt(selectedIndex)];
      
      console.log(chalk.green(`\n✅ Selected: ${selectedModel.modelName}\n`));
      console.log(chalk.bold('Model Details:'));
      console.log(`  ID: ${chalk.cyan(selectedModel.modelId)}`);
      console.log(`  Publisher: ${selectedModel.publisherName}`);
      console.log(`  Tags: ${selectedModel.tags.join(', ')}`);
      if (selectedModel.contextWindow) {
        console.log(`  Context Window: ${selectedModel.contextWindow.toLocaleString()} tokens`);
      }
      console.log('');

      // Ask what to do next
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🚀 Use this model now', value: 'use' },
            { name: '📋 View more model details', value: 'info' },
            { name: '🔄 Select a different model', value: 'rescan' },
            { name: '❌ Cancel', value: 'cancel' },
          ],
        },
      ]);

      switch (action) {
        case 'use':
          await useModel(selectedModel);
          break;
        case 'info':
          console.log(chalk.blue(`\n🔍 Fetching detailed information...\n`));
          console.log(JSON.stringify(selectedModel, null, 2));
          console.log(chalk.gray(`\n💡 To use this model: future use ${selectedModel.modelId}\n`));
          break;
        case 'rescan':
          console.log(chalk.blue('\n↩️  Restarting model selection...\n'));
          // Re-run the command
          await askCommand.parseAsync(process.argv.slice(2));
          return;
        case 'cancel':
          console.log(chalk.gray('\n👋 Cancelled.\n'));
          break;
      }

    } catch (error) {
      console.log(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    }
  });

async function useModel(model: Model) {
  console.log(chalk.blue('\n🚀 Setting up model for use...\n'));
  
  // Check authentication
  const creds = await loadCredentials();
  if (!creds) {
    console.log(chalk.yellow('⚠️  Authentication required to use models.'));
    console.log(chalk.gray('   Run: future login\n'));
    return;
  }

  console.log(chalk.green('✅ Model ready to use!\n'));
  console.log(chalk.bold('To use this model in your session:\n'));
  console.log(chalk.cyan(`   future use ${model.modelId}`));
  console.log('');
  console.log(chalk.gray('This will create a gateway session and set environment variables.'));
  console.log(chalk.gray('Then run your AI tool or application as normal.\n'));
}
