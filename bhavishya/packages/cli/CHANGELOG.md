# Changelog

All notable changes to the Future CLI will be documented in this file.

## [1.0.0] - 2026-06-18

### Added
- Initial release
- `future login` - Google OAuth authentication with PKCE flow
- `future publish` - Interactive model publishing to marketplace
- `future ask <query>` - Model suggestion with keyword matching
- `future use <model-id>` - Route Claude CLI through gateway with model context
- `future logout` - Clear stored credentials
- Secure credential storage in `~/.future/credentials.json`
- Support for custom API and gateway URLs via environment variables
- Node.js >= 20.0.0 requirement
