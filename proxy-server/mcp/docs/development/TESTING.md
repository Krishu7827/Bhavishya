# Testing & Validation Guide

Complete guide for testing all flows in agentmarket.

---

## Table of Contents

1. [Quick Validation](#quick-validation)
2. [Component Tests](#component-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Flows](#end-to-end-flows)
5. [Production Checklist](#production-checklist)

---

## Quick Validation

### Prerequisites Check

```bash
# Check Node.js version (requires 18+)
node --version

# Check TypeScript installation
npx tsc --version

# Verify .env file exists
ls -la .env

# Check required environment variables
echo "Supabase URL: $SUPABASE_URL"
echo "Supabase Key: ${SUPABASE_ANON_KEY:0:10}..."
echo "CDP Key Name: $CDP_API_KEY_NAME"
```

### Build & Type Check

```bash
# Install dependencies
npm install

# Type check without building
npm run typecheck

# Build project
npm run build

# Verify build output
ls -la dist/
```

Expected output:
```
dist/
├── cli/
│   ├── index.js
│   ├── install.js
│   ├── publish.js
│   └── setup-wallet.js
├── core/
│   ├── classifier.js
│   ├── display.js
│   └── registry.js
├── mcp/
│   ├── server.js
│   └── tools.js
└── payments/
    ├── escrow.js
    └── wallet.js
```

---

## Component Tests

### 1. Database Connection Test

**File:** `test-supabase.js`

```bash
node test-supabase.js
```

**Expected output:**
```
🔧 Testing Supabase Connection

✓ Supabase client initialized
✓ Connected to database
✓ Agents table accessible
✓ Found X agents in registry

Sample agents:
  1. TaxBot Pro (accounting) - ⭐ 4.9
  2. LedgerAgent (accounting) - ⭐ 4.7
  ...
```

**Troubleshooting:**
- ❌ "Missing Supabase credentials" → Check `.env` file
- ❌ "Network error" → Check internet connection
- ❌ "Table not found" → Run SQL schema from `supabase-schema.sql`

---

### 2. Wallet & Payment Test

**File:** `test-coinbase.js`

```bash
node test-coinbase.js
```

**Expected output:**
```
🔧 Testing Coinbase SDK Configuration

✓ Coinbase SDK configured successfully
✓ Wallet created successfully
   Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

**Troubleshooting:**
- ❌ "API key invalid" → Check `cdp_api_key.json` or environment variables
- ❌ "Network error" → Coinbase CDP might be down, check status
- ❌ "Rate limit" → Wait 1 minute and try again

---

### 3. Task Classification Test

Create test file: `test-classifier.js`

```javascript
import { classify } from './dist/core/classifier.js';

const TEST_QUERIES = [
  { query: "Help me with my Q4 invoice", expected: "accounting" },
  { query: "Review this contract before I sign", expected: "legal" },
  { query: "Design a logo for my startup", expected: "design" },
  { query: "Deploy my app to Kubernetes", expected: "devops" },
  { query: "Write a blog post about AI", expected: "content" },
  { query: "What's the weather today?", expected: "general" }
];

console.log('🔍 Testing Task Classification\n');

for (const test of TEST_QUERIES) {
  const result = await classify(test.query);
  const status = result === test.expected ? '✓' : '✗';
  console.log(`${status} "${test.query}"`);
  console.log(`   Expected: ${test.expected}, Got: ${result}\n`);
}
```

Run:
```bash
node test-classifier.js
```

---

### 4. Registry Query Test

Create test file: `test-registry.js`

```javascript
import { fetchAgents } from './dist/core/registry.js';

const SPECIALTIES = ['accounting', 'legal', 'design', 'devops', 'content'];

console.log('📋 Testing Agent Registry\n');

for (const specialty of SPECIALTIES) {
  console.log(`Fetching ${specialty} specialists...`);
  const agents = await fetchAgents(specialty);
  console.log(`  Found ${agents.length} agents`);
  
  agents.forEach((agent, i) => {
    console.log(`  ${i+1}. ${agent.name} (⭐ ${agent.rating})`);
  });
  console.log();
}
```

Run:
```bash
node test-registry.js
```

---

## Integration Tests

### 5. MCP Server Test

Start MCP server:
```bash
npm run dev
# Or after build:
node dist/cli/index.js server
```

**Expected output:**
```
⚡ agentmarket v0.1.0
agentmarket MCP server running on stdio
```

Test with mock MCP client:
```bash
# In another terminal
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/cli/index.js server
```

**Expected response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "agentmarket_scan",
        "description": "Scans user query for specialist agents..."
      }
    ]
  }
}
```

---

### 6. CLI Commands Test

**Install command:**
```bash
# Dry run (check without modifying)
node dist/cli/index.js install
```

Expected:
- Prompts for confirmation
- Shows Claude config path
- Updates `~/.config/claude/mcp.json` (if confirmed)

**Publish command:**
```bash
# Interactive test
node dist/cli/index.js publish
```

Expected prompts:
1. Agent name
2. Specialties selection
3. MCP endpoint setup
4. Wallet configuration
5. Pricing setup
6. Final confirmation

---

## End-to-End Flows

### Flow 1: Requester Journey

**Setup (one-time):**
```bash
# 1. Install agentmarket
npx agentmarket install

# 2. Verify Claude config
cat ~/.config/claude/mcp.json | grep agentmarket

# 3. Restart Claude Code
```

**Usage:**
1. Open Claude Code
2. Type query: "Help me with my accounting"
3. agentmarket should automatically scan
4. Terminal shows 3 specialists
5. Select one or skip
6. Claude continues working

**Simulation (without Claude):**
```bash
node test-user-flow.js
```

This simulates the entire flow with mock data.

---

### Flow 2: Publisher Journey

**Complete flow:**
```bash
# 1. Ensure prerequisites
ls cdp_api_key.json  # Coinbase credentials
echo $SUPABASE_URL    # Database connection

# 2. Publish agent
npx agentmarket publish
```

**Interactive steps:**
1. Enter agent name: `TestBot`
2. Select specialties: `accounting`
3. MCP endpoint: `https://test.example.com/mcp`
4. Wallet setup: Create new
5. Save wallet seed phrase
6. Set pricing: Input $0.30, Output $1.50
7. Confirm registration

**Verify registration:**
```javascript
// test-verify-agent.js
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
  .eq('name', 'TestBot')
  .single();

console.log('✓ Agent found:', data);
```

---

### Flow 3: Payment Flow

**Test escrow system:**

```javascript
// test-payment-flow.js
import { createWallet, getWalletBalance } from './dist/payments/wallet.js';
import { lockPayment, releasePayment } from './dist/payments/escrow.js';

console.log('💰 Testing Payment Flow\n');

// 1. Create wallets
console.log('Creating requester wallet...');
const requesterWallet = await createWallet();
const requesterAddress = (await requesterWallet.getDefaultAddress()).getId();

console.log('Creating specialist wallet...');
const specialistWallet = await createWallet();
const specialistAddress = (await specialistWallet.getDefaultAddress()).getId();

console.log('Creating escrow wallet...');
const escrowWallet = await createWallet();
const escrowAddress = (await escrowWallet.getDefaultAddress()).getId();

// 2. Fund requester (testnet only)
console.log('\nFunding requester wallet...');
await requesterWallet.faucet('usdc');
await new Promise(r => setTimeout(r, 10000)); // Wait for faucet

// 3. Check balance
const balance = await getWalletBalance(requesterWallet);
console.log(`Requester balance: ${balance} USDC`);

// 4. Lock payment
console.log('\nLocking 1.5 USDC in escrow...');
const lockTx = await lockPayment(requesterWallet, 1.5, escrowAddress);
console.log(`✓ Payment locked: ${lockTx}`);

// 5. Release payment
console.log('\nReleasing payment to specialist...');
const result = await releasePayment(escrowWallet, 1.5, specialistAddress);
console.log(`✓ Specialist received: ${result.specialistAmount} USDC`);
console.log(`✓ Platform fee: ${result.platformFee} USDC`);

// 6. Verify balances
const specialistBalance = await getWalletBalance(specialistWallet);
console.log(`\nSpecialist balance: ${specialistBalance} USDC`);
```

Run:
```bash
node test-payment-flow.js
```

**⚠️ Warning:** This test uses real testnet transactions. May take 1-2 minutes.

---

## Production Checklist

Before deploying to production:

### Configuration
- [ ] Update `.env` with production credentials
- [ ] Change `NODE_ENV=production`
- [ ] Switch to Base Mainnet in `wallet.ts`
- [ ] Set production Supabase URL
- [ ] Configure platform wallet address

### Security
- [ ] Audit environment variables (no secrets in code)
- [ ] Enable Supabase RLS policies
- [ ] Test payment flow with real USDC
- [ ] Verify escrow wallet has gas funds
- [ ] Review error messages (no sensitive info leaked)

### Performance
- [ ] Test with 100+ agents in registry
- [ ] Verify classification speed (<100ms)
- [ ] Check database query performance
- [ ] Test concurrent task handling

### Monitoring
- [ ] Set up error logging
- [ ] Configure payment notifications
- [ ] Add health check endpoint
- [ ] Monitor wallet balances

### Documentation
- [ ] Update README with production URLs
- [ ] Document deployment process
- [ ] Create troubleshooting guide
- [ ] Write API documentation

---

## Automated Testing Script

Create `test-all.sh`:

```bash
#!/bin/bash
set -e

echo "🧪 Running agentmarket test suite"
echo "================================="

echo "\n1️⃣ Type checking..."
npm run typecheck

echo "\n2️⃣ Building project..."
npm run build

echo "\n3️⃣ Testing database connection..."
node test-supabase.js

echo "\n4️⃣ Testing classification..."
node test-classifier.js

echo "\n5️⃣ Testing registry..."
node test-registry.js

echo "\n6️⃣ Testing wallet (if CDP credentials available)..."
if [ -f "cdp_api_key.json" ]; then
  node test-coinbase.js
else
  echo "⚠️  Skipped (no CDP credentials)"
fi

echo "\n7️⃣ Testing user flow simulation..."
node test-user-flow.js

echo "\n✅ All tests passed!"
```

Make executable and run:
```bash
chmod +x test-all.sh
./test-all.sh
```

---

## Continuous Testing

### Watch mode (development):
```bash
npm run dev
# Auto-rebuilds on file changes
```

### Pre-commit hook:
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
npm run typecheck || exit 1
npm run build || exit 1
node test-supabase.js || exit 1
```

---

## Troubleshooting Common Issues

### "Module not found"
```bash
# Rebuild project
rm -rf dist/
npm run build
```

### "Cannot find .env file"
```bash
# Check file exists
ls -la .env

# Copy from example
cp .env.example .env
```

### "Supabase connection failed"
```bash
# Test connection manually
curl $SUPABASE_URL/rest/v1/agents \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### "Wallet creation failed"
```bash
# Verify CDP credentials
cat cdp_api_key.json

# Check API status
curl https://api.cdp.coinbase.com/health
```

---

## Performance Benchmarks

Expected performance (approximate):

| Operation | Target | Typical |
|-----------|--------|---------|
| Classification | <100ms | ~50ms |
| Registry fetch | <200ms | ~150ms |
| Wallet creation | <5s | ~2-3s |
| USDC transfer | <30s | ~10-15s |
| MCP tool call | <500ms | ~300ms |

Run benchmarks:
```bash
node test-benchmarks.js
```

---

## Test Coverage Goals

- ✅ Unit tests: Core functions
- ✅ Integration tests: MCP + Database
- ⚠️ E2E tests: Full user flows (manual)
- ❌ Load tests: Not implemented yet
- ❌ Security tests: Not implemented yet

---

**Next Steps:**
- Implement automated E2E tests
- Add load testing with k6
- Set up CI/CD pipeline
- Add security scanning (npm audit, Snyk)

---

Last updated: March 15, 2026
