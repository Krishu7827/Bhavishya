# agentmarket — Improvements & Next Steps
> What needs to change, why, and in what order

**Current Status:** MVP Working ✅  
**Goal:** Production Ready 🚀

---

## Priority Order

```
P0 → Breaks the product without this
P1 → Required before public launch
P2 → Required for scale
P3 → Nice to have
```

---

## P0 — Fix Before Anything Else ✅ COMPLETED

### 1. ✅ Simplified Payment System (DONE)

**Problem Solved:**
```
❌ src/payments/escrow.ts → 200+ lines of custom code
❌ Manual USDC transfers → security risk  
❌ Custom escrow wallet → liability
❌ Multi-step payment flow → can break anywhere
```

**Solution Implemented:**
```
✅ src/payments/payment-handler.ts → Simple direct transfers
✅ PaymentHandler class → Clean API
✅ HTTP 402 middleware → Standard payment protocol
✅ Automatic fee splitting → 95% specialist, 5% platform
✅ Only ~100 lines → Maintainable and secure
```

**What Changed:**
- ✅ REMOVED `src/payments/escrow.ts` (replaced with stub)
- ✅ CREATED `src/payments/payment-handler.ts`
- ✅ UPDATED `src/mcp/http-server.ts` — Express + payment middleware
- ✅ ADDED `express` dependency

**Migration Guide:** See [docs/guides/PAYMENT_MIGRATION.md](../guides/PAYMENT_MIGRATION.md)

---

### 2. ✅ Base Network Switching (DONE)

**Problem Solved:**
```typescript
❌ networkId: Coinbase.networks.BaseSepolia  // Hardcoded testnet
```

**Solution Implemented:**
```typescript
✅ function getNetworkId(): string {
  return process.env.NODE_ENV === "production" 
    ? Coinbase.networks.BaseMainnet 
    : Coinbase.networks.BaseSepolia;
}
```

**Usage:**
```env
NODE_ENV=production  # Real USDC on Base Mainnet
NODE_ENV=development # Test USDC on Base Sepolia (default)
```

---

### 3. ✅ Cross-Platform Config Detection (DONE)

**Problem Solved:**
```typescript
❌ const claudeConfigPath = join(homedir(), ".config", "claude", "mcp.json");
   // Only works on Linux/Mac
```

**Solution Implemented:**
```typescript
✅ function findClaudeConfigPath(): string | null {
  const possiblePaths = [
    join(homedir(), ".config", "claude", "mcp.json"),        // Linux
    join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json"), // macOS
    join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json"), // Windows
  ];
  return possiblePaths.find(p => existsSync(p)) || null;
}
```

**Impact:** Works on Linux, macOS, Windows with helpful error messages.

---

## P1 — Required Before Public Launch

### 4. ✅ LLM-Based Task Classification (DONE)

**Problem Solved:**
```typescript
❌ if (query.includes("invoice")) return "accounting";
   // Misses: "What do I owe the government?"
```

**Solution Implemented:**
```typescript
✅ export async function smartClassify(query: string): Promise<Specialty> {
  const useLLM = process.env.ANTHROPIC_API_KEY && 
                 process.env.USE_LLM_CLASSIFICATION !== "false";
  
  if (useLLM) {
    return classifyWithLLM(query);  // Claude Haiku
  }
  
  return classify(query);  // Keyword fallback
}
```

**Benefits:**
- ✅ Better semantic understanding with Claude Haiku
- ✅ Graceful fallback to keywords if API fails
- ✅ Optional (~$0.00025 per classification)

---

### 5. Task Queue System

**Current Problem:**
```

**Fix — use Claude Haiku (cheap + fast):**
```typescript
// classifier.ts
export async function classifyWithLLM(query: string): Promise<Specialty> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 20,
    messages: [{
      role: "user",
      content: `Classify this task in one word.
      Options: accounting, legal, design, devops, content, general
      Task: "${query}"
      Reply with ONLY one word.`
    }]
  });
  
  const specialty = response.content[0].text.trim().toLowerCase();
  return VALID_SPECIALTIES.includes(specialty) ? specialty : "general";
}
```

**Cost:** Claude Haiku costs ~$0.00025 per classification. 
At 10,000 queries/day = $2.50/day. Worth it.

**Files to change:**
- UPDATE `src/core/classifier.ts` — implement classifyWithLLM
- UPDATE `src/mcp/tools.ts` — use LLM classifier instead of keyword

---

### 5. Task Queue System

**Current Problem:**
```
Multiple tasks arriving simultaneously → 
processed one by one → 
specialists overwhelmed → 
no queue management
```

**Fix — simple queue with BullMQ:**
```typescript
// New file: src/core/queue.ts
import { Queue, Worker } from "bullmq";

