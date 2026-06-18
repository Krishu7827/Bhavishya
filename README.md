# Future - AI Model Discovery & Sharing Platform

A comprehensive platform for discovering, publishing, and using AI models through a unified CLI interface.

## 🎯 What is Future?

Future is an open-source platform that enables:
- **Model Discovery**: Browse and discover AI models published by the community
- **Model Publishing**: Share your AI models and API credentials with others
- **Unified Access**: Use a single CLI to access multiple AI models and providers

## 🚀 Features

### For Model Consumers
- 🔍 **Discover Models**: Browse available AI models from the community
- 📊 **Model Information**: View detailed specs, pricing, and capabilities
- 🎯 **Easy Selection**: Use models with a single command
- 💡 **Smart Matching**: AI-powered model suggestions for your use case

### For Model Publishers
- 📤 **Easy Publishing**: Share your models in minutes
- 🔐 **Secure Storage**: API keys are encrypted and safely stored
- 📈 **Analytics**: Track usage and popularity
- 💰 **Monetization**: Set pricing for your models

## 📦 Project Structure

```
future/
├── bhavishya/              # Main Future CLI & Backend
│   ├── apps/
│   │   └── backend/       # NestJS backend API
│   ├── packages/
│   │   ├── cli/           # Command-line interface
│   │   └── shared/        # Shared utilities
│   └── README.md
├── mcp/                    # MCP server implementation
├── mcp1.0.0/              # MCP v1.0 - Bedrock proxy
├── mcp1.1.0/              # MCP v1.1 - Multi-provider
├── gcp/                    # Vertex AI proxy
└── kimi/                   # Kimi proxy
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ 
- Docker (for PostgreSQL)
- Google Cloud Account (for OAuth)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/future.git
cd future

# Install dependencies
cd bhavishya
npm install

# Setup backend
cd apps/backend
cp .env.example .env
# Edit .env with your configuration

# Setup database
docker run --name future-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=future_db \
  -p 5432:5432 \
  -d postgres:16-alpine

npx prisma migrate dev
npx prisma generate

# Start backend
npm run dev

# In another terminal, build CLI
cd ../../packages/cli
npm run build
npm link

# Test CLI
future --help
```

### Basic Usage

```bash
# Login with Google
future login

# List available models
future list

# View model details
future info <model-id>

# Publish your model
future publish

# Use a model
future use <model-id>
```

## 📚 Documentation

- [CLI Quick Start](bhavishya/QUICKSTART.md) - Get started with the CLI
- [CLI Design](bhavishya/CLI_DESIGN.md) - Complete CLI reference
- [Implementation Summary](bhavishya/IMPLEMENTATION_SUMMARY.md) - Technical overview
- [Backend API](bhavishya/apps/backend/README.md) - API documentation

## 🏗️ Architecture

### Tech Stack
- **Backend**: NestJS 10, Prisma ORM, PostgreSQL
- **CLI**: Node.js, TypeScript, Commander.js
- **Auth**: Google OAuth 2.0 with PKCE
- **Encryption**: AES-256-GCM for API keys

### Key Features
- **Public Model Registry**: Browse models without authentication
- **Publisher Dashboard**: Manage your published models
- **Secure Key Storage**: Encrypted API key storage
- **Rate Limiting**: Prevent abuse with built-in throttling
- **JWT Tokens**: Secure authentication with 7-day expiry

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ using NestJS and Commander.js
- Inspired by the need for a unified AI model marketplace
- Thanks to all contributors and early adopters

## 📧 Contact

- GitHub Issues: [future/issues](https://github.com/yourusername/future/issues)
- Email: krishukumar7827@gmail.com

## 🗺️ Roadmap

### v1.0 (Current)
- ✅ Basic CLI commands (list, info, publish, use)
- ✅ Google OAuth authentication
- ✅ Model registry and publishing
- ✅ Secure API key storage

### v1.1 (Planned)
- 🔄 Usage analytics dashboard
- 🔄 Model categories and tags
- 🔄 Advanced search and filtering
- 🔄 Model versioning

### v2.0 (Future)
- 📋 Web UI for model discovery
- 📋 Subscription and billing system
- 📋 Model performance metrics
- 📋 Community ratings and reviews

---

**Made with ❤️ by the Future Team**
