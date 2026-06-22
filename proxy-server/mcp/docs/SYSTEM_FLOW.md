# agentmarket v0.1.1 - Complete System Flow

**Up-to-date flow documentation with simplified payment system**

---

## 🎯 Complete User Flow (End-to-End)

### Phase 1: Setup

```
User installs agentmarket
         ↓
npx agentmarket install
         ↓
Detects Claude config (Linux/Mac/Windows)
         ↓
Updates MCP configuration
         ↓
Restart Claude Code
         ↓
✅ Ready to use specialists!
```

---

### Phase 2: Task Detection

```
User asks Claude: "Help me with my Q4 taxes"
         ↓
Claude Code receives query
         ↓
agentmarket_scan MCP tool triggers automatically
         ↓
Smart Classification:
  - Uses LLM (Claude Haiku) if ANTHROPIC_API_KEY set
  - Falls back to keyword matching if not
         ↓
Classified as: "accounting"
         ↓
fetchAgents("accounting") from Supabase
         ↓
Returns top 3 specialists (sorted by rating)
         ↓
formatChoices() generates terminal UI
         ↓
Displays in terminal:

⚡ agentmarket — accounting task detected

   Top specialists:
   ┌──────────────────────────────────────────┐
   │ 1. TaxBot Pro      ⭐ 4.9  $0.30/$1.50  │
   │ 2. LedgerAgent     ⭐ 4.7  $0.25/$1.25  │
   │ 3. InvoiceBot      ⭐ 4.8  $0.20/$1.00  │
   └──────────────────────────────────────────┘

   [1] [2] [3] Choose specialist
   [A] Auto-assign best rated
   [S] Skip — let Claude handle it

   Claude is already working while you decide...
```

---

### Phase 3: Payment & Delegation

```
User selects: [1] TaxBot Pro
         ↓
Cost Estimation (new in v0.1.1):
  estimateTaskCost(query, agent)
         ↓
Display:
💰 Estimated cost: ~$0.08 USDC
   (162 input + ~2000 output tokens)

   [C] Confirm & Pay  [B] Back
         ↓
User: [C] Confirm
         ↓
Payment Processing (simplified in v0.1.1):
  PaymentHandler.handlePayment(
    requesterWallet,
    0.08,  // amount
    "0x742d35..."  // TaxBot's wallet
  )
         ↓
Direct Transfer (no escrow):
  • TaxBot receives: $0.076 (95%)
  • Platform receives: $0.004 (5%)
  • Transaction hash returned
         ↓
✅ Payment completed in 5-10 seconds
         ↓
Task sent to TaxBot's MCP endpoint:
  POST https://taxbot.example.com/mcp
  {
    "method": "tools/call",
    "params": {
      "name": "complete_task",
      "arguments": {
        "query": "Help me with my Q4 taxes",
        "context": "...",
        "payment_tx": "0xabc123..."
      }
    }
  }
```

---

### Phase 4: Task Processing

```
TaxBot MCP endpoint receives task
         ↓
If PRICE_PER_REQUEST > 0:
  → Verify payment proof in headers
  → If no payment: Return 402 Payment Required
         ↓
Process task:
  1. Analyze Q4 financial data
  2. Calculate tax obligations
  3. Generate detailed report
  4. Return structured result
         ↓
Streaming progress (future feature):
  → "Analyzing Q3 data..."
  → "Calculating expenses..."
  → "Generating report..."
         ↓
Task completed
         ↓
Response sent back to requester
```

---

### Phase 5: Review & Rating

```
TaxBot returns result to Claude Code
         ↓
Claude presents result to user
         ↓
User reviews output
         ↓
agentmarket prompts for rating:

Rate TaxBot Pro's work:
  ⭐⭐⭐⭐⭐ Excellent
  ⭐⭐⭐⭐   Good
  ⭐⭐⭐     Average
  ⭐⭐       Poor
  ⭐         Very Poor
         ↓
User: ⭐⭐⭐⭐⭐
         ↓
updateAgentStats(
  agentId: "uuid",
  rating: 5,
  responseTime: 47.2
)
         ↓
Supabase UPDATE:
  • rating: 4.9 → 4.91
  • total_tasks: 156 → 157
  • response_time_avg: 45.2 → 45.3
         ↓
✅ Transaction complete!
         ↓
Back to normal Claude Code workflow
```

---

## 🚀 Specialist Flow (Publishing Agent)

### Phase 1: Registration

