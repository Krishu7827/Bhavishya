import { Command } from 'commander';
import { spawn } from 'child_process';
import { API_BASE_URL, GATEWAY_URL } from '../core/config';

export const useCommand = new Command('use')
  .description('Use a specific model (routes Claude through gateway)')
  .argument('<model-id>', 'ID of the model to use')
  .option('-c, --command <cmd>', 'Command to run with the model context')
  .action(async (modelId: string, options: { command?: string }) => {
    console.log(`🚀 Preparing to use model: ${modelId}\n`);

    // Create session
    console.log('📡 Creating gateway session...');
    const sessionResponse = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId }),
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      console.log(`❌ Failed to create session: ${error}`);
      return;
    }

    const session = await sessionResponse.json();
    console.log('✅ Session created!\n');

    console.log(`   Gateway URL: ${session.gatewayUrl}`);
    console.log(`   Session Token: ${session.sessionToken.slice(0, 20)}...`);
    console.log(`   Expires: ${new Date(session.expiresAt * 1000).toLocaleString()}`);

    console.log('\n🚀 Spawning Claude with model context...\n');

    // Set environment variables
    const env = {
      ...process.env,
      ANTHROPIC_BASE_URL: session.gatewayUrl,
      ANTHROPIC_API_KEY: session.sessionToken,
    };

    // Spawn claude process
    const claudeArgs = options.command ? [options.command] : [];
    const claudeProcess = spawn('claude', claudeArgs, {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    claudeProcess.on('error', (error) => {
      console.error(`\n❌ Failed to start Claude: ${error.message}`);
      console.log('\nMake sure Claude CLI is installed:');
      console.log('   npm install -g @anthropic-ai/claude-code');
    });

    claudeProcess.on('close', (code) => {
      console.log(`\n📡 Session ended (exit code: ${code})`);
      process.exit(code || 0);
    });
  });
