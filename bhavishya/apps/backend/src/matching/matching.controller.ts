import { Controller, Post, Body } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { Public } from '../auth/public.decorator';
import { IsString, IsNotEmpty } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

class SuggestDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}

@Controller('suggest')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  /**
   * POST /suggest
   * Find matching models for a query
   * Public endpoint - no auth required
   */
  @Post()
  @Public()
  @Throttle({ medium: { limit: 20, ttl: 60000 } })
  async suggest(@Body() dto: SuggestDto) {
    const suggestions = await this.matching.suggestModels(dto.query);
    return {
      suggestions,
      query: dto.query,
    };
  }
}
