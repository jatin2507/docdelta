import { AIProvider, AIProviderConfig, IAIProvider } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleGeminiProvider } from './google-gemini';
import { GitHubCopilotProvider } from './github-copilot';
import { OllamaProvider } from './ollama';
import { LiteLLMProvider } from './litellm';
import { GrokProvider } from './grok';

export class AIProviderFactory {
  private static providers = new Map<AIProvider, new (config: AIProviderConfig) => IAIProvider>([
    [AIProvider.OPENAI, OpenAIProvider],
    [AIProvider.ANTHROPIC, AnthropicProvider],
    [AIProvider.GOOGLE_GEMINI, GoogleGeminiProvider],
    [AIProvider.GITHUB_COPILOT, GitHubCopilotProvider],
    [AIProvider.OLLAMA, OllamaProvider],
    [AIProvider.LITELLM, LiteLLMProvider],
    [AIProvider.GROK, GrokProvider],
  ]);

  static create(config: AIProviderConfig): IAIProvider {
    const ProviderClass = this.providers.get(config.provider);

    if (!ProviderClass) {
      throw new Error(`Unknown AI provider: ${config.provider}`);
    }

    return new ProviderClass(config);
  }

  static getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  static isProviderSupported(provider: AIProvider): boolean {
    return this.providers.has(provider);
  }

  static getProviderInfo(provider: AIProvider): {
    name: string;
    requiresApiKey: boolean;
    supportedFeatures: string[];
    isLocal: boolean;
    isSpecializedForCode: boolean;
    description: string;
  } {
    const providerInfo: Record<AIProvider, any> = {
      [AIProvider.OPENAI]: {
        name: 'OpenAI',
        requiresApiKey: true,
        supportedFeatures: ['text', 'code', 'embeddings', 'streaming', 'vision'],
        isLocal: false,
        isSpecializedForCode: false,
        description: 'OpenAI GPT models including GPT-4o, GPT-4 Turbo, and GPT-3.5 Turbo',
      },
      [AIProvider.ANTHROPIC]: {
        name: 'Anthropic Claude',
        requiresApiKey: true,
        supportedFeatures: ['text', 'code', 'streaming', 'vision'],
        isLocal: false,
        isSpecializedForCode: false,
        description: 'Claude 3.5 and Claude 3 models with advanced reasoning capabilities',
      },
      [AIProvider.GOOGLE_GEMINI]: {
        name: 'Google Gemini',
        requiresApiKey: true,
        supportedFeatures: ['text', 'code', 'embeddings', 'streaming', 'vision', 'multimodal'],
        isLocal: false,
        isSpecializedForCode: false,
        description: 'Google Gemini 2.5, 2.0, and 1.5 models with multimodal capabilities',
      },
      [AIProvider.GITHUB_COPILOT]: {
        name: 'GitHub Copilot',
        requiresApiKey: true,
        supportedFeatures: ['code', 'embeddings', 'streaming'],
        isLocal: false,
        isSpecializedForCode: true,
        description: 'GitHub Copilot models optimized for code generation and analysis',
      },
      [AIProvider.OLLAMA]: {
        name: 'Ollama',
        requiresApiKey: false,
        supportedFeatures: ['text', 'code', 'embeddings', 'streaming'],
        isLocal: true,
        isSpecializedForCode: false,
        description: 'Local models including Llama, Mistral, CodeLlama, and many others',
      },
      [AIProvider.LITELLM]: {
        name: 'LiteLLM Proxy',
        requiresApiKey: false,
        supportedFeatures: ['text', 'code', 'embeddings', 'streaming'],
        isLocal: true,
        isSpecializedForCode: false,
        description: 'Unified proxy for 100+ LLM providers with OpenAI-compatible API',
      },
      [AIProvider.GROK]: {
        name: 'xAI Grok',
        requiresApiKey: true,
        supportedFeatures: ['text', 'code', 'streaming', 'search', 'reasoning'],
        isLocal: false,
        isSpecializedForCode: true,
        description: 'xAI Grok models with real-time search and advanced reasoning capabilities',
      },
    };

    return providerInfo[provider] || {
      name: provider,
      requiresApiKey: true,
      supportedFeatures: ['text'],
      isLocal: false,
      isSpecializedForCode: false,
      description: `${provider} provider`,
    };
  }

  static getRecommendations(): {
    general: AIProvider;
    code: AIProvider;
    local: AIProvider;
    costEffective: AIProvider;
    multimodal: AIProvider;
  } {
    return {
      general: AIProvider.OPENAI, // GPT-4o-mini is fast and cost-effective
      code: AIProvider.GROK, // Grok-code-fast-1 excels at coding tasks
      local: AIProvider.OLLAMA, // Best local option with many models
      costEffective: AIProvider.OPENAI, // GPT-4o-mini
      multimodal: AIProvider.GOOGLE_GEMINI, // Best multimodal capabilities
    };
  }
}