import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { RegistryService } from '../registry/registry.service';
import { randomBytes } from 'crypto';
import { SESSION_DURATION_SECONDS } from '../common/constants';

export interface SessionInfo {
  id: string;
  modelId: string;
  publisherId: string;
}

@Injectable()
export class GatewayService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private registryService: RegistryService,
  ) {}

  /**
   * Create a new session for a model
   */
  async createSession(modelId: string, publisherId?: string): Promise<{ sessionToken: string; gatewayUrl: string; expiresAt: number }> {
    // Verify model exists
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    await this.prisma.session.create({
      data: {
        id: sessionToken,
        modelId,
        publisherId: publisherId || null,
        expiresAt,
      },
    });

    return {
      sessionToken,
      gatewayUrl: this.config.get('GATEWAY_URL', 'http://localhost:3000'),
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
    };
  }

  /**
   * Validate a session token and return model credentials
   */
  async validateSession(sessionToken: string): Promise<{ modelId: string; baseUrl: string; apiKey: string } | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionToken },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Get model credentials
    return this.registryService.getModelCredentials(session.modelId);
  }

  /**
   * Validate and use a session for gateway proxy
   */
  async useSession(sessionToken: string) {
    const credentials = await this.validateSession(sessionToken);

    if (!credentials) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return credentials;
  }

  /**
   * Clean up expired sessions (can be called periodically)
   */
  async cleanupExpiredSessions() {
    await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
