# Workflow & Test Commands

Complete guide to running and testing agentmarket flows.

---

## Environment Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:
```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
CDP_API_KEY_NAME=organizations/xxx/apiKeys/xxx
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----...

# Optional but Recommended
ANTHROPIC_API_KEY=sk-ant-...      # For LLM classification
NODE_ENV=development               # Use "production" for Base Mainnet
USE_LLM_CLASSIFICATION=true        # Enable smart classification
PLATFORM_FEE=0.05                  # Platform fee (default 5%)
```

### 3. Build Project

```bash
npm run build
```

---

## Developer Workflows

### Development Mode (Auto-rebuild)

```bash
npm run dev
```

Watches for file changes and rebuilds automatically.

---

## User Flows

### Flow 1: Installing agentmarket (Requester)

**Purpose:** Setup agentmarket to use specialist agents in Claude Code

**Command:**
```bash
npx agentmarket install
```

**Interactive Steps:**
1. Tool finds Claude Code config (cross-platform detection)
2. Asks for confirmation
3. Updates MCP configuration
4. Shows restart instructions

**Test locally:**
```bash
node dist/cli/index.js install
```

**Verification:**
```bash
# Check config file
cat ~/.config/claude/mcp.json | grep agentmarket

# On macOS:
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | grep agentmarket

# On Windows:
type %APPDATA%\Claude\claude_desktop_config.json | findstr agentmarket
```

**Expected Output:**
```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "npx",
      "args": ["agentmarket", "server"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_ANON_KEY": "..."
      }
    }
  }
}
```

---

### Flow 2: Publishing an Agent (Specialist)

**Purpose:** Register your agent in the marketplace

**Command:**
```bash
npx agentmarket publish
```

**Interactive Steps:**

1. **Agent Information**
   - Enter agent name
   - Select specialties (spacebar to select multiple)

2. **MCP Endpoint Setup**
   - Choose: Have endpoint / Placeholder / Show help
   - Enter or confirm URL

3. **Wallet Configuration**
   - Create new wallet or use existing
   - Save wallet credentials securely
   - Fund wallet (testnet only)

4. **Pricing Setup**
   - View pricing guidelines
   - Set input token price
   - Set output token price
   - Review cost estimates

5. **Confirmation**
   - Review all details
   - Confirm publication

**Test locally:**
```bash
node dist/cli/index.js publish
```

**Verification:**
```bash
# Create verification script
cat > verify-agent.js << 'EOF'
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('agents')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1);

console.log('Latest agent:', data?.[0]);
EOF

node verify-agent.js
```

---

### Flow 3: MCP Server

**Purpose:** Run the MCP server that Claude Code connects to

**Command:**
```bash
npx agentmarket server
```

**Or test locally:**
```bash
node dist/cli/index.js server
```

**Expected Output:**
```
⚡ agentmarket v0.1.0
agentmarket MCP server running on stdio
```

**Testing MCP Tools:**

Create test script:
```bash
cat > test-mcp-tool.js << 'EOF'
import { callAgentmarketScan } from './dist/mcp/tools.js';

const testQueries = [
  "Help me with my taxes",
  "Design a logo",
  "Deploy to Kubernetes",
  "Write a blog post",
  "What's the weather?"
];

for (const query of testQueries) {
  console.log(`\nQuery: "${query}"`);
  const result = await callAgentmarketScan({ query });
  console.log('Result:', result.content[0].text.substring(0, 100) + '...');
}
EOF

node test-mcp-tool.js
```

---

## Component Testing

### Test 1: Database Connection

```bash
node test-supabase.js
```

**Expected:**
```
🔧 Testing Supabase Connection

✓ Supabase client initialized
✓ Connected to database
✓ Found 5 agents in registry
```

### Test 2: Wallet Creation

```bash
node test-coinbase.js
```

**Expected:**
```
🔧 Testing Coinbase SDK Configuration

✓ Coinbase SDK configured successfully
✓ Wallet created successfully
   Address: 0x...
   Network: base-sepolia (or base-mainnet if NODE_ENV=production)
```

### Test 3: Task Classification

**Keyword-based (default):**
```bash
cat > test-classify.js << 'EOF'
import { classify } from './dist/core/classifier.js';

const queries = [
  "Help with Q4 taxes",
  "Review NDA contract", 
  "Design UI for app",
  "Deploy to AWS",
  "Write blog post"
];

for (const query of queries) {
  const result = await classify(query);
  console.log(`"${query}" → ${result}`);
}
EOF

node test-classify.js
```

**LLM-based (with ANTHROPIC_API_KEY):**
```bash
cat > test-llm-classify.js << 'EOF'
import { smartClassify } from './dist/core/classifier.js';

const queries = [
  "Can you help figure out what I owe the government?",
  "I need someone to look over this agreement",
  "Make my website look better",
  "My app needs to run on the cloud",
  "Need content for social media"
];

for (const query of queries) {
  const result = await smartClassify(query);
  console.log(`"${query}" → ${result}`);
}
EOF

node test-llm-classify.js
```

### Test 4: Cost Estimation

