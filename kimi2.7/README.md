# Kimi2.7 - Cloudflare Workers AI Proxy

A minimal Express.js proxy server that provides an OpenAI-compatible endpoint and forwards requests to Cloudflare Workers AI.

## Features

- ✅ OpenAI-compatible `POST /v1/chat/completions` endpoint
- ✅ Model name auto-mapping (adds `@cf/` prefix if missing)
- ✅ Streaming support with SSE (Server-Sent Events)
- ✅ Non-streaming responses
- ✅ Tool calling support (forwards `tools` and `tool_choice`)
- ✅ CORS enabled for all origins
- ✅ Error handling and logging

## Setup

### 1. Install Dependencies

```bash
cd kimi2.7
npm install
```

### 2. Configure Environment

Create a `.env` file with your Cloudflare credentials:

```env
CF_ACCOUNT_ID=your_account_id_here
CF_API_TOKEN=your_api_token_here
PORT=3005
```

### 3. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## API Usage

### Health Check

```bash
curl http://localhost:3005/health
```

### Chat Completions (Non-streaming)

```bash
curl -X POST http://localhost:3005/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-2-7b-chat-int8",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Chat Completions (Streaming)

```bash
curl -X POST http://localhost:3005/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-2-7b-chat-int8",
    "messages": [
      {"role": "user", "content": "Tell me a story"}
    ],
    "stream": true
  }'
```

### Tool Calling Example

```bash
curl -X POST http://localhost:3005/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-2-7b-chat-int8",
    "messages": [
      {"role": "user", "content": "What is the weather in Paris?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {"type": "string"}
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

## Model Mapping

The proxy automatically normalizes model names by adding the `@cf/` prefix if not present:

- Input: `llama-2-7b-chat-int8` → Forwarded as: `@cf/llama-2-7b-chat-int8`
- Input: `@cf/llama-2-7b-chat-int8` → Forwarded as-is

## Available Cloudflare Models

Popular Cloudflare Workers AI models:
- `@cf/meta/llama-2-7b-chat-int8`
- `@cf/meta/llama-2-7b-chat-fp16`
- `@cf/mistral/mistral-7b-instruct-v0.1`
- `@cf/meta-llama/llama-2-7b-chat-hf-lora`

See full list: https://developers.cloudflare.com/workers-ai/models/

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CF_ACCOUNT_ID` | Cloudflare account ID | Required |
| `CF_API_TOKEN` | Cloudflare API token | Required |
| `PORT` | Server port | 3005 |

## License

MIT
