import {
  Controller,
  Post,
  Body,
  Headers,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { GatewayService } from './gateway.service';
import { anthropicToOpenAI, openAIToAnthropic } from './translation';
import { Public } from '../auth/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsNotEmpty } from 'class-validator';

class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  modelId: string;
}

@Controller()
export class GatewayController {
  constructor(private readonly gateway: GatewayService) {}

  /**
   * POST /sessions
   * Create a new gateway session
   * Public endpoint - returns session token for use with gateway
   */
  @Post('sessions')
  @Public()
  @Throttle({ medium: { limit: 20, ttl: 60000 } })
  async createSession(@Body() dto: CreateSessionDto) {
    return this.gateway.createSession(dto.modelId);
  }

  /**
   * POST /v1/messages
   * Gateway endpoint - proxies Anthropic Messages API to OpenAI-compatible backends
   */
  @Post('v1/messages')
  @Public()
  @Throttle({ long: { limit: 100, ttl: 60000 } })
  async proxyMessages(
    @Headers('authorization') auth: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // Extract session token from Authorization header
    const sessionToken = auth?.replace('Bearer ', '');
    if (!sessionToken) {
      throw new UnauthorizedException('Missing session token');
    }

    // Validate session and get credentials
    const credentials = await this.gateway.useSession(sessionToken);

    try {
      // Convert Anthropic request to OpenAI format
      const openaiRequest = anthropicToOpenAI(body);

      // Forward to publisher's endpoint
      const response = await fetch(`${credentials.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.apiKey}`,
        },
        body: JSON.stringify(openaiRequest),
      });

      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({
          type: 'error',
          error: {
            type: 'upstream_error',
            message: error,
          },
        });
      }

      const openaiResponse = await response.json();

      // Convert OpenAI response back to Anthropic format
      const anthropicResponse = openAIToAnthropic(openaiResponse as any, body.model);

      return res.json(anthropicResponse);
    } catch (error) {
      console.error('Gateway proxy error:', error);
      return res.status(502).json({
        type: 'error',
        error: {
          type: 'upstream_error',
          message: error instanceof Error ? error.message : 'Gateway error',
        },
      });
    }
  }
}
