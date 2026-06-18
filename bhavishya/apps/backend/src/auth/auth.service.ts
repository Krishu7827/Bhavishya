import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { randomBytes, createHash } from 'crypto';

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Generate PKCE code_verifier and code_challenge
   */
  generatePKCE() {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate a random state parameter for OAuth
   */
  generateState(): string {
    return randomBytes(16).toString('base64url');
  }

  /**
   * Store OAuth state with PKCE verifier for later verification
   */
  async storeOAuthState(
    state: string,
    codeChallenge: string,
    redirectUri: string,
  ) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return this.prisma.oAuthState.create({
      data: {
        state,
        codeChallenge,
        redirectUri,
        expiresAt,
      },
    });
  }

  /**
   * Verify PKCE code_verifier against stored state
   */
  async verifyPKCE(state: string, codeVerifier: string) {
    const stored = await this.prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!stored || stored.expiresAt < new Date()) {
      return null;
    }

    // Compute SHA256 of the verifier and compare
    const computedChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (stored.codeChallenge !== computedChallenge) {
      return null;
    }

    // Clean up used state
    await this.prisma.oAuthState.delete({ where: { state } });

    return stored;
  }

  /**
   * Get Google OAuth consent URL
   */
  getGoogleOAuthUrl(redirectUri: string, _codeChallenge: string, state: string): string {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    const scope = 'openid email profile';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for Google tokens
   */
  async exchangeGoogleCode(code: string, redirectUri: string) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    return response.json();
  }

  /**
   * Get user info from Google
   */
  async getGoogleUserInfo(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info from Google');
    }

    return response.json();
  }

  /**
   * Upsert publisher from Google OAuth
   */
  async upsertPublisher(googleId: string, email: string, name: string) {
    return this.prisma.publisher.upsert({
      where: { googleId },
      update: { email, name },
      create: { googleId, email, name },
    });
  }

  /**
   * Create one-time code for token exchange
   */
  async createOneTimeCode(publisherId: string): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute

    await this.prisma.oneTimeCode.create({
      data: {
        code,
        publisherId,
        expiresAt,
      },
    });

    return code;
  }

  /**
   * Exchange one-time code for JWT tokens
   */
  async exchangeOneTimeCode(code: string, _codeVerifier?: string) {
    const stored = await this.prisma.oneTimeCode.findUnique({
      where: { code },
      include: { publisher: true },
    });

    if (!stored || stored.used || stored.expiresAt < new Date()) {
      return null;
    }

    // Mark code as used
    await this.prisma.oneTimeCode.update({
      where: { code },
      data: { used: true },
    });

    // Generate tokens
    const tokens = await this.generateTokens(stored.publisher);

    return {
      ...tokens,
      publisher: stored.publisher,
    };
  }

  /**
   * Generate JWT access token and refresh token
   */
  async generateTokens(publisher: { id: string; email: string; name: string }) {
    const payload: TokenPayload = {
      sub: publisher.id,
      email: publisher.email,
      name: publisher.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresIn = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        publisherId: publisher.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + refreshExpiresIn),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      tokenType: 'Bearer' as const,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { publisher: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return null;
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revoked: true },
    });

    // Generate new tokens
    return this.generateTokens(stored.publisher);
  }

  /**
   * Validate JWT payload and return publisher
   */
  async validateToken(payload: TokenPayload) {
    return this.prisma.publisher.findUnique({
      where: { id: payload.sub },
    });
  }

  /**
   * Revoke all refresh tokens for a publisher (logout)
   */
  async revokeAllTokens(publisherId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { publisherId },
      data: { revoked: true },
    });
  }
}
