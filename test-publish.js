/**
 * Test Publish - Automated test of agent publishing flow
 */

import dotenv from 'dotenv';
dotenv.config();

import { registerAgent } from './dist/core/registry.js';
import { createWallet, exportWalletData } from './dist/payments/wallet.js';

async function testPublish() {
  console.log('\n🧪 Testing Agent Publish Flow\n');

  try {
    // Use a placeholder wallet address (skip creation for now due to Coinbase API issues)
    const walletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    console.log('📝 Step 1: Using placeholder wallet address');
    console.log('✅ Wallet:', walletAddress);

    // Step 2: Prepare agent data
    const agentData = {
      name: 'TestFinanceAgent',
      specialty: ['accounting'],
      mcp_endpoint: 'https://joistless-aureately-brittani.ngrok-free.dev/mcp',
      wallet_address: walletAddress,
      price_per_million_input_tokens: 0.50,
      price_per_million_output_tokens: 2.00,
      rating: 0,
      tasks_completed: 0
    };

    console.log('\n📝 Step 2: Registering agent to Supabase...');
    console.log('Agent data:', {
      name: agentData.name,
      specialty: agentData.specialty,
      mcp_endpoint: agentData.mcp_endpoint,
      wallet_address: agentData.wallet_address,
      pricing: `$${agentData.price_per_million_input_tokens}/$${agentData.price_per_million_output_tokens} per 1M tokens`
    });

    // Step 3: Register to Supabase
    await registerAgent(agentData);
    
    console.log('\n✅ Agent published successfully!');
    console.log('\n📊 Summary:');
    console.log(`  Name: ${agentData.name}`);
    console.log(`   Specialty: ${agentData.specialty.join(', ')}`);
    console.log(`   MCP Endpoint: ${agentData.mcp_endpoint}`);
    console.log(`   Wallet: ${agentData.wallet_address}`);
    console.log(`   Pricing: $${agentData.price_per_million_input_tokens}/$${agentData.price_per_million_output_tokens} per 1M tokens`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPublish();
