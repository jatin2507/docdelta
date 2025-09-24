/**
 * AI Model Registry - Updated with latest models from models.dev
 * Contains exact model identifiers for API calls
 */

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricing?: {
    inputTokens: number; // per 1M tokens
    outputTokens: number; // per 1M tokens
  };
  capabilities: string[];
  isLegacy?: boolean;
  description: string;
}

export const MODEL_REGISTRY: { [key: string]: ModelInfo } = {
  // OpenAI Models
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 0.50, outputTokens: 1.50 },
    capabilities: ['text', 'code', 'reasoning'],
    description: 'Fast and efficient model for most tasks'
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 30.00, outputTokens: 60.00 },
    capabilities: ['text', 'code', 'reasoning', 'complex-analysis'],
    description: 'High-quality model for complex reasoning'
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 10.00, outputTokens: 30.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision'],
    description: 'Faster GPT-4 with larger context window'
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 5.00, outputTokens: 15.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'audio'],
    description: 'Multimodal flagship model'
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    pricing: { inputTokens: 0.15, outputTokens: 0.60 },
    capabilities: ['text', 'code', 'reasoning', 'vision'],
    description: 'Cost-effective multimodal model'
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 50.00, outputTokens: 100.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'audio', 'advanced-reasoning'],
    description: 'Next-generation language model with enhanced capabilities'
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 2.00, outputTokens: 6.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision'],
    description: 'Efficient GPT-5 variant for cost-conscious applications'
  },

  // Anthropic Claude Models
  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 0.25, outputTokens: 1.25 },
    capabilities: ['text', 'code', 'reasoning'],
    description: 'Fast and lightweight Claude model'
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 0.80, outputTokens: 4.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision'],
    description: 'Enhanced Haiku with improved performance'
  },
  'claude-3-sonnet-20240229': {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 3.00, outputTokens: 15.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision'],
    description: 'Balanced performance and speed'
  },
  'claude-3-5-sonnet-20240620': {
    id: 'claude-3-5-sonnet-20240620',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 3.00, outputTokens: 15.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'artifacts'],
    description: 'Most popular Claude model with excellent code capabilities'
  },
  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 15.00, outputTokens: 75.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'complex-analysis'],
    description: 'Most capable Claude model for complex tasks'
  },
  'claude-opus-4-20250514': {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    contextWindow: 300000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 25.00, outputTokens: 125.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'complex-analysis', 'advanced-reasoning'],
    description: 'Next-generation Claude with advanced reasoning capabilities'
  },

  // Google Gemini Models
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google-gemini',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 0.075, outputTokens: 0.30 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'audio'],
    description: 'Fast multimodal model with large context'
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google-gemini',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 1.25, outputTokens: 5.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'audio', 'video'],
    description: 'Professional multimodal model with massive context'
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google-gemini',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 0.075, outputTokens: 0.30 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'audio', 'multimodal-generation'],
    description: 'Next-generation fast multimodal model'
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google-gemini',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 0.10, outputTokens: 0.40 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'audio', 'real-time'],
    description: 'Enhanced Flash model with real-time capabilities'
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google-gemini',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 2.50, outputTokens: 10.00 },
    capabilities: ['text', 'code', 'reasoning', 'vision', 'audio', 'video', 'advanced-multimodal'],
    description: 'Most advanced Gemini model with comprehensive capabilities'
  },

  // xAI Grok Models
  'grok-3': {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'grok',
    contextWindow: 131072,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 2.00, outputTokens: 10.00 },
    capabilities: ['text', 'code', 'reasoning', 'real-time-search'],
    description: 'Advanced reasoning model with real-time web access'
  },
  'grok-3-mini': {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'grok',
    contextWindow: 131072,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 0.20, outputTokens: 1.00 },
    capabilities: ['text', 'code', 'reasoning'],
    description: 'Efficient Grok model for cost-effective applications'
  },
  'grok-4': {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'grok',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: { inputTokens: 5.00, outputTokens: 20.00 },
    capabilities: ['text', 'code', 'reasoning', 'real-time-search', 'multimodal'],
    description: 'Next-generation Grok with enhanced capabilities'
  },

  // Ollama Models (Local)
  'llama3.1:8b': {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    provider: 'ollama',
    contextWindow: 131072,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 0, outputTokens: 0 }, // Local model
    capabilities: ['text', 'code', 'reasoning'],
    description: 'Efficient local language model'
  },
  'llama3.1:70b': {
    id: 'llama3.1:70b',
    name: 'Llama 3.1 70B',
    provider: 'ollama',
    contextWindow: 131072,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 0, outputTokens: 0 },
    capabilities: ['text', 'code', 'reasoning', 'complex-analysis'],
    description: 'High-performance local language model'
  },
  'codellama:13b': {
    id: 'codellama:13b',
    name: 'Code Llama 13B',
    provider: 'ollama',
    contextWindow: 16384,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 0, outputTokens: 0 },
    capabilities: ['code', 'reasoning'],
    description: 'Specialized local model for code generation'
  },
  'mistral:7b': {
    id: 'mistral:7b',
    name: 'Mistral 7B',
    provider: 'ollama',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 0, outputTokens: 0 },
    capabilities: ['text', 'code', 'reasoning'],
    description: 'Efficient multilingual local model'
  },
  'phi3:mini': {
    id: 'phi3:mini',
    name: 'Phi-3 Mini',
    provider: 'ollama',
    contextWindow: 131072,
    maxOutputTokens: 4096,
    pricing: { inputTokens: 0, outputTokens: 0 },
    capabilities: ['text', 'reasoning'],
    description: 'Small but capable local model'
  }
};