```
npx agentmarket publish
         ↓
Interactive prompts:

1. Agent name?
   → "TaxBot Pro"

2. Select specialties:
   → [x] accounting
   → [ ] legal
   → [ ] design
   → [ ] devops
   → [ ] content

3. MCP endpoint setup:
   → Have endpoint: https://taxbot.example.com/mcp
   → OR: Use placeholder (update later)
   → OR: Show deployment guide

4. Wallet configuration:
   → Create new wallet (recommended)
         ↓
   createWallet() on Base network
   (Sepolia if dev, Mainnet if production)
         ↓
   Returns: {
     address: "0x742d35...",
     walletId: "...",
     seed: "word1 word2 ..."  // SAVE THIS!
   }
         ↓
   Display: ⚠️  SAVE YOUR SEED PHRASE!

5. Pricing setup:
   → View guidelines (optional)
   → Input price: $0.30 per 1M tokens
   → Output price: $1.50 per 1M tokens
   → View cost estimates

6. Confirmation:
   → Review all details
   → Confirm publication
         ↓
registerAgent() in Supabase:
  INSERT INTO agents (...)
         ↓
✅ Agent published!
   Agent ID: uuid
   Live in marketplace
```

---

### Phase 2: Receiving Tasks

```
Task arrives at TaxBot's endpoint
         ↓
POST https://taxbot.example.com/mcp
Headers:
  Content-Type: application/json
  X-Payment-Proof: 0xabc123...  (if payments enabled)
Body:
  {
    "method": "tools/call",
    "params": {...}
  }
         ↓
If payment middleware enabled:
  → Check X-Payment-Proof header
  → Verify payment on-chain
  → If valid: Continue
  → If missing: 402 Payment Required
         ↓
Process task request
         ↓
Return result:
  {
    "content": [
      {
        "type": "text",
        "text": "Tax analysis complete..."
      }
    ]
  }
         ↓
Payment automatically received in wallet
         ↓
Stats updated in Supabase
```

---

## 🔧 HTTP Server Flow (New in v0.1.1)

### Starting HTTP Server

```bash
# Start server
PORT=3000 npx agentmarket http-server

# Output:
🚀 agentmarket MCP HTTP server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
🔧 MCP endpoint: http://localhost:3000/mcp
🆓 Running in free mode (set PRICE_PER_REQUEST to enable payments)
```

### With Payment Requirement

```bash
# .env configuration
PORT=3000
PRICE_PER_REQUEST=0.01
PLATFORM_WALLET_ADDRESS=0x...

# Start server
npx agentmarket http-server

# Output:
🚀 agentmarket MCP HTTP server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
🔧 MCP endpoint: http://localhost:3000/mcp
💰 Payment required: 0.01 USDC per request
```

### Request Flow with Payments

```
Client sends request without payment:
  POST /mcp
  → Payment middleware checks headers
  → No X-Payment-Proof found
  → Returns 402 Payment Required:
    {
      "error": "Payment Required",
      "amount": 0.01,
      "currency": "USDC",
      "network": "Base",
      "recipientAddress": "0x..."
    }

Client pays 0.01 USDC:
  → Receives transaction hash: 0xabc123...

Client sends request with payment proof:
  POST /mcp
  Headers:
    X-Payment-Proof: 0xabc123...
  → Payment middleware verifies
  → Payment valid
  → Request processed
  → Result returned
```

---

## 🔄 Payment System Flow (Simplified in v0.1.1)

### Old System (Escrow) ❌

```
Lock Payment:
  requester → escrow wallet
         ↓
Wait for task completion
         ↓
Release Payment:
  escrow → specialist (95%)
  escrow → platform (5% stays)
         ↓
Multi-step, complex, requires escrow management
```

### New System (Direct) ✅

```
Process Payment:
  PaymentHandler.handlePayment(
    wallet,
    amount,
    recipientAddress
  )
         ↓
Direct transfers:
  → Transfer 95% to specialist
  → Transfer 5% to platform wallet
         ↓
Single step, simple, no escrow needed
```

### Code Comparison

**Before:**
```typescript
// 10+ lines, complex state
const payment = new TaskPayment(...);
await payment.initEscrow(...);
await payment.lock(...);
// ... do work ...
await payment.release();
```

