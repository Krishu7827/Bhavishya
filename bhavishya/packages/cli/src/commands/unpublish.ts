import { Command } from 'commander';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { API_BASE_URL } from '../core/config';

const FUTURE_DIR = path.join(homedir(), '.future');
const CREDENTIALS_FILE = path.join(FUTURE_DIR, 'credentials.json');

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

export const unpublishCommand = new Command('unpublish')
  .description('Remove a published model from the marketplace')
  .argument('<model-id>', 'ID of the model to remove')
  .option('-f, --force', 'Skip confirmation')
  .option('--json', 'Output in JSON format')
  .action(async (modelId: string, options: { force?: boolean; json?: boolean }) => {
    try {
      // Check authentication
      const creds = await loadCredentials();
      
      if (!creds) {
        console.log('⚠️  Not authenticated. Run `future login` first.\n');
        return;
      }

      // Fetch model details first
      console.log(`🔍 Fetching model: ${modelId}...\n`);
      
      const modelResponse = await fetch(`${API_BASE_URL}/models/${modelId}`, {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`
        }
      });

      if (!modelResponse.ok) {
        if (modelResponse.status === 401) {
          console.log('⚠️  Authentication expired. Run `future login` again.\n');
        } else if (modelResponse.status === 404) {
          console.log(`❌ Model not found: ${modelId}\n`);
        } else {
          console.log(`❌ Failed to fetch model: ${modelResponse.statusText}\n`);
        }
        return;
      }

      const model = await modelResponse.json();

      // Confirm deletion
      if (!options.force) {
        console.log(`📦 Model: ${model.name}`);
        console.log(`   ID: ${model.id}`);
        console.log(`   Description: ${model.description}\n`);

        const { confirmed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: '⚠️  This action cannot be undone. Are you sure you want to unpublish this model?',
          default: false,
        }]);

        if (!confirmed) {
          console.log('\n✋ Unpublish cancelled.\n');
          return;
        }
      }

      // Delete model
      console.log('\n🗑️  Unpublishing model...\n');
      
      const deleteResponse = await fetch(`${API_BASE_URL}/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`
        }
      });

      if (!deleteResponse.ok) {
        if (deleteResponse.status === 403) {
          console.log('❌ You do not have permission to unpublish this model.\n');
        } else {
          console.log(`❌ Failed to unpublish model: ${deleteResponse.statusText}\n`);
        }
        return;
      }

      const result = await deleteResponse.json();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('✅ Model unpublished successfully!\n');
        console.log(`   Model ID: ${modelId}`);
        console.log(`   Name: ${model.name}\n`);
        console.log('💡 Run `future list --mine` to see your remaining models.\n');
      }

    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  });
