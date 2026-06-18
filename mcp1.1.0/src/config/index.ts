import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || '',
    baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  },
  model: {
    defaultModel: process.env.DEFAULT_MODEL || 'z-ai/glm-5.1',
    // Model mapping: GitHub Copilot model -> NVIDIA model
    modelMap: {
      'gpt-4': 'z-ai/glm-5.1',
      'gpt-4-turbo': 'z-ai/glm-5.1',
      'gpt-3.5-turbo': 'z-ai/glm-5.1',
      'gpt-3.5-turbo-16k': 'z-ai/glm-5.1',
      'claude-3-opus': 'z-ai/glm-5.1',
      'claude-3-sonnet': 'z-ai/glm-5.1',
    },
  },
  api: {
    // API key for authentication (optional)
    apiKey: process.env.API_KEY || undefined,
  },
};

export const modelRegistry = {
  // Get NVIDIA model for a given GitHub model
  getNvidiaModel(githubModel: string): string {
    const modelMap = config.model.modelMap as Record<string, string>;
    return modelMap[githubModel] || config.model.defaultModel;
  },
  
  // List all available models (for /v1/models endpoint)
  listModels() {
    return Object.keys(config.model.modelMap).map(id => ({
      id,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'nvidia-proxy',
      permission: [] as string[],
      root: id,
      parent: null,
    }));
  },
};
