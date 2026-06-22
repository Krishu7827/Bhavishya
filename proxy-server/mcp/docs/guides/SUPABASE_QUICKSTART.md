# Supabase Quickstart Guide for agentmarket

A complete beginner's guide to setting up Supabase for agentmarket.

## What is Supabase?

Supabase is an open-source Firebase alternative that gives you:
- **PostgreSQL database** (where we'll store agent information)
- **Auto-generated APIs** (so we can query agents from our code)
- **Authentication** (for future features)
- **Free tier** (perfect for getting started)

---

## Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"**
3. Sign up with GitHub (recommended) or email
4. Confirm your email if needed

---

## Step 2: Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the details:
   - **Name**: `agentmarket` (or any name you like)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to you (e.g., US West, EU Central)
   - **Pricing Plan**: Select **Free** (includes 500MB database, 2GB bandwidth)
3. Click **"Create new project"**
4. Wait ~2 minutes for your project to be set up ⏳

---

## Step 3: Run the Database Schema

Once your project is ready:

### 3.1 Open the SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** (the `+` button)

### 3.2 Copy and Paste the Schema

1. Open the file `supabase-schema.sql` from your agentmarket project
2. Copy **all the contents** (Cmd+A, Cmd+C on Mac)
3. Paste into the Supabase SQL Editor
4. Click **"Run"** (or press Cmd+Enter)

You should see:
```
Success. No rows returned
```

This means your `agents` table has been created! ✅

### 3.3 Verify the Table

1. In the left sidebar, click **"Table Editor"**
2. You should see a table called **"agents"**
3. Click on it - it will be empty for now (that's normal)

---

## Step 4: Get Your API Credentials

You need two pieces of information:

### 4.1 Get Your Project URL

1. Click **"Settings"** (gear icon in left sidebar)
2. Click **"API"** under Project Settings
3. Find **"Project URL"** - it looks like:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
4. **Copy this URL** - you'll need it for your `.env` file

### 4.2 Get Your Anonymous Key

1. On the same **API settings page**
2. Find **"Project API keys"**
3. Copy the **`anon` `public`** key - it's a long string like:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. **Copy this key** - you'll need it for your `.env` file

⚠️ **Important**: 
- Use the `anon` key (not the `service_role` key)
- The `anon` key is safe to use in your app
- Never share your `service_role` key publicly

---

## Step 5: Configure Your .env File

1. In your agentmarket project, copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your editor

3. Replace these two lines:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   With your actual values:
   ```env
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. Save the file

---

## Step 6: Test Your Connection

Let's verify everything works:

1. Create a test file:
   ```bash
   cat > test-supabase.js << 'EOF'
   import { createClient } from '@supabase/supabase-js';
   import dotenv from 'dotenv';
   
   dotenv.config();
   
   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_ANON_KEY
   );
   
   const { data, error } = await supabase.from('agents').select('*');
   
   if (error) {
     console.error('❌ Error:', error.message);
   } else {
     console.log('✅ Connected to Supabase!');
     console.log('📊 Agents found:', data.length);
   }
   EOF
   ```

2. Run the test:
   ```bash
   node test-supabase.js
   ```

You should see:
```
✅ Connected to Supabase!
📊 Agents found: 0
```

If you see this, **you're all set!** 🎉

---

## Optional: Add Test Data

Want to test with some sample agents?

1. Go back to **SQL Editor** in Supabase
2. Create a new query
3. Paste this:
   ```sql
   INSERT INTO agents (name, specialty, price_per_task, wallet_address, mcp_endpoint, rating, total_tasks, response_time_avg)
   VALUES 
     ('TaxBot Pro', ARRAY['accounting'], 0.05, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', 'https://taxbot.example.com/mcp', 4.9, 156, 45.2),
     ('LedgerAgent', ARRAY['accounting'], 0.03, '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', 'https://ledger.example.com/mcp', 4.7, 89, 32.5),
     ('ContractReviewer', ARRAY['legal'], 0.15, '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', 'https://contract.example.com/mcp', 4.6, 67, 120.5);
   ```
4. Click **Run**
5. Go to **Table Editor** → **agents** to see your test data

---

## Troubleshooting

### "Invalid API key"
- Make sure you copied the full `anon` key (it's very long)
- Check for extra spaces or line breaks
- Make sure your `.env` file is in the project root

### "relation 'agents' does not exist"
- The SQL schema didn't run properly
- Go back to SQL Editor and run `supabase-schema.sql` again
- Check for any error messages in red

### "Cannot connect to Supabase"
- Check your internet connection
- Verify the SUPABASE_URL is correct (should end in `.supabase.co`)
- Try re-copying your credentials from Supabase dashboard

---

## What's Next?

Now that Supabase is set up, you can:

1. ✅ Test the agentmarket CLI:
   ```bash
   npx agentmarket publish
   ```

2. ✅ View your agents in Supabase Table Editor after publishing

3. ✅ Continue to Week 2 of the roadmap (MCP integration)

---

## Quick Reference

**Supabase Dashboard**: [app.supabase.com](https://app.supabase.com)

**Common Tasks**:
- View data: **Table Editor** → **agents**
- Run SQL: **SQL Editor**
- Get credentials: **Settings** → **API**
- View logs: **Database** → **Logs**

**Free Tier Limits**:
- 500 MB database storage
- 2 GB bandwidth/month
- 50,000 monthly active users
- Unlimited API requests

This is more than enough for development and testing!
