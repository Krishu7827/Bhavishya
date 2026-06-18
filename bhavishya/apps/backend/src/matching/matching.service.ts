import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ModelSuggestion } from '@future/shared';

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find matching models based on query
   * Uses simple keyword/tag overlap scoring
   */
  async suggestModels(query: string): Promise<ModelSuggestion[]> {
    // Get all models with publisher info
    const models = await this.prisma.model.findMany({
      include: { publisher: true },
    });

    // Extract keywords from query
    const queryKeywords = this.extractKeywords(query);

    if (queryKeywords.length === 0) {
      // Return top models by creation date if no keywords
      return models.slice(0, 5).map((model) => ({
        modelId: model.id,
        modelName: model.name,
        publisherName: model.publisher.name,
        description: model.description,
        tags: model.tags,
        matchScore: 0.5,
        whyMatched: 'Popular model',
      }));
    }

    // Score each model
    const scoredModels = models.map((model) => {
      const score = this.calculateScore(queryKeywords, model);
      return { model, score };
    });

    // Sort by score descending and take top 5
    scoredModels.sort((a, b) => b.score.score - a.score.score);

    return scoredModels.slice(0, 5).map(({ model, score }) => ({
      modelId: model.id,
      modelName: model.name,
      publisherName: model.publisher.name,
      description: model.description,
      tags: model.tags,
      matchScore: score.score,
      whyMatched: score.reason,
    }));
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    // Common stop words to ignore
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
      'because', 'until', 'while', 'about', 'against', 'i', 'me', 'my',
      'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
      'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
      'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
      'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
      'these', 'those', 'am',
    ]);

    return query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 1 && !stopWords.has(word));
  }

  /**
   * Calculate match score for a model
   */
  private calculateScore(
    queryKeywords: string[],
    model: { tags: string[]; name: string; description: string },
  ): { score: number; reason: string } {
    let score = 0;
    const matchedReasons: string[] = [];

    // Normalize model data for matching
    const modelKeywords = [
      ...model.tags.map((t) => t.toLowerCase()),
      ...this.extractKeywords(model.name),
      ...this.extractKeywords(model.description),
    ];

    // Check tag matches (higher weight)
    for (const keyword of queryKeywords) {
      const tagMatches = model.tags.filter((tag) =>
        tag.toLowerCase().includes(keyword),
      );
      if (tagMatches.length > 0) {
        score += 0.3 * tagMatches.length;
        matchedReasons.push(`matches tag: ${tagMatches[0]}`);
      }
    }

    // Check keyword overlap (lower weight)
    for (const keyword of queryKeywords) {
      if (modelKeywords.some((mk) => mk.includes(keyword))) {
        score += 0.1;
      }
    }

    // Normalize score to 0-1 range
    const normalizedScore = Math.min(1, score);

    // Generate reason
    let reason = 'General relevance match';
    if (model.tags.some((tag) =>
      queryKeywords.some((kw) => tag.toLowerCase().includes(kw)))
    ) {
      reason = `Matches your needs in: ${model.tags
        .filter((tag) =>
          queryKeywords.some((kw) => tag.toLowerCase().includes(kw))
        )
        .slice(0, 2)
        .join(', ')}`;
    } else if (model.name.toLowerCase().includes(queryKeywords[0])) {
      reason = `Model name matches "${queryKeywords[0]}"`;
    }

    return { score: normalizedScore, reason };
  }
}
