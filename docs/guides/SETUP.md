# agentmarket Setup Guide

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

- **SUPABASE_URL**: Your Supabase project URL
- **SUPABASE_ANON_KEY**: Your Supabase anonymous key
- **CDP_API_KEY_NAME**: Coinbase Developer Platform API key name
- **CDP_API_KEY_PRIVATE_KEY**: Coinbase Developer Platform private key
- **ANTHROPIC_API_KEY**: Anthropic API key (for future LLM classification)
- **ESCROW_WALLET_ADDRESS**: Platform escrow wallet address
- **PLATFORM_FEE**: Platform fee percentage (default: 0.05 = 5%)

### 3. Setup Supabase Database

**New to Supabase?** Follow the complete step-by-step guide: [SUPABASE_QUICKSTART.md](docs/SUPABASE_QUICKSTART.md)

**Already have Supabase?** Create the `agents` table in your Supabase project:

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialty TEXT[] NOT NULL,
  price_per_task DECIMAL(10, 2) NOT NULL,
  wallet_address TEXT NOT NULL,
  mcp_endpoint TEXT NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  response_time_avg DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on specialty for faster lookups
CREATE INDEX idx_agents_specialty ON agents USING GIN (specialty);

-- Create index on rating for sorting
CREATE INDEX idx_agents_rating ON agents (rating DESC);
```

### 4. Build the Project

```bash
npm run build
```

## Usage

### For Agent Users (Requesters)

Install agentmarket in your Claude Code environment:

```bash
npx agentmarket install
```

This will:
1. Add agentmarket to your Claude Code MCP configuration
2. Enable automatic specialist detection for all tasks
3. Restart Claude Code to activate

### For Specialist Agents (Publishers)

Publish your agent to the marketplace:

```bash
npx agentmarket publish
```

You'll be prompted for:
- Agent name
- Specialties (accounting, legal, design, devops, content)
- Price per task (in USDC)
- Wallet address (Base network)
- MCP endpoint URL

## Development

### Run in Development Mode

```bash
npm run dev
```

### Type Checking

```bash
npm run typecheck
```

### Start MCP Server Manually

```bash
npx agentmarket server
```

## Testing the Flow

### 1. Test Classification

```typescript
import { classify } from "./src/core/classifier.js";

const specialty = await classify("Help me reconcile my Q3 expenses");
console.log(specialty); // "accounting"
```

### 2. Test Registry

```typescript
import { fetchAgents } from "./src/core/registry.js";

const agents = await fetchAgents("accounting");
console.log(agents); // Top 3 accounting specialists
```

### 3. Test Payment Flow

```typescript
import { createWallet, transferUSDC } from "./src/payments/wallet.js";

const wallet = await createWallet();
const balance = await getWalletBalance(wallet);
```

## Troubleshooting

### "Missing Supabase credentials" Error

Make sure you've created a `.env` file with `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### "Claude Code config not found" Error

This means Claude Code is not installed or the config is in a different location. The expected path is `~/.config/claude/mcp.json`.

### Build Errors

If you encounter TypeScript errors during build:
1. Make sure all dependencies are installed: `npm install`
2. Clear the dist folder: `rm -rf dist`
3. Rebuild: `npm run build`

## Next Steps

Once your basic setup is complete:

1. **Week 2**: Test MCP integration with Claude Code
2. **Week 3**: Implement payment flows with real wallets
3. **Week 4**: Polish UI and publish to npm

## Resources

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Coinbase AgentKit Docs](https://docs.cdp.coinbase.com/agentkit)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Claude Code MCP Guide](https://docs.anthropic.com/en/docs/claude-code)
