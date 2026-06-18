import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { API_BASE_URL } from '../core/config';

const FUTURE_DIR = path.join(homedir(), '.future');
const CREDENTIALS_FILE = path.join(FUTURE_DIR, 'credentials.json');

interface Model {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  tags: string[];
  contextWindow: number;
  pricingNotes: string;
  publisherId: string;
  createdAt: string;
  updatedAt: string;
}

interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
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

export const listCommand = new Command('list')
  .description('List available AI models')
  .option('--mine', 'List only models you have published')
  .option('--category <category>', 'Filter by category (llm, embedding, image, audio)')
  .option('--limit <n>', 'Limit number of results', '20')
  .option('--sort <field>', 'Sort by: name, usage, created', 'created')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      // Check authentication
      const creds = await loadCredentials();
      
      if (options.mine && !creds) {
        console.log('⚠️  Not authenticated. Run `future login` first.\n');
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.limit) params.append('limit', options.limit);
      if (options.sort) params.append('sort', options.sort);

      const url = `${API_BASE_URL}/models${params.toString() ? '?' + params.toString() : ''}`;
      
      console.log('🔍 Fetching models...\n');

      // For --mine, we need authentication
      if (options.mine) {
        const params = new URLSearchParams();
        params.append('mine', 'true');
        const mineUrl = `${API_BASE_URL}/models?${params.toString()}`;
        
        const response = await fetch(mineUrl, {
          headers: {
            'Authorization': `Bearer ${creds.accessToken}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.log('⚠️  Authentication expired. Run `future login` again.\n');
          } else {
            console.log(`❌ Failed to fetch models: ${response.statusText}\n`);
          }
          return;
        }
        
        const models: Model[] = await response.json();
        
        if (options.json) {
          console.log(JSON.stringify(models, null, 2));
        } else {
          displayModelsTable(models, options.mine);
        }
        return;
      }

      // Fetch all models
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`❌ Failed to fetch models: ${response.statusText}\n`);
        return;
      }

      const models: Model[] = await response.json();

      if (models.length === 0) {
        console.log('ℹ️  No models found.\n');
        if (options.mine) {
          console.log('   Publish a model with: future publish');
        }
        return;
      }

      // Output results
      if (options.json) {
        console.log(JSON.stringify(models, null, 2));
      } else {
        displayModelsTable(models, options.mine);
      }

    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  });

function displayModelsTable(models: Model[], isMine: boolean) {
  if (isMine) {
    console.log('📦 Your Published Models:\n');
  } else {
    console.log('📦 Available Models:\n');
  }

  console.log('┌' + '─'.repeat(40) + '┬' + '─'.repeat(30) + '┬' + '─'.repeat(15) + '┬' + '─'.repeat(20) + '┐');
  console.log('│ Model ID                               │ Name                          │ Context Window│ Tags                │');
  console.log('├' + '─'.repeat(40) + '┼' + '─'.repeat(30) + '┼' + '─'.repeat(15) + '┼' + '─'.repeat(20) + '┤');

  models.forEach(model => {
    const id = model.id.padEnd(40).substring(0, 40);
    const name = model.name.padEnd(30).substring(0, 30);
    const context = String(model.contextWindow).padEnd(15).substring(0, 15);
    const tags = model.tags.slice(0, 3).join(', ').padEnd(20).substring(0, 20);
    
    console.log(`│ ${id} │ ${name} │ ${context} │ ${tags} │`);
  });

  console.log('└' + '─'.repeat(40) + '┴' + '─'.repeat(30) + '┴' + '─'.repeat(15) + '┴' + '─'.repeat(20) + '┘\n');

  if (isMine) {
    console.log(`Total: ${models.length} model(s) published\n`);
    console.log('💡 Commands:');
    console.log('   future info <model-id>    - View model details');
    console.log('   future unpublish <id>      - Remove a model');
    console.log('   future analytics <id>      - View usage analytics\n');
  } else {
    console.log(`Total: ${models.length} model(s) available\n`);
    console.log('💡 Commands:');
    console.log('   future info <model-id>     - View model details');
    console.log('   future use <model-id>      - Use a model\n');
    console.log('   future list --mine         - View your published models\n');
  }
}
