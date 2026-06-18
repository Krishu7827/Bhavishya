import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { MAX_MODELS_PER_PUBLISHER } from '../common/constants';
import { CreateModelPayload, UpdateModelPayload } from '@future/shared';

@Injectable()
export class RegistryService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /**
   * Create a new model listing
   */
  async createModel(publisherId: string, data: CreateModelPayload) {
    // Check model limit
    const existingCount = await this.prisma.model.count({
      where: { publisherId },
    });

    if (existingCount >= MAX_MODELS_PER_PUBLISHER) {
      throw new BadRequestException(
        `Maximum ${MAX_MODELS_PER_PUBLISHER} models allowed per publisher`,
      );
    }

    // Validate baseUrl (basic check for private IPs)
    this.validateBaseUrl(data.baseUrl);

    // Encrypt API key
    const encryptedApiKey = this.encryption.encrypt(data.apiKey);

    const model = await this.prisma.model.create({
      data: {
        publisherId,
        name: data.name,
        description: data.description,
        baseUrl: data.baseUrl,
        encryptedApiKey,
        tags: data.tags,
        contextWindow: data.contextWindow,
        pricingNotes: data.pricingNotes,
      },
    });

    return this.toPublisherModel(model);
  }

  /**
   * Get all models for a publisher
   */
  async getPublisherModels(publisherId: string) {
    const models = await this.prisma.model.findMany({
      where: { publisherId },
      orderBy: { createdAt: 'desc' },
    });

    return models.map(this.toPublisherModel);
  }

  /**
   * Get all models (public view)
   */
  async getAllModels() {
    const models = await this.prisma.model.findMany({
      include: { publisher: true },
      orderBy: { createdAt: 'desc' },
    });

    return models.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      baseUrl: model.baseUrl,
      tags: model.tags,
      contextWindow: model.contextWindow,
      pricingNotes: model.pricingNotes,
      publisherId: model.publisherId,
      publisher: {
        email: model.publisher.email,
        name: model.publisher.name,
      },
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }));
  }

  /**
   * Get a single model by ID
   */
  async getModel(modelId: string, publisherId: string) {
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (model.publisherId !== publisherId) {
      throw new ForbiddenException('You do not own this model');
    }

    return this.toPublisherModel(model);
  }

  /**
   * Update a model
   */
  async updateModel(
    modelId: string,
    publisherId: string,
    data: UpdateModelPayload,
  ) {
    // Verify ownership
    await this.getModel(modelId, publisherId);

    const model = await this.prisma.model.update({
      where: { id: modelId },
      data: {
        name: data.name,
        description: data.description,
        tags: data.tags,
        contextWindow: data.contextWindow,
        pricingNotes: data.pricingNotes,
      },
    });

    return this.toPublisherModel(model);
  }

  /**
   * Delete a model
   */
  async deleteModel(modelId: string, publisherId: string) {
    await this.getModel(modelId, publisherId);

    await this.prisma.model.delete({
      where: { id: modelId },
    });

    return { success: true };
  }

  /**
   * Get all public models (for matching)
   */
  async getPublicModels() {
    const models = await this.prisma.model.findMany({
      include: { publisher: true },
      orderBy: { createdAt: 'desc' },
    });

    return models.map((model) => ({
      id: model.id,
      publisherId: model.publisherId,
      publisherName: model.publisher.name,
      name: model.name,
      description: model.description,
      tags: model.tags,
      contextWindow: model.contextWindow,
      pricingNotes: model.pricingNotes,
    }));
  }

  /**
   * Get model credentials for gateway (internal use only)
   */
  async getModelCredentials(modelId: string) {
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      return null;
    }

    const apiKey = this.encryption.decrypt(model.encryptedApiKey);

    return {
      modelId: model.id,
      baseUrl: model.baseUrl,
      apiKey,
    };
  }

  /**
   * Validate baseUrl to prevent SSRF attacks
   */
  private validateBaseUrl(baseUrl: string) {
    try {
      const url = new URL(baseUrl);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new BadRequestException('Only http and https protocols are allowed');
      }

      // Block private IP patterns (basic check)
      const blockedPatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^0\.0\.0\.0$/,
        /^169\.254\./,
      ];

      const hostname = url.hostname;
      for (const pattern of blockedPatterns) {
        if (pattern.test(hostname)) {
          throw new BadRequestException('Private IP addresses are not allowed');
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid base URL format');
    }
  }

  /**
   * Convert Prisma model to public format (no sensitive data)
   */
  private toPublisherModel(model: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    contextWindow: number;
    pricingNotes: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      tags: model.tags,
      contextWindow: model.contextWindow,
      pricingNotes: model.pricingNotes,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
