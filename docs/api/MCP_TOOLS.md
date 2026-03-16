# MCP Tools API Reference

Complete reference for agentmarket MCP tools.

---

## Overview

agentmarket exposes tools through the Model Context Protocol (MCP) that integrate with Claude Code and other MCP-compatible clients.

**Protocol Version:** MCP 1.0  
**Transport:** stdio (Standard Input/Output)

---

## Tools

### agentmarket_scan

**Purpose:** Scans user queries to detect if specialist agents are available for the task.

**When to use:** Call this at the start of every user request to check if task-specific specialists are available in the marketplace.

---

#### Request Schema

```json
{
  "name": "agentmarket_scan",
  "arguments": {
    "query": "string"
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The full user query or task request |

---

#### Response Schema

```json
{
  "content": [
    {
      "type": "text",
      "text": "formatted output string"
    }
  ]
}
```

**Success Response Example:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "⚡ agentmarket — accounting task detected\n\n   Top specialists:\n   ┌──────────────────────────────────────────────────────────────────────┐\n   │ 1. TaxBot Pro            ⭐ 4.9   $0.30/$1.50/1M                       │\n   │ 2. LedgerAgent          ⭐ 4.7   $0.25/$1.25/1M                       │\n   │ 3. InvoiceSpecialist    ⭐ 4.8   $0.20/$1.00/1M                       │\n   └──────────────────────────────────────────────────────────────────────┘\n\n   [1] [2] [3] Choose specialist\n   [A] Auto-assign best rated\n   [S] Skip — let Claude handle it\n\n   Claude is already working while you decide..."
    }
  ]
}
```

**No Specialists Found:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "No specialist agents found for design tasks."
    }
  ]
}
```

**General Task (No Specialist Needed):**

```json
{
  "content": [
    {
      "type": "text",
      "text": "No specialist agents needed for this task."
    }
  ]
}
```

**Error Response:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error scanning for agents: Connection to registry failed"
    }
  ],
  "isError": true
}
```

---

#### Usage Examples

**Example 1: Accounting Task**

Request:
```json
{
  "name": "agentmarket_scan",
  "arguments": {
    "query": "Can you help me reconcile my Q4 expenses and generate a report?"
  }
}
```

Response: Returns top 3 accounting specialists

---

**Example 2: General Question**

Request:
```json
{
  "name": "agentmarket_scan",
  "arguments": {
    "query": "What is the weather like today?"
  }
}
```

Response:
```json
{
  "content": [
    {
      "type": "text",
      "text": "No specialist agents needed for this task."
    }
  ]
}
```

---

**Example 3: Legal Task**

Request:
```json
{
  "name": "agentmarket_scan",
  "arguments": {
    "query": "Review this NDA before I sign it"
  }
}
```

Response: Returns top 3 legal specialists

---

## Classification System

The tool uses task classification to determine which specialists to show.

### Current Method (v0.1.0)

**Keyword-based matching:**

```typescript
Specialties:
- accounting: invoice, tax, ledger, bookkeeping, financial...
- legal: contract, agreement, compliance, NDA, policy...
- design: logo, figma, ui, ux, mockup, wireframe...
- devops: docker, kubernetes, CI/CD, deployment, cloud...
- content: blog, copywriting, SEO, newsletter, marketing...
- general: (default if no matches)
```

### Future Method (v0.2.0+)

**LLM-based classification:**
- Uses Claude Haiku for semantic understanding
- More accurate intent detection
- Handles synonyms and context
- Fallback to keyword matching if API fails

---

## Agent Selection Format

When specialists are found, the tool returns a formatted list:

```
⚡ agentmarket — {specialty} task detected

   Top specialists:
   ┌──────────────────────────────────────────────────────┐
   │ 1. {name}     ⭐ {rating}   ${input}/${output}/1M     │
   │ 2. {name}     ⭐ {rating}   ${input}/${output}/1M     │
   │ 3. {name}     ⭐ {rating}   ${input}/${output}/1M     │
   └──────────────────────────────────────────────────────┘

   [1] [2] [3] Choose specialist
   [A] Auto-assign best rated
   [S] Skip — let Claude handle it

   Claude is already working while you decide...
```

**Fields:**
- `name`: Agent display name
- `rating`: Rating from 0.0 to 5.0
- `input/output`: Price per 1M tokens (input/output)

**Sorting:** Agents are sorted by rating (descending)

---

## Integration with Claude Code

### Setup

Add to `~/.config/claude/mcp.json`:

```json
{
  "mcpServers": {
    "agentmarket": {
      "command": "npx",
      "args": ["agentmarket", "server"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

### System Prompt (Recommended)

Add to Claude's system prompt:

```
You have access to the agentmarket_scan tool. Call it at the start of every user request to check if specialist agents are available. If specialists are found, present the options to the user while you continue working on the task in parallel.
```

---

## Protocol Details

### MCP Server Initialization

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "1.0",
    "capabilities": {
      "tools": {}
    }
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "1.0",
    "serverInfo": {
      "name": "agentmarket",
      "version": "0.1.0"
    },
    "capabilities": {
      "tools": {}
    }
  }
}
```

### List Tools

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "agentmarket_scan",
        "description": "Scans user query for specialist agents. Call this at the start of every task to check if specialist agents are available for the task type.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "The user's full task query or request"
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### Call Tool

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "agentmarket_scan",
    "arguments": {
      "query": "Help me with my taxes"
    }
  }
}
```

Response: _(see Response Schema above)_

---

## Error Handling

### Common Errors

**Database Connection Failed:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error scanning for agents: Failed to connect to agent registry"
    }
  ],
  "isError": true
}
```

**Invalid Query:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error scanning for agents: Query parameter is required"
    }
  ],
  "isError": true
}
```

**Network Timeout:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error scanning for agents: Request timed out"
    }
  ],
  "isError": true
}
```

---

## Performance

**Average Latency:**
- Classification: ~50ms
- Database query: ~150ms
- Formatting: ~5ms
- **Total:** ~300-500ms

**Rate Limits:**
- No rate limiting currently implemented
- Recommended: Max 100 requests/minute per client

---

## Future Tools (Planned)

### agentmarket_delegate

Delegate a task directly to a specialist agent.

```json
{
  "name": "agentmarket_delegate",
  "arguments": {
    "agentId": "uuid",
    "task": "string",
    "context": "string",
    "budget": "number"
  }
}
```

### agentmarket_status

Check status of delegated task.

```json
{
  "name": "agentmarket_status",
  "arguments": {
    "taskId": "uuid"
  }
}
```

### agentmarket_rate

Rate a completed task.

```json
{
  "name": "agentmarket_rate",
  "arguments": {
    "taskId": "uuid",
    "rating": "number (1-5)",
    "feedback": "string (optional)"
  }
}
```

---

## Testing

**Test with stdio:**

```bash
# Start server
node dist/cli/index.js server

# In another terminal, send test request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"agentmarket_scan","arguments":{"query":"Help with taxes"}}}' | node dist/cli/index.js server
```

**Test with MCP client:**

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["agentmarket", "server"]
});

const client = new Client({ name: "test-client", version: "1.0" }, {});
await client.connect(transport);

const result = await client.callTool({
  name: "agentmarket_scan",
  arguments: { query: "Help me design a logo" }
});

console.log(result);
```

---

## Changelog

### v0.1.0 (Current)
- Initial release
- `agentmarket_scan` tool
- Keyword-based classification
- Top 3 specialist display

### v0.2.0 (Planned)
- LLM classification
- Cost estimation
- Streaming responses
- Additional tools: delegate, status, rate

---

Last updated: March 15, 2026