export class ModelValidator {
  static isValidModel(modelId: string, provider?: string): boolean {
    const model = MODEL_REGISTRY[modelId];
    if (!model) return false;
    if (provider && model.provider !== provider) return false;
    return !model.isLegacy;
  }

  static getModelInfo(modelId: string): ModelInfo | null {
    return MODEL_REGISTRY[modelId] || null;
  }

  static getModelsForProvider(provider: string): ModelInfo[] {
    return Object.values(MODEL_REGISTRY).filter(model => model.provider === provider);
  }

  static getRecommendedModels(): {
    general: ModelInfo;
    costEffective: ModelInfo;
    codeSpecialized: ModelInfo;
    multimodal: ModelInfo;
    local: ModelInfo;
    enterprise: ModelInfo;
  } {
    return {
      general: MODEL_REGISTRY['gpt-4o'],
      costEffective: MODEL_REGISTRY['gpt-4o-mini'],
      codeSpecialized: MODEL_REGISTRY['claude-3-5-sonnet-20240620'],
      multimodal: MODEL_REGISTRY['gemini-2.0-flash'],
      local: MODEL_REGISTRY['llama3.1:8b'],
      enterprise: MODEL_REGISTRY['claude-3-opus-20240229']
    };
  }

  static validateModelForTask(modelId: string, requiredCapabilities: string[]): boolean {
    const model = MODEL_REGISTRY[modelId];
    if (!model) return false;

    return requiredCapabilities.every(capability =>
      model.capabilities.includes(capability)
    );
  }

  static getContextWindowInfo(modelId: string): { contextWindow: number; maxOutput: number } | null {
    const model = MODEL_REGISTRY[modelId];
    if (!model) return null;

    return {
      contextWindow: model.contextWindow,
      maxOutput: model.maxOutputTokens
    };
  }

  static estimateCost(modelId: string, inputTokens: number, outputTokens: number): number | null {
    const model = MODEL_REGISTRY[modelId];
    if (!model || !model.pricing) return null;

    const inputCost = (inputTokens / 1000000) * model.pricing.inputTokens;
    const outputCost = (outputTokens / 1000000) * model.pricing.outputTokens;

    return inputCost + outputCost;
  }

  static getAllModelIds(): string[] {
    return Object.keys(MODEL_REGISTRY);
  }

  static getProviders(): string[] {
    return [...new Set(Object.values(MODEL_REGISTRY).map(model => model.provider))];
  }

  static findSimilarModels(modelId: string): ModelInfo[] {
    const targetModel = MODEL_REGISTRY[modelId];
    if (!targetModel) return [];

    return Object.values(MODEL_REGISTRY)
      .filter(model =>
        model.id !== modelId &&
        model.provider === targetModel.provider &&
        model.capabilities.some(cap => targetModel.capabilities.includes(cap))
      )
      .slice(0, 5);
  }

  static isModelDeprecated(modelId: string): boolean {
    const model = MODEL_REGISTRY[modelId];
    return model?.isLegacy || false;
  }

  static getModelsByCapability(capability: string): ModelInfo[] {
    return Object.values(MODEL_REGISTRY)
      .filter(model => model.capabilities.includes(capability))
      .sort((a, b) => (a.pricing?.inputTokens || 0) - (b.pricing?.inputTokens || 0));
  }
}

// Example usage and validation functions
export const EXAMPLE_CONFIGS = {
  openai: {
    provider: 'openai',
    model: 'gpt-4o-mini', // Current recommended model
    apiKey: 'your-openai-api-key'
  },
  anthropic: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20240620', // Current recommended model
    apiKey: 'your-anthropic-api-key'
  },
  google: {
    provider: 'google-gemini',
    model: 'gemini-2.0-flash', // Current recommended model
    apiKey: 'your-google-ai-api-key'
  },
  grok: {
    provider: 'grok',
    model: 'grok-3', // Current recommended model
    apiKey: 'your-xai-api-key'
  },
  ollama: {
    provider: 'ollama',
    model: 'llama3.1:8b', // Current recommended local model
    baseURL: 'http://localhost:11434' // Default Ollama URL
  }
};

export const MODEL_VALIDATION_ERRORS = {
  INVALID_MODEL: 'Invalid model ID. Please check the model registry for valid models.',
  PROVIDER_MISMATCH: 'Model does not match the specified provider.',
  DEPRECATED_MODEL: 'This model is deprecated. Please use a newer version.',
  INSUFFICIENT_CAPABILITIES: 'Model does not support required capabilities for this task.',
  CONTEXT_LIMIT_EXCEEDED: 'Input exceeds model context window limit.'
};