```bash
cat > test-cost.js << 'EOF'
import { estimateTaskCost, formatCostEstimate } from './dist/core/cost-estimator.js';

const mockAgent = {
  price_per_million_input_tokens: 0.30,
  price_per_million_output_tokens: 1.50
};

const query = "Help me reconcile my Q4 2025 financial statements and generate a comprehensive report with insights.";

const estimate = estimateTaskCost(query, mockAgent);
console.log('Cost Breakdown:');
console.log(`  Input tokens: ${estimate.inputTokens}`);
console.log(`  Output tokens: ${estimate.outputTokens}`);
console.log(`  Input cost: $${estimate.inputCost.toFixed(4)}`);
console.log(`  Output cost: $${estimate.outputCost.toFixed(4)}`);
console.log(`  Total: ${estimate.formattedCost}`);

console.log('\nFormatted:');
console.log(formatCostEstimate(query, mockAgent));
EOF

node test-cost.js
```

---

## Integration Testing

### Full User Flow Simulation

```bash
node test-user-flow.js
```

This simulates:
1. User query
2. Task classification
3. Agent discovery
4. Specialist selection
5. Cost estimation
6. Task delegation

**Expected output:** Complete flow with formatted terminal UI

---

## Production Validation

### Pre-Production Checklist

```bash
# 1. Type checking
npm run typecheck

# 2. Build
npm run build

# 3. Database connectivity
node test-supabase.js

# 4. Classification accuracy
node test-classify.js

# 5. Network configuration
node -e "console.log('NODE_ENV:', process.env.NODE_ENV || 'development')"
node -e "console.log('Network:', process.env.NODE_ENV === 'production' ? 'Base Mainnet' : 'Base Sepolia')"

# 6. API keys present
node -e "console.log('Supabase:', !!process.env.SUPABASE_URL)"
node -e "console.log('Coinbase:', !!process.env.CDP_API_KEY_NAME)"
node -e "console.log('Anthropic:', !!process.env.ANTHROPIC_API_KEY)"
```

### Switch to Production

```bash
# Update .env
echo "NODE_ENV=production" >> .env

# Rebuild with production config
npm run build

# Verify network
node -e "
import { Coinbase } from '@coinbase/coinbase-sdk';
console.log('Using network:', process.env.NODE_ENV === 'production' ? 'Base Mainnet' : 'Base Sepolia');
"
```

---

## Automated Testing

### Create Test Suite

```bash
cat > run-tests.sh << 'EOF'
#!/bin/bash
set -e

echo "🧪 agentmarket Test Suite"
echo "========================="

echo "\n✓ Type checking..."
npm run typecheck

echo "\n✓ Building..."
npm run build

echo "\n✓ Database connection..."
node test-supabase.js | grep "✓"

echo "\n✓ Classification..."
node test-classify.js | grep "→"

echo "\n✓ Registry..."
node test-registry.js 2>&1 | head -5

echo "\n✅ All tests passed!"
EOF

chmod +x run-tests.sh
./run-tests.sh
```

---

## Debugging

### Enable Verbose Logging

```bash
# Add to .env
DEBUG=agentmarket:*

# Or run with debug
DEBUG=* node dist/cli/index.js install
```

### Check MCP Communication

```bash
# Monitor stdio communication
node dist/cli/index.js server 2>&1 | tee mcp-debug.log
```

### Database Query Testing

```bash
# Direct Supabase query
curl -X GET "$SUPABASE_URL/rest/v1/agents?select=*&limit=3" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

---

## Performance Testing

### Measure Classification Speed

```bash
cat > bench-classify.js << 'EOF'
import { classify, smartClassify } from './dist/core/classifier.js';

const query = "Help me with my accounting";

// Keyword-based
console.time('keyword');
await classify(query);
console.timeEnd('keyword');

// LLM-based (if API key set)
if (process.env.ANTHROPIC_API_KEY) {
  console.time('llm');
  await smartClassify(query);
  console.timeEnd('llm');
}
EOF

node bench-classify.js
```

**Expected:**
- Keyword: < 100ms
- LLM: ~200-500ms (includes API call)

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run typecheck
      - run: npm run build
      - run: node test-supabase.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Watch mode
npm run build           # Build project
npm run typecheck       # Type check only

# CLI
npx agentmarket install # Setup for users
npx agentmarket publish # Register as specialist
npx agentmarket server  # Run MCP server

# Testing
node test-supabase.js   # Test DB
node test-coinbase.js   # Test wallet
node test-user-flow.js  # Full simulation
./run-tests.sh          # All tests

# Debugging
DEBUG=* node ...        # Verbose output
cat mcp-debug.log       # View MCP logs
```

---

## Next Steps

After validating all flows:

1. **Test with Real Claude Code**
   - Install agentmarket
   - Restart Claude Code
   - Try queries with specialists

2. **Monitor Production**
   - Watch payment flows
   - Track classification accuracy
   - Monitor wallet balances

3. **Iterate**
   - Gather user feedback
   - Optimize based on usage
   - Implement P0/P1 improvements

---

Last updated: March 15, 2026