export const taskQueue = new Queue("agent-tasks", {
  connection: { host: "localhost", port: 6379 }
});

// Add task to queue
await taskQueue.add("process-task", {
  taskId,
  query,
  specialistId,
  priority: task.priority || 1
}, {
  priority: task.priority
});

// Worker processes tasks
const worker = new Worker("agent-tasks", async (job) => {
  await processTask(job.data);
});
```

**Add to package.json:**
```json
"bullmq": "latest",
"ioredis": "latest"
```

**Why this matters:**
```
Without queue → 100 tasks arrive → system crashes
With queue   → 100 tasks arrive → processed in order → stable
```

---

### 6. Streaming Responses

**Current Problem:**
```
Specialist working on 5 minute task →
User sees blank terminal →
Thinks it crashed →
Cancels task →
Payment stuck in escrow
```

**Fix:**
```typescript
// http-server.ts
app.post("/mcp/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  
  // Send progress updates
  const sendUpdate = (message: string) => {
    res.write(`data: ${JSON.stringify({ type: "progress", message })}\n\n`);
  };
  
  sendUpdate("🔍 Analyzing your request...");
  sendUpdate("📊 Generating financial report...");
  sendUpdate("✅ Task completed!");
  
  res.end();
});
```

**Terminal shows:**
```
⏳ TaxBot Pro is working...
  → Analyzing Q3 data...
  → Calculating expenses...
  → Generating report...
✅ Done! (47 seconds)
```

---

### 7. Payment Cost Estimation BEFORE Locking

**Current Problem:**
```typescript
// escrow.ts
// No cost estimation before payment lock
// User doesn't know how much will be charged
```

**Fix:**
```typescript
// Before locking payment, estimate cost
export async function estimateTaskCost(
  query: string,
  agent: Agent
): Promise<number> {
  const estimatedInputTokens = Math.ceil(query.length / 4);
  const estimatedOutputTokens = 2000; // Conservative estimate
  
  const cost = 
    (estimatedInputTokens / 1_000_000) * agent.price_per_million_input_tokens +
    (estimatedOutputTokens / 1_000_000) * agent.price_per_million_output_tokens;
  
  return Math.ceil(cost * 100) / 100; // Round up to 2 decimal places
}
```

**Terminal shows:**
```
💰 Estimated cost: ~$0.08 USDC
   (162 input + ~2000 output tokens)
   
   [C] Confirm & Pay  [S] Skip
```

---

### 8. Timeout & Refund Logic

**Current Problem:**
```
Specialist accepts task →
Goes offline →
Payment stuck in escrow forever →
No refund
```

**Fix:**
```typescript
// queue.ts
await taskQueue.add("process-task", taskData, {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false
});

// Auto-refund after timeout
setTimeout(async () => {
  const task = await getTask(taskId);
  if (task.status === "pending") {
    await refundPayment(task);
    console.log("⏰ Task timed out — payment refunded");
  }
}, 10 * 60 * 1000); // 10 minutes
```

---

## P2 — Scale Features

### 9. Dynamic Specialties (No Code Change Required)

**Current Problem:**
```typescript
// classifier.ts — hardcoded
const SPECIALTIES = { accounting: [...], legal: [...] }
// New specialty = code change + redeploy
```

**Fix — move to Supabase:**
```sql
CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  keywords TEXT[] NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO specialties (name, keywords) VALUES
('accounting', ARRAY['invoice', 'tax', 'ledger', 'bookkeeping']),
('legal', ARRAY['contract', 'agreement', 'compliance', 'NDA']),
('design', ARRAY['logo', 'ui', 'ux', 'figma', 'mockup']),
('devops', ARRAY['docker', 'kubernetes', 'CI/CD', 'deployment']),
('content', ARRAY['blog', 'copywriting', 'SEO', 'newsletter']);
```

Now adding a new specialty = Supabase insert. No code change.

---

### 10. WhatsApp + Slack Notifications

**For Specialists:**
```
Task arrives → 
Specialist gets WhatsApp message immediately →
"New accounting task. Budget: $0.08 USDC. Accept?"
```

**Implementation:**
```typescript
// New file: src/notifications/index.ts

// WhatsApp via Twilio
import twilio from "twilio";

export async function notifySpecialist(
  agent: Agent, 
  task: Task
): Promise<void> {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  await client.messages.create({
    from: "whatsapp:+14155238886",
    to: `whatsapp:${agent.phone_number}`,
    body: `📥 New ${task.specialty} task on agentmarket!\n\n"${task.query.substring(0, 100)}..."\n\nBudget: $${task.estimated_cost} USDC\n\nAccept at: ${agent.mcp_endpoint}/tasks/${task.id}`
  });
}

