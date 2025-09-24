import { AIProvider, AIProviderConfig, IAIProvider, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';
import { AIProviderFactory } from './factory';

export interface AIProviderManagerConfig {
  providers: AIProviderConfig[];
  primaryProvider?: AIProvider;
  fallbackProviders?: AIProvider[];
  enableFallback?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export class AIProviderManager {
  private providers: Map<AIProvider, IAIProvider> = new Map();
  private primaryProvider?: IAIProvider;
  private fallbackProviders: IAIProvider[] = [];
  private config: AIProviderManagerConfig;

  constructor(config: AIProviderManagerConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize all configured providers
    for (const providerConfig of this.config.providers) {
      try {
        const provider = AIProviderFactory.create(providerConfig);
        this.providers.set(providerConfig.provider, provider);

        // Set primary provider
        if (providerConfig.provider === this.config.primaryProvider) {
          this.primaryProvider = provider;
        }

        // Add to fallback providers if specified
        if (this.config.fallbackProviders?.includes(providerConfig.provider)) {
          this.fallbackProviders.push(provider);
        }
      } catch (error) {
        console.error(`Failed to initialize provider ${providerConfig.provider}:`, error);
      }
    }

    // If no primary provider set, use the first one
    if (!this.primaryProvider && this.providers.size > 0) {
      this.primaryProvider = this.providers.values().next().value;
    }
  }

  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    const providerValues = Array.from(this.providers.values());
    for (const provider of providerValues) {
      initPromises.push(
        provider.initialize().catch(error => {
          console.error(`Provider initialization failed:`, error);
        })
      );
    }

    await Promise.all(initPromises);
  }

  async validateProviders(): Promise<Map<AIProvider, boolean>> {
    const validationResults = new Map<AIProvider, boolean>();

    const providerEntries = Array.from(this.providers.entries());
    for (const [providerType, provider] of providerEntries) {
      const isValid = await provider.validateConfig();
      validationResults.set(providerType, isValid);
    }

    return validationResults;
  }

  getProvider(provider?: AIProvider): IAIProvider | undefined {
    if (provider) {
      return this.providers.get(provider);
    }
    return this.primaryProvider;
  }

  setPrimaryProvider(provider: AIProvider): void {
    const providerInstance = this.providers.get(provider);
    if (providerInstance) {
      this.primaryProvider = providerInstance;
    } else {
      throw new Error(`Provider ${provider} not configured`);
    }
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    provider?: AIProvider
  ): Promise<AIResponse> {
    const targetProvider = provider ? this.providers.get(provider) : this.primaryProvider;

    if (!targetProvider) {
      throw new Error('No provider available');
    }

    try {
      return await targetProvider.generateText(prompt, systemPrompt);
    } catch (error) {
      if (this.config.enableFallback && this.fallbackProviders.length > 0) {
        return this.executeWithFallback(
          async (p) => p.generateText(prompt, systemPrompt)
        );
      }
      throw error;
    }
  }

  async *generateStream(
    prompt: string,
    systemPrompt?: string,
    provider?: AIProvider
  ): AsyncGenerator<string> {
    const targetProvider = provider ? this.providers.get(provider) : this.primaryProvider;

    if (!targetProvider) {
      throw new Error('No provider available');
    }

    yield* targetProvider.generateStream(prompt, systemPrompt);
  }

  async summarize(
    request: SummarizationRequest,
    provider?: AIProvider
  ): Promise<AIResponse> {
    const targetProvider = provider ? this.providers.get(provider) : this.primaryProvider;

    if (!targetProvider) {
      throw new Error('No provider available');
    }

    try {
      return await targetProvider.summarize(request);
    } catch (error) {
      if (this.config.enableFallback && this.fallbackProviders.length > 0) {
        return this.executeWithFallback(
          async (p) => p.summarize(request)
        );
      }
      throw error;
    }
  }

  async analyzeCode(
    request: CodeAnalysisRequest,
    provider?: AIProvider
  ): Promise<AIResponse> {
    // Prefer code-specialized providers for code analysis
    let targetProvider = provider ? this.providers.get(provider) : this.primaryProvider;

    if (!provider && !targetProvider) {
      // Try to find a code-specialized provider
      const providerEntries = Array.from(this.providers.entries());
      for (const [type, instance] of providerEntries) {
        const info = AIProviderFactory.getProviderInfo(type);
        if (info.isSpecializedForCode) {
          targetProvider = instance;
          break;
        }
      }
    }

    if (!targetProvider) {
      throw new Error('No provider available');
    }

    try {
      return await targetProvider.analyzeCode(request);
    } catch (error) {
      if (this.config.enableFallback && this.fallbackProviders.length > 0) {
        return this.executeWithFallback(
          async (p) => p.analyzeCode(request)
        );
      }
      throw error;
    }
  }

  async generateDiagram(
    request: DiagramGenerationRequest,
    provider?: AIProvider
  ): Promise<AIResponse> {
    const targetProvider = provider ? this.providers.get(provider) : this.primaryProvider;

    if (!targetProvider) {
      throw new Error('No provider available');
    }

    try {
      return await targetProvider.generateDiagram(request);
    } catch (error) {
      if (this.config.enableFallback && this.fallbackProviders.length > 0) {
        return this.executeWithFallback(
          async (p) => p.generateDiagram(request)
        );
      }
      throw error;
    }
  }

  async generateEmbedding(
    text: string,
    provider?: AIProvider
  ): Promise<number[]> {
    const targetProvider = provider ? this.providers.get(provider) : this.primaryProvider;

    if (!targetProvider) {
      throw new Error('No provider available');
    }

    return targetProvider.generateEmbedding(text);
  }

  private async executeWithFallback<T>(
    operation: (provider: IAIProvider) => Promise<T>
  ): Promise<T> {
    const errors: Error[] = [];

    // Try primary provider first
    if (this.primaryProvider) {
      try {
        return await operation(this.primaryProvider);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // Try fallback providers
    for (const provider of this.fallbackProviders) {
      try {
        console.log(`Falling back to provider...`);
        return await operation(provider);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed. Errors: ${errors.map(e => e.message).join('; ')}`
    );
  }

  getTokenCount(): number {
    let totalTokens = 0;
    const providerValues = Array.from(this.providers.values());
    for (const provider of providerValues) {
      totalTokens += provider.getTokenCount();
    }
    return totalTokens;
  }

  resetTokenCount(): void {
    const providerValues = Array.from(this.providers.values());
    for (const provider of providerValues) {
      provider.resetTokenCount();
    }
  }

  getProviderTokenCount(provider: AIProvider): number {
    const providerInstance = this.providers.get(provider);
    return providerInstance?.getTokenCount() || 0;
  }

  async getAvailableModels(provider?: AIProvider): Promise<string[]> {
    if (provider) {
      const providerInstance = this.providers.get(provider);
      return providerInstance?.getModelList() || [];
    }

    // Return models from all providers
    const allModels: string[] = [];
    const providerEntries = Array.from(this.providers.entries());
    for (const [type, instance] of providerEntries) {
      const models = await instance.getModelList();
      const providerName = AIProviderFactory.getProviderInfo(type).name;
      allModels.push(...models.map(m => `${providerName}: ${m}`));
    }
    return allModels;
  }

  getConfiguredProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  isProviderConfigured(provider: AIProvider): boolean {
    return this.providers.has(provider);
  }
}