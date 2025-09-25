// Note: Google GenAI package has significantly changed APIs
// This is a minimal implementation that maintains compatibility
// Full integration pending proper API migration
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse } from './base';

export class GoogleGeminiProvider extends BaseAIProvider {
  private modelName?: string;

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.GOOGLE_GEMINI });
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Google Gemini API key is required');
    }

    // Store model name for later use
    this.modelName = this.config.model || 'gemini-2.0-flash';

    console.warn('Google Gemini provider is in compatibility mode due to API changes. Full integration coming soon.');
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();
      console.warn('Google Gemini validation: API integration pending, assuming valid config');
      return true;
    } catch (error) {
      console.error('Google Gemini config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    // Current Google Gemini models
    return [
      // Gemini 2.0 Series (Latest)
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',

      // Gemini 1.5 Series (Still available)
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',

      // Gemini 1.0 Series
      'gemini-1.0-pro',
    ];
  }

  async generateText(): Promise<AIResponse> {
    await this.initialize();

    throw new Error(
      'Google Gemini provider is temporarily unavailable due to API migration. ' +
      'Please use an alternative provider:\n' +
      '• OpenAI (set OPENAI_API_KEY)\n' +
      '• Anthropic (set ANTHROPIC_API_KEY)\n' +
      '• Ollama (local, set OLLAMA_HOST if not localhost:11434)\n' +
      'Google Gemini integration will be restored in the next update.'
    );
  }

  async *generateStream(): AsyncGenerator<string> {
    await this.initialize();
    yield ''; // Satisfy generator requirement
    throw new Error('Google Gemini provider temporarily unavailable. Please use an alternative provider.');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  getProviderName(): string {
    return 'google-gemini';
  }

  getModelName(): string {
    return this.modelName || 'gemini-2.0-flash';
  }

  async summarize(): Promise<AIResponse> {
    await this.initialize();
    throw new Error('Google Gemini provider temporarily unavailable. Please use an alternative provider.');
  }

  async analyzeCode(): Promise<AIResponse> {
    await this.initialize();
    throw new Error('Google Gemini provider temporarily unavailable. Please use an alternative provider.');
  }

  async generateDiagram(): Promise<AIResponse> {
    await this.initialize();
    throw new Error('Google Gemini provider temporarily unavailable. Please use an alternative provider.');
  }

  async generateEmbedding(): Promise<number[]> {
    await this.initialize();
    throw new Error('Google Gemini provider temporarily unavailable. Please use an alternative provider.');
  }

  estimateTokens(text: string): number {
    // Rough estimation if provider not available
    return Math.ceil(text.length / 4);
  }
}