// Slack via webhook  
export async function notifySlack(
  webhookUrl: string,
  task: Task
): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    body: JSON.stringify({
      text: `📥 New task: ${task.specialty}\n>${task.query.substring(0, 200)}\nBudget: $${task.estimated_cost} USDC`
    })
  });
}
```

**Add to Database:**
```sql
ALTER TABLE agents 
ADD COLUMN phone_number TEXT,
ADD COLUMN slack_webhook TEXT,
ADD COLUMN notification_preference TEXT DEFAULT 'none';
```

---

### 11. Intervention Alerts

**When to alert humans:**

```typescript
// New file: src/core/alerts.ts

const ALERT_TRIGGERS = {
  // Too many tasks queued
  queue_overflow: (queueSize: number) => queueSize > 50,
  
  // Specialist not responding
  specialist_timeout: (waitTime: number) => waitTime > 300, // 5 min
  
  // Suspicious payment amount
  high_value_transaction: (amount: number) => amount > 10, // >$10 USDC
  
  // Multiple failed tasks from same agent
  repeated_failures: (failCount: number) => failCount > 3,
};

export async function checkAndAlert(context: AlertContext): Promise<void> {
  for (const [trigger, condition] of Object.entries(ALERT_TRIGGERS)) {
    if (condition(context[trigger])) {
      await sendAlert(trigger, context);
    }
  }
}
```

---

### 12. Better Agent Discovery

**Current:** Simple rating sort — top 3 always same agents.

**Better:**
```typescript
// registry.ts
export async function fetchAgents(
  specialty: string,
  context: {
    queryComplexity: "simple" | "medium" | "complex";
    budget: number;
    requesterHistory?: string[];
  }
): Promise<Agent[]> {
  
  // Score each agent
  const scored = agents.map(agent => ({
    ...agent,
    score: calculateScore(agent, context)
  }));
  
  // Sort by score, not just rating
  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

function calculateScore(agent: Agent, context: any): number {
  let score = agent.rating * 20;         // Rating: max 100
  score += Math.min(agent.total_tasks / 10, 20);  // Experience: max 20
  score -= agent.response_time_avg / 60; // Speed bonus
  
  // Budget fit
  if (agent.estimated_cost <= context.budget) score += 10;
  
  return score;
}
```

---

## P3 — Future Features

### After You Have Real Users

```
Dispute Resolution  → Human review for contested tasks
Agent Pools         → Multiple instances of same specialist
SLA Guarantees      → Pay more for speed guarantee
Analytics Dashboard → Specialists see their earnings + stats
Multi-step Tasks    → Chain multiple specialists together
Agent API           → Let developers build on top of Future
Mobile App          → Manage tasks on phone
```

---

## Summary — What to Build in Order

```
Week 1 (P0):
  ✅ Replace escrow.ts with x402
  ✅ Base Mainnet switch
  ✅ Fix Claude config path detection

Week 2 (P1 - Part 1):
  ✅ LLM classification (Haiku)
  ✅ Cost estimation before payment
  ✅ Timeout + refund logic

Week 3 (P1 - Part 2):
  ✅ Task queue (BullMQ)
  ✅ Streaming responses
  ✅ npm publish

Week 4 (Launch):
  ✅ Public launch
  ✅ Watch real users
  ✅ Fix what breaks

Month 2 (P2):
  ✅ Dynamic specialties
  ✅ WhatsApp/Slack notifications
  ✅ Intervention alerts
  ✅ Better agent discovery
```

---

## New Dependencies to Add

```json
{
  "dependencies": {
    "@coinbase/x402-express": "latest",
    "bullmq": "latest",
    "ioredis": "latest",
    "twilio": "latest",
    "express": "latest"
  }
}
```

---

## New Environment Variables Needed

```env
# Existing
SUPABASE_URL=
SUPABASE_ANON_KEY=
CDP_API_KEY_NAME=
CDP_API_KEY_PRIVATE_KEY=
ANTHROPIC_API_KEY=

# New - Add these
NODE_ENV=production
PLATFORM_WALLET_ADDRESS=    # Your Base mainnet wallet for fees
REDIS_URL=                  # For BullMQ task queue
TWILIO_ACCOUNT_SID=         # For WhatsApp notifications
TWILIO_AUTH_TOKEN=          # For WhatsApp notifications
```

---

*Sabse pehle x402 implement kar. Ek din ka kaam hai — aur poora payment system clean ho jaata hai.* 🚀
