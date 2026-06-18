# Future CLI

A command-line interface for discovering and using AI models from the Future marketplace.

## Installation

```bash
npm install -g @future/cli
```

## Commands

### `future login`

Authenticate with Future using Google OAuth.

```bash
future login
```

This will:
1. Open your browser for Google authentication
2. Start a local callback server
3. Save your credentials securely

### `future publish`

Publish a new model to the marketplace.

```bash
future publish
```

Interactive prompts will guide you through:
- Model name and description
- API endpoint URL
- Tags for discoverability
- Context window size
- Pricing notes

### `future ask <query>`

Find models matching your requirements.

```bash
future ask "code generation expert in typescript"
```

Returns ranked suggestions with match scores and allows you to select one.

### `future use <model-id>`

Use a specific model by routing Claude Code CLI through the gateway.

```bash
future use model-abc123
```

Or with a specific command:

```bash
future use model-abc123 -c "explain this code"
```

This:
1. Creates a gateway session
2. Sets `ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY`
3. Spawns the `claude` CLI with your model context

### `future logout`

Clear stored credentials.

```bash
future logout
```

## Requirements

- Node.js >= 20.0.0
- [Claude CLI](https://github.com/anthropics/anthropic-quickstarts) (for `future use` command)

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Test locally
npm link
future --help
```

## Configuration

The CLI stores credentials in `~/.future/credentials.json`.

Environment variables:
- `FUTURE_API_URL` - Backend API URL (default: http://localhost:3000)
- `FUTURE_GATEWAY_URL` - Gateway URL (default: http://localhost:3000)

## License

MIT
