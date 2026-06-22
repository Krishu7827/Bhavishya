import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing Supabase connection...\n');

// Check if environment variables are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

console.log('📡 Connecting to:', process.env.SUPABASE_URL);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

try {
  const { data, error } = await supabase.from('agents').select('*');
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to Supabase successfully!');
    console.log('📊 Agents found:', data.length);
    
    if (data.length > 0) {
      console.log('\nSample agents:');
      data.forEach(agent => {
        console.log(`  - ${agent.name} (${agent.specialty.join(', ')})`);
      });
    } else {
      console.log('\n💡 Tip: Your agents table is empty. You can add test data from the quickstart guide.');
    }
    
    console.log('\n🎉 Everything is working! You\'re ready to use agentmarket.');
  }
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
}
