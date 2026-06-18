import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { Public } from './public.decorator';
import { IsString, IsNotEmpty } from 'class-validator';

class TokenExchangeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  codeVerifier: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /auth/google
   * Initiates Google OAuth flow with PKCE
   * 
   * Query params:
   * - redirect_uri: CLI's local callback URL
   * - code_challenge: PKCE code challenge (S256)
   */
  @Get('google')
  @Public()
  async initiateGoogleOAuth(
    @Query('redirect_uri') redirectUri: string,
    @Query('code_challenge') codeChallenge: string,
    @Res() res: Response,
  ) {
    if (!redirectUri || !codeChallenge) {
      throw new BadRequestException('Missing redirect_uri or code_challenge');
    }
    console.log('Initiating Google OAuth with redirect URI and code challenge:', { redirectUri, codeChallenge });
    // Generate state and store the CLI's code challenge
    const state = this.authService.generateState();

    await this.authService.storeOAuthState(state, codeChallenge, redirectUri);

    const redirectUrl = this.authService['config'].get('OAUTH_REDIRECT_URL') || 'http://localhost:3002/auth/google/callback';
    const authUrl = this.authService.getGoogleOAuthUrl(
      redirectUrl,
      codeChallenge,
      state,
    );

    res.redirect(authUrl);
  }

  /**
   * GET /auth/google/callback
   * Handles Google OAuth callback
   */
  @Get('google/callback')
  @Public()
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      // Redirect to CLI with error
      return res.redirect(`future://auth?error=${encodeURIComponent(error)}`);
    }
   console.log('Received OAuth callback with code and state:', { code, state });
    // Get stored OAuth state
    const stored = await this.authService['prisma'].oAuthState.findUnique({
      where: { state },
    });
 
    console.log('Retrieved stored OAuth state:', stored);
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired state');
    }
    const redirectUrl = this.authService['config'].get('OAUTH_REDIRECT_URL') || 'http://localhost:3002/auth/google/callback';
    try {
      // Exchange code for Google tokens (no PKCE needed with client secret)
      const googleTokens = await this.authService.exchangeGoogleCode(
        code,
        redirectUrl,
      ) as any;

      // Get user info
      const userInfo = await this.authService.getGoogleUserInfo(googleTokens.access_token) as any;

      // Upsert publisher
      const publisher = await this.authService.upsertPublisher(
        userInfo.sub,
        userInfo.email,
        userInfo.name,
      );

      // Create one-time code for CLI to exchange
      const oneTimeCode = await this.authService.createOneTimeCode(publisher.id);

      // Clean up OAuth state
      await this.authService['prisma'].oAuthState.delete({ where: { state } });

      // Redirect back to CLI with one-time code
      const callbackUrl = new URL(stored.redirectUri);
      callbackUrl.searchParams.set('code', oneTimeCode);
      callbackUrl.searchParams.set('state', state);

      res.redirect(callbackUrl.toString());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OAuth failed';
      res.redirect(
        `${stored.redirectUri}?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  /**
   * POST /auth/token
   * Exchange one-time code for JWT tokens
   */
  @Post('token')
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async exchangeToken(@Body() dto: TokenExchangeDto) {
    const result = await this.authService.exchangeOneTimeCode(
      dto.code,
      dto.codeVerifier,
    );

    if (!result) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    return result;
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  @Post('refresh')
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshAccessToken(dto.refreshToken);

    if (!tokens) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return tokens;
  }

  /**
   * POST /auth/logout
   * Logout and revoke tokens
   */
  @Post('logout')
  async logout(@Req() req: Request) {
    const publisher = req.user as { id: string };
    if (publisher) {
      await this.authService.revokeAllTokens(publisher.id);
    }
    return { success: true };
  }

  /**
   * GET /auth/me
   * Get current authenticated publisher
   */
  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    const publisher = req.user as { id: string; email: string; name: string };
    if (!publisher) {
      throw new UnauthorizedException('Not authenticated');
    }
    return publisher;
  }
}
