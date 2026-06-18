# Future CLI - Command Reference

## Overview

The Future CLI is a command-line interface for:
- **Users**: Discover and use AI models published by the community
- **Publishers**: Share AI models and API credentials with the community

## User Commands (Model Consumers)

### Authentication

```bash
future login
```
- Authenticate with Google OAuth
- Stores tokens locally in `~/.future/config.json`
- Required before using other commands

```bash
future logout
```
- Clear stored authentication tokens
- Revoke refresh tokens from backend

```bash
future whoami
```
- Show current authenticated user
- Display email, name, and subscription status

### Model Discovery

```bash
future list [OPTIONS]
```
List available AI models

**Options:**
- `--mine` - List only models you've published (Publisher mode)
- `--category <category>` - Filter by category (llm, embedding, image, etc.)
- `--limit <n>` - Limit number of results (default: 20)
- `--sort <field>` - Sort by: name, rating, usage, created (default: usage)
- `--json` - Output in JSON format

**Examples:**
```bash
future list                          # List all available models
future list --mine                   # List your published models
future list --category llm           # List only LLM models
future list --limit 10 --sort rating # Top 10 highest rated
```

### Model Information

```bash
future info <model-id>
```
Show detailed information about a specific model

**Output:**
- Model name and description
- Publisher info
- Pricing details
- Usage statistics
- API endpoint
- Required credentials

**Examples:**
```bash
future info openai-gpt-4
future info claude-3-opus
```

### Model Selection (Active Session)

```bash
future use <model-id>
```
Select a model for your current session

**Actions:**
- Downloads model credentials/endpoint info
- Sets as default for current session
- Validates you have access/subscription

**Examples:**
```bash
future use openai-gpt-4
future use claude-3-opus
```

```bash
future use --unset
```
Clear current model selection

```bash
future use --current
```
Show currently selected model

### Ask Model (Query)

```bash
future ask <prompt>
```
Send a prompt to the currently selected model

**Options:**
- `--model <model-id>` - Use specific model (overrides current selection)
- `--max-tokens <n>` - Limit response length
- `--temperature <n>` - Set response creativity (0.0-1.0)
- `--stream` - Stream response in real-time

**Examples:**
```bash
future ask "What is machine learning?"
future ask --model openai-gpt-4 "Explain quantum computing"
future ask --stream "Write a poem about AI"
```

---

## Publisher Commands (Model Publishers)

### Publish Model

```bash
future publish [OPTIONS]
```
Publish a new AI model or API credential

**Interactive Mode:**
```bash
future publish
```
CLI will prompt for:
- Model name
- Description
- Category (llm, embedding, image, audio, etc.)
- API endpoint URL
- Authentication type (api_key, oauth, etc.)
- Pricing model (per-request, per-token, free)
- Rate limits
- Tags

**Non-Interactive Mode:**
```bash
future publish \
  --name "My Custom GPT-4" \
  --description "OpenAI GPT-4 proxy with caching" \
  --category llm \
  --endpoint https://api.myproxy.com/v1/chat \
  --auth-type api_key \
  --pricing per-token \
  --price 0.0001 \
  --rate-limit 100/hour \
  --tags openai,gpt4,proxy
```

**Options:**
- `--name <name>` - Model name (required)
- `--description <desc>` - Model description (required)
- `--category <cat>` - Model category (llm, embedding, image, audio, video, other)
- `--endpoint <url>` - API endpoint URL (required)
- `--auth-type <type>` - Authentication type (api_key, oauth, none)
- `--auth-value <value>` - API key or OAuth credentials
- `--pricing <type>` - Pricing model (per-request, per-token, monthly, free)
- `--price <amount>` - Price per unit
- `--rate-limit <limit>` - Rate limit (e.g., 100/hour)
- `--tags <tags>` - Comma-separated tags
- `--public` - Make model public (default: private)
- `--json` - Output model JSON after creation

**Examples:**
```bash
# Publish OpenAI API credential
future publish \
  --name "OpenAI GPT-4 Turbo" \
  --description "Direct OpenAI GPT-4 Turbo access" \
  --category llm \
  --endpoint https://api.openai.com/v1/chat/completions \
  --auth-type api_key \
  --auth-value "sk-..." \
  --pricing per-token \
  --price 0.00001 \
  --tags openai,gpt4,turbo \
  --public

# Publish custom model
future publish --name "My Image Generator" --category image
```

### Manage Published Models

```bash
future list --mine
```
List all models you've published

Shows:
- Model ID
- Name
- Status (active, inactive, pending)
- Usage statistics
- Revenue (if monetized)
- Created date

```bash
future update <model-id> [OPTIONS]
```
Update an existing model's details

**Options:**
- `--name <name>` - Update name
- `--description <desc>` - Update description
- `--endpoint <url>` - Update endpoint
- `--auth-value <value>` - Update credentials
- `--pricing <type>` - Update pricing model
- `--price <amount>` - Update price
- `--activate` - Activate model
- `--deactivate` - Deactivate model

