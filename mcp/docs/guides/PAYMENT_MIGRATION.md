# Payment System Migration Guide

**From:** Custom Escrow System  
**To:** Simplified Payment Handler with HTTP 402 Support  
**Date:** March 15, 2026  
**Version:** 0.1.0 → 0.1.1

---

## What Changed

### Before (Deprecated ❌)
- Complex escrow system with lock/release/refund
- Manual payment lifecycle management
- Separate escrow wallet required
- 200+ lines of complex logic in `escrow.ts`

### After (New ✅)
- Direct USDC transfers via CDP AgentKit
- Simplified payment handler
- Automatic fee splitting
- HTTP 402 payment middleware support
- ~100 lines of clean, maintainable code

---

## Breaking Changes

**None!** The old escrow functions are deprecated but still work for backward compatibility.

---

## Migration Steps

### For New Projects

Use the new `PaymentHandler`:

```typescript
import { PaymentHandler } from './payments/payment-handler.js';

const handler = new PaymentHandler(process.env.PLATFORM_WALLET_ADDRESS);

// Process payment directly
const result = await handler.handlePayment(
  payerWallet,
  1.50,  // amount in USDC
  recipientAddress
);

console.log('Success:', result.success);
console.log('Transaction:', result.transactionHash);
console.log('Recipient got:', result.recipientAmount);
console.log('Platform fee:', result.platformFee);
```

### For Existing Projects

Your existing code still works:

```typescript
// Old way (still works, but deprecated)
import { lockPayment, releasePayment } from './payments/escrow.js';

// WARNING: These will log deprecation warnings
await lockPayment(wallet, amount, escrowAddress);
await releasePayment(escrowWallet, amount, specialistAddress);
```

**Recommended:** Migrate to `PaymentHandler` when convenient.

---

## New Features

### 1. HTTP 402 Payment Middleware

Enable payment requirements on your HTTP endpoints:

```typescript
import express from 'express';
import { createPaymentMiddleware } from './payments/payment-handler.js';

const app = express();

// Require payment for API access
app.use('/api', createPaymentMiddleware({
  platformWallet: process.env.PLATFORM_WALLET_ADDRESS,
  pricePerRequest: 0.01  // 0.01 USDC per request
}));

// Protected endpoint
app.post('/api/task', (req, res) => {
  // Only accessible after payment
  res.json({ status: 'Task accepted' });
});
```

### 2. Payment Verification

```typescript
import { verifyPayment } from './payments/payment-handler.js';

const isValid = await verifyPayment(
  recipientWallet,
  expectedAmount,
  transactionHash
);
```

### 3. Calculate Fees Before Payment

```typescript
const handler = new PaymentHandler();
const split = handler.calculateSplit(1.50);

console.log('Recipient will get:', split.recipientAmount);  // 1.425 USDC
console.log('Platform fee:', split.platformFee);            // 0.075 USDC
```

---

## HTTP Server with Payments

### Start HTTP Server

```bash
npx agentmarket http-server
```

### Enable Payment Requirement

```bash
# In .env
PRICE_PER_REQUEST=0.01
PLATFORM_WALLET_ADDRESS=0x...

# Restart server
npx agentmarket http-server
```

Now all requests to `/mcp` will require payment proof.

### Test Payment Requirement

```bash
# Without payment - gets 402
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"agentmarket_scan","arguments":{"query":"test"}}}'

# Response:
{
  "error": "Payment Required",
  "amount": 0.01,
  "currency": "USDC",
  "network": "Base",
  "recipientAddress": "0x..."
}

# With payment proof - processes request
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-Payment-Proof: tx_hash_here" \
  -d '{"method":"tools/call",...}'
```

---

## Environment Variables

### New Variables

```bash
# Platform wallet for collecting fees
PLATFORM_WALLET_ADDRESS=0x...

# HTTP server port
PORT=3000

# Payment per request (0 = free)
PRICE_PER_REQUEST=0
```

### Removed Variables

```bash
# No longer needed
ESCROW_WALLET_ADDRESS=  # Direct transfers eliminate escrow need
```

---

## Code Examples

### Before (Escrow System)

```typescript
// Complex escrow flow
const escrowWallet = await loadWallet(escrowId, seed);
const payment = new TaskPayment(taskId, amount, requesterAddr, specialistAddr);

await payment.initEscrow(walletId, seed);
await payment.lock(requesterWallet, escrowAddress);

// ... task processing ...

await payment.release();
const status = payment.getStatus();
```

### After (Payment Handler)

```typescript
// Simple direct payment
const handler = new PaymentHandler(platformWallet);
const result = await handler.handlePayment(
  requesterWallet,
  amount,
  specialistAddress
);

if (result.success) {
  console.log('Payment completed:', result.transactionHash);
}
```

**Lines of code:** 10+ lines → 5 lines  
**Complexity:** High → Low  
**Error surface:** Large → Small

---

## Benefits

### ✅ Simplicity
- Fewer moving parts
- Easier to understand
- Less maintenance

### ✅ Security
- No escrow wallet to secure
- Direct CDP transfers
- Battle-tested Coinbase infrastructure

### ✅ Standard Compliance
- HTTP 402 is a web standard
- Payment proof in headers
- Compatible with future payment systems

### ✅ Flexibility
- Easy to add payment features
- Middleware pattern for extensibility
- Works with any Express app

---

## Testing

### Test New Payment Handler

```bash
node -e "
import { PaymentHandler } from './dist/payments/payment-handler.js';

const handler = new PaymentHandler();

// Test fee calculation
const split = handler.calculateSplit(1.00);
console.log('Amount: \$1.00');
console.log('Recipient: \$' + split.recipientAmount.toFixed(2));
console.log('Platform: \$' + split.platformFee.toFixed(2));
console.log('Fee rate: ' + (handler.getPlatformFee() * 100) + '%');
"
```

### Test HTTP Server

```bash
# Start server
PORT=3000 npx agentmarket http-server

# In another terminal - test health
curl http://localhost:3000/health

# Test MCP endpoint
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

## Deprecation Timeline

### v0.1.1 (Current)
- ✅ New `PaymentHandler` available
- ⚠️ Old escrow functions deprecated (warnings shown)
- ✅ Backward compatibility maintained

### v0.2.0 (Next)
- ⚠️ Escrow functions marked for removal
- 📚 Migration guide prominent in docs

### v1.0.0 (Future)
- ❌ Escrow functions removed
- ✅ Only `PaymentHandler` available

---

## Need Help?

- **Documentation:** [docs/api/PAYMENT_API.md](../api/PAYMENT_API.md) (coming soon)
- **Examples:** [docs/development/WORKFLOWS.md](../development/WORKFLOWS.md)
- **Issues:** Create an issue in the repository

---

## Summary

**Do this:**
```typescript
✅ import { PaymentHandler } from './payments/payment-handler.js';
✅ const handler = new PaymentHandler();
✅ await handler.handlePayment(wallet, amount, recipient);
```

**Not this:**
```typescript
❌ import { TaskPayment } from './payments/escrow.js';
❌ const payment = new TaskPayment(...);
❌ await payment.initEscrow(...);
```

---

*Migration complete! Enjoy simpler, more secure payments.* 💰✨
