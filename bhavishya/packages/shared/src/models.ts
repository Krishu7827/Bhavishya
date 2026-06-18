/**
 * Publisher entity - represents a model publisher
 */
export interface Publisher {
  id: string;
  googleId: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model entity - represents a published model
 */
export interface Model {
  id: string;
  publisherId: string;
  name: string;
  description: string;
  baseUrl: string;
  tags: string[];
  contextWindow: number;
  pricingNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model creation payload (from CLI to backend)
 */
export interface CreateModelPayload {
  name: string;
  description: string;
  baseUrl: string;
  apiKey: string;
  tags: string[];
  contextWindow: number;
  pricingNotes: string;
}

/**
 * Model update payload
 */
export interface UpdateModelPayload {
  name?: string;
  description?: string;
  tags?: string[];
  contextWindow?: number;
  pricingNotes?: string;
}

/**
 * Public model listing (no sensitive data)
 */
export interface PublicModel {
  id: string;
  publisherName: string;
  name: string;
  description: string;
  tags: string[];
  contextWindow: number;
  pricingNotes: string;
}

/**
 * Publisher-scoped model (returned to owner)
 */
export interface PublisherModel extends PublicModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