**Examples:**
```bash
future update my-model-123 --name "New Model Name"
future update my-model-123 --deactivate
```

```bash
future unpublish <model-id>
```
Remove a published model (cannot be undone)

**Options:**
- `--force` - Skip confirmation

**Examples:**
```bash
future unpublish my-model-123
future unpublish my-model-123 --force
```

### Analytics (Publishers)

```bash
future analytics <model-id>
```
View usage analytics for a published model

**Output:**
- Total requests
- Active users
- Error rate
- Revenue generated
- Popular request types
- Geographic distribution

**Options:**
- `--period <period>` - Time period (day, week, month, year)
- `--detailed` - Show detailed breakdown

**Examples:**
```bash
future analytics my-model-123
future analytics my-model-123 --period week --detailed
```

---

## Admin Commands (Future Maintainers)

```bash
future admin:stats
```
Show platform statistics

```bash
future admin:users
```
List all registered users

```bash
future admin:models [--pending]
```
List all models (optionally filter pending review)

```bash
future admin:approve <model-id>
```
Approve a pending model

```bash
future admin:suspend <model-id>
```
Suspend a model

---

## Configuration

```bash
future config
```
View current configuration

```bash
future config set <key> <value>
```
Set a configuration value

**Available Keys:**
- `api_url` - Backend API URL
- `gateway_url` - Gateway URL
- `output_format` - Output format (text, json, table)
- `default_model` - Default model ID

**Examples:**
```bash
future config set api_url https://api.future.ai
future config set default_model openai-gpt-4
future config set output_format json
```

---

## Global Options

```bash
future --help
```
Show help menu

```bash
future --version
```
Show CLI version

```bash
future --debug
```
Enable debug mode (verbose logging)

```bash
future --no-color
```
Disable colored output

```bash
future --api-url <url>
```
Override API URL for this command

---

## Use Case Examples

### Example 1: User wants to use GPT-4

```bash
# Login first
future login

# List available models
future list --category llm

# Get details about a specific model
future info openai-gpt-4

# Select the model
future use openai-gpt-4

# Ask a question
future ask "Explain quantum computing in simple terms"

# Stream a response
future ask --stream "Write a short story about AI"
```

### Example 2: Publisher shares their OpenAI API key

```bash
# Login
future login

# Publish the model
future publish \
  --name "Community GPT-4" \
  --description "Shared OpenAI GPT-4 access" \
  --category llm \
  --endpoint https://api.openai.com/v1/chat/completions \
  --auth-type api_key \
  --auth-value "sk-proj-..." \
  --pricing per-token \
  --price 0.00001 \
  --public

# View published models
future list --mine

# Check analytics
future analytics community-gpt-4 --period week
```

### Example 3: Publisher lists their models

```bash
# Login
future login

# List all your published models
future list --mine

# Output example:
# ┌─────────────────────┬────────────────────┬────────┬───────┬─────────┐
# │ Model ID            │ Name               │ Status │ Usage │ Revenue │
# ├─────────────────────┼────────────────────┼────────┼───────┼─────────┤
# │ openai-gpt-4        │ Community GPT-4    │ active │ 1.2K  │ $12.50  │
# │ claude-3-proxy      │ Claude 3 Proxy     │ active │ 850   │ $8.20   │
# │ my-custom-model     │ My Custom Model    │ pending│ -     │ -       │
# └─────────────────────┴────────────────────┴────────┴───────┴─────────┘
```

---

## Implementation Priority

### Phase 1: Core Features (MVP)
1. ✅ `future login` - Authentication
2. ✅ `future logout` - Clear tokens
3. 🔄 `future list` - List models
4. 🔄 `future list --mine` - My published models
5. 🔄 `future publish` - Publish model
6. 🔄 `future info` - Model details

### Phase 2: Usage
7. `future use` - Select model
8. `future ask` - Query model
9. `future use --current` - Show selected model

### Phase 3: Management
10. `future update` - Update model
11. `future unpublish` - Remove model
12. `future analytics` - View analytics

### Phase 4: Advanced
13. `future config` - Configuration
14. `future whoami` - User info
15. Admin commands

---

## File Structure

```
packages/cli/src/
├── commands/
│   ├── login.ts        ✅ Implemented
│   ├── logout.ts       ✅ Implemented
│   ├── list.ts         🔄 To implement
│   ├── publish.ts      🔄 To implement
│   ├── info.ts         🔄 To implement
│   ├── use.ts          ✅ Implemented
│   ├── ask.ts          ✅ Implemented
│   ├── config.ts       🔄 To implement
│   ├── whoami.ts       🔄 To implement
│   └── analytics.ts    🔄 To implement
├── core/
│   ├── config.ts       ✅ Implemented
│   ├── store.ts        ✅ Implemented
│   └── api.ts          🔄 To implement
└── utils/
    ├── display.ts      🔄 To implement
    ├── validators.ts   🔄 To implement
    └── prompts.ts      🔄 To implement
```
