# Future CLI - Quick Start Guide

## Overview

The Future CLI allows you to:
- **Discover** AI models published by the community
- **Publish** your own AI models and API credentials
- **Use** models through a unified gateway

## Installation

```bash
# Clone and build
cd /Users/krishnakumar/Desktop/future/bhavishya/packages/cli
npm install
npm run build
npm link

# Verify installation
future --version
future --help
```

---

## Quick Start

### 1. Authenticate

```bash
future login
```

This opens your browser for Google OAuth authentication. After logging in, your credentials are stored locally.

### 2. Browse Available Models

```bash
# List all available models
future list

# List with options
future list --limit 10
future list --json

# View your published models (requires authentication)
future list --mine
```

### 3. View Model Details

```bash
# Get detailed information about a specific model
future info <model-id>

# Output in JSON format
future info <model-id> --json
```

### 4. Use a Model

```bash
# Select a model for your session
future use <model-id>
```

---

## Publisher Workflow

### Publishing a Model

```bash
future publish
```

This will prompt you for:
- **Model name**: A descriptive name for your model
- **Description**: What your model does
- **API Base URL**: The OpenAI-compatible endpoint
- **API Key**: Your API key (will be encrypted)
- **Tags**: Comma-separated tags (e.g., "code,fast,cheap")
- **Context Window**: Token limit (e.g., 4096, 8192)
- **Pricing Notes**: Pricing information

### Managing Your Published Models

```bash
# List all models you've published
future list --mine

# View details of a specific model
future info <your-model-id>

# Remove a published model
future unpublish <model-id>

# Force remove without confirmation
future unpublish <model-id> --force
```

---

## Example Workflows

### Example 1: User Discovers and Uses a Model

```bash
# Login
$ future login
✓ Authentication successful!

# Browse available models
$ future list
📦 Available Models:
┌──────────────────────────┬─────────────────┬────────────────┐
│ Model ID                  │ Name            │ Context Window │
├──────────────────────────┼─────────────────┼────────────────┤
│ openai-gpt-4-turbo       │ GPT-4 Turbo     │ 128000         │
│ claude-3-opus             │ Claude 3 Opus   │ 200000         │
│ llama-2-70b              │ LLaMA 2 70B     │ 4096           │
└──────────────────────────┴─────────────────┴────────────────┘

# Get more details
$ future info openai-gpt-4-turbo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 GPT-4 Turbo
   ID: openai-gpt-4-turbo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Description:
  OpenAI's most capable model with 128K context

Details:
  Context Window: 128,000 tokens
  Base URL:       https://api.openai.com/v1
  Publisher:      John Doe

# Use the model
$ future use openai-gpt-4-turbo
✅ Session created!
   Gateway URL: http://localhost:3001/gateway
   Session Token: sk_live_xxxxx...
```

### Example 2: Publisher Shares OpenAI API Key

```bash
# Login
$ future login

# Publish a model
$ future publish
📤 Publishing a new model...

? Model name: Community GPT-4
? Description: Shared OpenAI GPT-4 access for the community
? API Base URL: https://api.openai.com/v1
? API Key: ********
? Tags: openai, gpt4, shared
? Context window size: 128000
? Pricing notes: Free for community use

📤 Submitting model to marketplace...
✅ Model published successfully!

   Model ID: cmqjyhck30007j5v48x9ro4vi
   Name: Community GPT-4

# View your published models
$ future list --mine
📦 Your Published Models:
┌──────────────────────────┬─────────────────┬────────────────┐
│ Model ID                 │ Name            │ Context Window │
├──────────────────────────┼─────────────────┼────────────────┤
│ cmqjyhck30007j5v48x9...  │ Community GPT-4 │ 128000         │
└──────────────────────────┴─────────────────┴────────────────┘

Total: 1 model(s) published

# Remove if needed
$ future unpublish cmqjyhck30007j5v48x9ro4vi
⚠️  This action cannot be undone. Are you sure? (y/N)
```

---

## Command Reference

### Authentication Commands

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `future login` | Authenticate with Google OAuth | No |
| `future logout` | Clear stored credentials | No |

### Model Discovery Commands

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `future list` | List all available models | No |
| `future list --mine` | List your published models | Yes |
| `future info <id>` | View model details | Yes |

### Publisher Commands

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `future publish` | Publish a new model | Yes |
| `future unpublish <id>` | Remove a published model | Yes |

### Usage Commands

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `future use <id>` | Use a specific model | Yes |
| `future ask <query>` | Ask a query to current model | Yes |

---

## Current Implementation Status

### ✅ Completed
- Authentication (login/logout)
- Model discovery (list, info)
- Publisher workflows (publish, unpublish)
- Model selection (use)
- Query execution (ask)

### 🔄 In Progress
- Usage analytics command
- Detailed error handling
- Configuration management

### 📋 Planned
- Model update command
- Category filtering
- Rate limiting
- Usage statistics
- Admin commands

---

## Development

### Project Structure

```
packages/cli/src/
├── commands/
│   ├── login.ts        # Google OAuth login
│   ├── logout.ts       # Clear credentials
│   ├── list.ts         # List models
│   ├── info.ts         # Model details
│   ├── publish.ts      # Publish new model
│   ├── unpublish.ts    # Remove model
│   ├── use.ts          # Select model
│   └── ask.ts          # Query model
├── core/
│   ├── config.ts       # API endpoints
│   └── store.ts        # Token management
└── index.ts            # Main entry point
```

### Backend Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/auth/google` | GET | Initiate OAuth | No |
| `/auth/google/callback` | GET | OAuth callback | No |
| `/models` | GET | List all models | No |
| `/models?mine=true` | GET | List user's models | Yes |
| `/models` | POST | Create model | Yes |
| `/models/:id` | GET | Get model details | Yes |
| `/models/:id` | DELETE | Delete model | Yes |

---

## Troubleshooting

### "Not authenticated"

Run `future login` first.

### "Authentication expired"

Your token has expired. Run `future login` again.

### "Failed to fetch models"

1. Check if backend is running: `curl http://localhost:3002/health`
2. Verify API URL: `future config`

### "You do not own this model"

You can only view/delete your own published models.

---

## Environment Variables

```bash
# Backend API URL (default: http://localhost:3002)
export FUTURE_API_URL="http://localhost:3002"

# Gateway URL (default: http://localhost:3002)
export FUTURE_GATEWAY_URL="http://localhost:3002"
```

---

## Next Steps

1. **Setup Backend**: Follow `/bhavishya/apps/backend/README.md`
2. **Configure OAuth**: Add Google OAuth credentials
3. **Test E2E**: Login → Publish → List → Use
4. **Explore**: Try different models and use cases

---

## Resources

- **Design Document**: `/bhavishya/CLI_DESIGN.md`
- **Backend API**: `/bhavishya/apps/backend/README.md`
- **Project README**: `/bhavishya/README.md`
