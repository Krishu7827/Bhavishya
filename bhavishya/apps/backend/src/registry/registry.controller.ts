import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { RegistryService } from './registry.service';
import { Public } from '../auth/public.decorator';
import { JwtService } from '@nestjs/jwt';
import { IsString, IsNotEmpty, IsArray, IsInt, IsOptional, IsUrl } from 'class-validator';

class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl({ 
    protocols: ['https'],
    require_protocol: true,
    require_tld: false
  })
  baseUrl: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsInt()
  contextWindow: number;

  @IsString()
  @IsNotEmpty()
  pricingNotes: string;
}

class UpdateModelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsInt()
  @IsOptional()
  contextWindow?: number;

  @IsString()
  @IsOptional()
  pricingNotes?: string;
}

@Controller('models')
export class RegistryController {
  constructor(
    private readonly registry: RegistryService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * POST /models
   * Create a new model listing
   */
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateModelDto) {
    try {
      const publisher = req.user as { id: string };
      console.log('[DEBUG] Creating model for publisher:', publisher);
      console.log('[DEBUG] Request body:', dto);
      
      const result = await this.registry.createModel(publisher.id, {
        name: dto.name,
        description: dto.description,
        baseUrl: dto.baseUrl,
        apiKey: dto.apiKey,
        tags: dto.tags,
        contextWindow: dto.contextWindow,
        pricingNotes: dto.pricingNotes,
      });
      
      console.log('[DEBUG] Model created successfully:', result);
      return result;
    } catch (error) {
      console.error('[ERROR] Failed to create model:', error);
      throw error;
    }
  }

  /**
   * GET /models
   * Get all models (public list) or publisher's own models (?mine=true)
   * Note: This endpoint allows optional authentication
   */
  @Public()
  @Get()
  async list(@Req() req: Request, @Query('mine') mine?: string) {
    // Manually validate JWT token if present
    let publisher: { id: string } | undefined;
    
    const authHeader = req.headers.authorization;
    console.log('[DEBUG] Auth header:', authHeader ? 'present' : 'missing');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        console.log('[DEBUG] Token:', token.substring(0, 20) + '...');
        const payload = this.jwtService.verify(token);
        console.log('[DEBUG] Payload:', payload);
        publisher = { id: payload.sub };
      } catch (error) {
        console.log('[DEBUG] Token verification failed:', error.message);
        // Token invalid, continue without user
      }
    }
    
    // If ?mine=true, return only the publisher's models (requires auth)
    if (mine === 'true') {
      console.log('[DEBUG] Mine=true, publisher:', publisher);
      if (!publisher) {
        throw new UnauthorizedException('Authentication required to view your models. Run: future login');
      }
      return this.registry.getPublisherModels(publisher.id);
    }
    
    // Otherwise, return all public models (no auth required)
    return this.registry.getAllModels();
  }

  /**
   * GET /models/:id
   * Get a single model
   */
  @Get(':id')
  async get(@Req() req: Request, @Param('id') id: string) {
    const publisher = req.user as { id: string };
    return this.registry.getModel(id, publisher.id);
  }

  /**
   * PATCH /models/:id
   * Update a model
   */
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateModelDto,
  ) {
    const publisher = req.user as { id: string };
    return this.registry.updateModel(id, publisher.id, dto);
  }

  /**
   * DELETE /models/:id
   * Delete a model
   */
  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const publisher = req.user as { id: string };
    return this.registry.deleteModel(id, publisher.id);
  }
}
