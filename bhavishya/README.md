# Future CLI

A CLI tool called `future`, installable globally via npm, that lets two kinds of users interact with a model marketplace:

- **Publishers** register an OpenAI-compatible API endpoint, an API key, and metadata describing what their model is good at.

- **End users** type a query into `future ask`, the system suggests which published model fits best, the user picks one, and `future` then transparently redirects the real Claude Code CLI (via environment variables) to call that model through our gateway instead of Anthropic's own backend.

## Structure

```
/packages/cli        -> the published npm package
/apps/backend        -> NestJS app: auth, registry, gateway, matching modules
/packages/shared     -> shared TypeScript types used by both cli and backend
```

## Getting Started

```bash
npm install
npm run build
npm run dev:backend
```

For CLI development:

```bash
cd packages/cli
npm link
future login
future publish
future ask "your query"
future use <model-id>
```
