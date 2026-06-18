import { Command } from 'commander';
import { createServer } from 'http';
import { URL } from 'url';
import open from 'open';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { StoredCredentials } from '@future/shared';
import { API_BASE_URL, OAUTH_REDIRECT_PORT } from '../core/config';

const FUTURE_DIR = path.join(homedir(), '.future');
const CREDENTIALS_FILE = path.join(FUTURE_DIR, 'credentials.json');

class LoginCommand {
  async run(): Promise<void> {
    console.log('🔐 Logging in to Future...\n');

    // Check for existing credentials
    const existingCreds = await this.loadCredentials();
    if (existingCreds && existingCreds.expiresAt > Date.now()) {
      console.log('✅ Already logged in!\n');
      console.log(`   Email: ${existingCreds.email}`);
      console.log(`   Name:  ${existingCreds.name}`);
      return;
    }

    // Ensure .future directory exists
    if (!fs.existsSync(FUTURE_DIR)) {
      fs.mkdirSync(FUTURE_DIR, { recursive: true });
    }

    // Open OAuth flow
    const redirectUri = `http://127.0.0.1:${OAUTH_REDIRECT_PORT}/callback`;

    console.log('🌐 Opening browser for authentication...\n');

    // Start callback server
    const authCode = await this.startCallbackServer();

    // Exchange code for tokens
    const tokens = await this.exchangeCode(authCode.code, authCode.codeVerifier);

    // Save credentials
    const credentials: StoredCredentials = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      publisherId: tokens.publisher.id,
      email: tokens.publisher.email,
      name: tokens.publisher.name,
    };

    await this.saveCredentials(credentials);

    console.log('\n✅ Successfully logged in!\n');
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Name:  ${credentials.name}`);
  }

  private async startCallbackServer(): Promise<{ code: string; codeVerifier: string }> {
    return new Promise((resolve, reject) => {
      const codeVerifier = this.generateRandomString(32);
      const codeChallenge = this.generateCodeChallenge(codeVerifier);

      // Build OAuth URL
      const redirectUri = `http://127.0.0.1:${OAUTH_REDIRECT_PORT}/callback`;
      const authUrl = new URL(`${API_BASE_URL}/auth/google`);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('code_challenge', codeChallenge);

      console.log(`   Opening: ${authUrl.toString()}\n`);

      const server = createServer((req, res) => {
        const url = new URL(req.url || '/', redirectUri);

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Login Failed</h1><p>${error}</p>`);
            server.close();
            reject(new Error(error));
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Login Successful!</h1><p>You can close this window.</p>');
            server.close();
            resolve({ code, codeVerifier });
          }
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      server.listen(OAUTH_REDIRECT_PORT, '127.0.0.1', () => {
        console.log(`   Waiting for callback on port ${OAUTH_REDIRECT_PORT}...`);
        open(authUrl.toString()).catch(() => {});
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Login timed out (5 min)'));
      }, 5 * 60 * 1000);
    });
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    return response.json();
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async loadCredentials(): Promise<StoredCredentials | null> {
    try {
      if (!fs.existsSync(CREDENTIALS_FILE)) return null;
      const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async saveCredentials(creds: StoredCredentials): Promise<void> {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2));
  }
}

const loginCmd = new LoginCommand();

export const loginCommand = new Command('login')
  .description('Login to Future as a publisher (Google OAuth)')
  .action(async () => {
    await loginCmd.run();
  });

export { loginCmd };
