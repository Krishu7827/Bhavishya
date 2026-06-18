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
  publisher?: {
    email: string;
    name?: string;
  };
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

export const infoCommand = new Command('info')
  .description('Show details about a specific model')
  .argument('<model-id>', 'ID of the model')
  .option('--json', 'Output in JSON format')
  .action(async (modelId: string, options: { json?: boolean }) => {
    try {
      // Check authentication
      const creds = await loadCredentials();
      
      if (!creds) {
        console.log('⚠️  Not authenticated. Run `future login` first.\n');
        return;
      }

      console.log(`🔍 Fetching model details for: ${modelId}...\n`);

      // Fetch model details
      const response = await fetch(`${API_BASE_URL}/models/${modelId}`, {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('⚠️  Authentication expired. Run `future login` again.\n');
        } else if (response.status === 404) {
          console.log(`❌ Model not found: ${modelId}\n`);
        } else {
          console.log(`❌ Failed to fetch model: ${response.statusText}\n`);
        }
        return;
      }

      const model: Model = await response.json();

      // Output results
      if (options.json) {
        console.log(JSON.stringify(model, null, 2));
      } else {
        displayModelInfo(model);
      }

    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  });

function displayModelInfo(model: Model) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📦 ${model.name}`);
  console.log(`   ID: ${model.id}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Description:`);
  console.log(`  ${model.description}\n`);

  console.log(`Details:`);
  console.log(`  Context Window: ${model.contextWindow.toLocaleString()} tokens`);
  console.log(`  Base URL:       ${model.baseUrl}`);
  console.log(`  Publisher:      ${model.publisher?.name || model.publisher?.email || model.publisherId}\n`);

  if (model.tags && model.tags.length > 0) {
    console.log(`Tags:`);
    console.log(`  ${model.tags.map(t => `#${t}`).join(' ')  }\n`);
  }

  console.log(`Pricing:`);
  console.log(`  ${model.pricingNotes}\n`);

  console.log(`Timestamps:`);
  console.log(`  Created: ${new Date(model.createdAt).toLocaleString()}`);
  console.log(`  Updated: ${new Date(model.updatedAt).toLocaleString()}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Commands:');
  console.log(`   future use ${model.id}       - Use this model`);
  console.log(`   future list                - List all models`);
  console.log(`   future list --mine         - List your models\n`);
}
