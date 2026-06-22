/**
 * Test Coinbase SDK Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

async function testCoinbaseSDK() {
  console.log('\n🔧 Testing Coinbase SDK Configuration\n');

  try {
    console.log('📝 Configuring Coinbase SDK from JSON file...');
    
    Coinbase.configureFromJson({ filePath: './cdp_api_key.json' });

    console.log('✅ Coinbase SDK configured successfully!');
    console.log('\n📝 Testing wallet creation...');
    
    const wallet = await Wallet.create({
      networkId: Coinbase.networks.BaseSepolia,
    });
    
    const address = await wallet.getDefaultAddress();
    
    console.log('✅ Wallet created successfully!');
    console.log('   Address:', address?.getId());
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    // Check if it's a network/API issue
    if (error.isAxiosError) {
      console.error('\n🔍 This appears to be an API communication error.');
      console.error('   HTTP Code:', error.httpCode);
      console.error('   API Code:', error.apiCode);
      console.error('   API Message:', error.apiMessage);
      console.error('   Response:', error.response?.data);
      console.error('   Request URL:', error.config?.url);
      console.error('   Request Method:', error.config?.method);
      console.error('\n   Raw error code:', error.code);
      console.error('   Raw error:', error.cause);
    } else {
      console.error('\nFull error:', error);
    }
    
    // Try to print stack
    console.error('\nStack:', error.stack);
  }
}

testCoinbaseSDK();
