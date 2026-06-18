import { Command } from 'commander';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { CreateModelPayload, StoredCredentials } from '@future/shared';
import { API_BASE_URL } from '../core/config';
import { loginCmd } from './login';

const FUTURE_DIR = path.join(homedir(), '.future');
const CREDENTIALS_FILE = path.join(FUTURE_DIR, 'credentials.json');

export const publishCommand = new Command('publish')
  .description('Publish a model to the Future marketplace')
  .action(async () => {
    console.log('📤 Publishing a new model...\n');

    // Check authentication
    const creds = await loadCredentials();
    if (!creds || creds.expiresAt < Date.now()) {
      console.log('⚠️  Not authenticated. Running login first...\n');
      await loginCmd.run();
    }

    const credentials = await loadCredentials();
    if (!credentials) {
      console.log('❌ Authentication failed. Please try again.');
      return;
    }

    // Interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Model name:',
        validate: (input) => input.length > 0 || 'Name is required',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        validate: (input) => input.length > 0 || 'Description is required',
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: 'API Base URL (OpenAI-compatible):',
        default: 'https://api.openai.com/v1',
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'API Key (will be encrypted):',
        mask: '*',
        validate: (input) => input.length > 0 || 'API Key is required',
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Tags (comma-separated, e.g. "code,fast,cheap"):',
        filter: (input) => input.split(',').map((t: string) => t.trim()).filter(Boolean),
      },
      {
        type: 'number',
        name: 'contextWindow',
        message: 'Context window size:',
        default: 4096,
      },
      {
        type: 'input',
        name: 'pricingNotes',
        message: 'Pricing notes:',
        default: 'Contact publisher for pricing',
      },
    ]);

    const payload: CreateModelPayload = {
      name: answers.name,
      description: answers.description,
      baseUrl: answers.baseUrl,
      apiKey: answers.apiKey,
      tags: answers.tags,
      contextWindow: answers.contextWindow,
      pricingNotes: answers.pricingNotes,
    };

    console.log('\n📤 Submitting model to marketplace...\n');

    // Post to backend
    const response = await fetch(`${API_BASE_URL}/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Failed to publish model: ${error}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Model published successfully!\n');
    console.log(`   Model ID: ${result.id}`);
    console.log(`   Name: ${result.name}`);
    console.log(`   Tags: ${result.tags.join(', ')}`);
    console.log(`   Context: ${result.contextWindow} tokens`);
    console.log(`\n   Your model is now available in the marketplace!`);
  });

async function loadCredentials(): Promise<StoredCredentials | null> {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) return null;
    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}