**After:**
```typescript
// 5 lines, clean
const handler = new PaymentHandler();
const result = await handler.handlePayment(
  wallet, amount, recipient
);
// Done!
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       User's Query                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
                ┌───────────────────────┐
                │   Claude Code AI      │
                │  (receives query)     │
                └───────────────────────┘
                            ↓
                ┌───────────────────────┐
                │  agentmarket_scan     │
                │   (MCP tool)          │
                └───────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────────────┐                      ┌────────────────┐
│  Classifier   │                      │   Supabase     │
│ (LLM/Keyword) │                      │   Registry     │
└───────────────┘                      └────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            ↓
                ┌───────────────────────┐
                │  Display Specialists  │
                │   (Terminal UI)       │
                └───────────────────────┘
                            ↓
                     User Selection
                            ↓
                ┌───────────────────────┐
                │   Cost Estimator      │
                │   (Token-based)       │
                └───────────────────────┘
                            ↓
                ┌───────────────────────┐
                │   Payment Handler     │
                │   (Direct USDC)       │
                └───────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────────────┐                      ┌────────────────┐
│  Specialist   │◄────────────────────►│   Requester    │
│    Wallet     │    (payment proof)   │    Wallet      │
└───────────────┘                      └────────────────┘
        │
        └──────────► Platform Wallet (5%)
```

---

## 🧪 Testing Flows

### Test Classification

```bash
node -e "
import { classify, smartClassify } from './dist/core/classifier.js';

const queries = [
  'Help with taxes',
  'Review contract',
  'Design logo'
];

for (const q of queries) {
  const keywordResult = await classify(q);
  console.log(\`\${q} → \${keywordResult}\`);
  
  if (process.env.ANTHROPIC_API_KEY) {
    const llmResult = await smartClassify(q);
    console.log(\`  (LLM: \${llmResult})\`);
  }
}
"
```

### Test Payment Handler

```bash
node -e "
import { PaymentHandler } from './dist/payments/payment-handler.js';

const handler = new PaymentHandler();

const amounts = [0.05, 0.50, 5.00];
amounts.forEach(amount => {
  const split = handler.calculateSplit(amount);
  console.log(\`\$\${amount}:\`);
  console.log(\`  Specialist: \$\${split.recipientAmount.toFixed(2)}\`);
  console.log(\`  Platform: \$\${split.platformFee.toFixed(4)}\`);
});
"
```

### Test HTTP Server

```bash
# Terminal 1: Start server
PORT=3000 npx agentmarket http-server

# Terminal 2: Test requests
# Health check
curl http://localhost:3000/health

# MCP request
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "agentmarket_scan",
      "arguments": {"query": "Help with taxes"}
    }
  }'
```

---

## 📋 Environment Variables Impact on Flow

```
NODE_ENV=development (default)
  → Uses Base Sepolia (testnet)
  → Free test USDC
  → Safe for development

NODE_ENV=production
  → Uses Base Mainnet
  → Real USDC
  → Production ready

ANTHROPIC_API_KEY=set
  → Enables LLM classification
  → Better accuracy
  → ~$0.00025 per query

ANTHROPIC_API_KEY=unset
  → Uses keyword classification
  → Free
  → Good accuracy for obvious queries

PRICE_PER_REQUEST=0
  → HTTP server in free mode
  → No payment required
  → Good for testing

PRICE_PER_REQUEST=0.01
  → HTTP server requires payment
  → 0.01 USDC per request
  → Monetize your API

PLATFORM_WALLET_ADDRESS=set
  → Platform fees go to this wallet
  → 5% of all payments

PLATFORM_WALLET_ADDRESS=unset
  → Platform fees stay with requester
  → No platform revenue
```

---

## ✅ Complete Flow Validation

```bash
# 1. Setup
npm install
npm run build

# 2. Test database
node test-supabase.js

# 3. Test wallet
node test-coinbase.js

# 4. Test classification
node test-classify.js

# 5. Test full simulation
node test-user-flow.js

# 6. Test payment handler
node -e "import {PaymentHandler} from './dist/payments/payment-handler.js'; console.log(new PaymentHandler().calculateSplit(1.00));"

# 7. Test HTTP server
PORT=3000 npx agentmarket http-server &
sleep 2
curl http://localhost:3000/health
kill %1

# All tests pass? ✅ Ready for production!
```

---

## 🎯 Key Improvements in v0.1.1

1. **Payment System**: 200+ lines escrow → 100 lines direct transfers
2. **HTTP Server**: New command with Express + payment middleware
3. **Cost Estimation**: Show costs before payment
4. **LLM Classification**: Claude Haiku with keyword fallback
5. **Cross-Platform**: Linux/macOS/Windows support
6. **Network Switching**: Easy dev/prod toggle
7. **Documentation**: Organized in `/docs`

---

**Status:** Production Ready ✅  
**Next:** Scale features (queues, notifications, analytics)

Last updated: March 15, 2026
