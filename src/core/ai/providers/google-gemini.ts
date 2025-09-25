import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';

export class GoogleGeminiProvider extends BaseAIProvider {
  private client?: GoogleGenAI;
  private modelName: string;

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.GOOGLE_GEMINI });
    this.modelName = config.model || 'gemini-2.0-flash-exp';
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Google Gemini API key is required');
    }

    try {
      this.client = new GoogleGenAI({
        apiKey: this.config.apiKey
      });
    } catch (error) {
      throw new Error(`Failed to initialize Google Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();
      // Test connection with a simple request
      const response = await this.client!.models.generateContent({
        model: this.modelName,
        contents: 'Hello'
      });
      return !!response.text;
    } catch (error) {
      console.error('Google Gemini config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    return [
      // Gemini 2.0 Series (Latest)
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash-001',

      // Gemini 1.5 Series (Still available)
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro-001',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-001',
      'gemini-1.5-flash-8b-latest',
      'gemini-1.5-flash-8b-001',

      // Gemini 1.0 Series
      'gemini-1.0-pro-latest',
      'gemini-1.0-pro-001',
    ];
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    await this.initialize();

    try {
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${prompt}`;
      }

      const response: GenerateContentResponse = await this.client!.models.generateContent({
        model: this.modelName,
        contents: fullPrompt
      });

      const content = response.text || '';
      const tokensUsed = this.estimateTokens(content + fullPrompt);

      this.tokenCount += tokensUsed;
      await this.recordTokenUsage(tokensUsed, 'generateText', this.modelName);

      return {
        content,
        model: this.modelName,
        tokensUsed,
        finishReason: 'stop'
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    await this.initialize();

    try {
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${prompt}`;
      }

      const response = await this.client!.models.generateContentStream({
        model: this.modelName,
        contents: fullPrompt
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      const response = await this.client!.models.generateContent({
        model: this.modelName,
        contents: 'Test connection'
      });
      return !!response.text;
    } catch {
      return false;
    }
  }

  getProviderName(): string {
    return 'google-gemini';
  }

  getModelName(): string {
    return this.modelName;
  }

  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    const systemPrompt = `You are a helpful assistant that creates concise, accurate summaries.
Style: ${request.style || 'technical'}
Max length: ${request.maxLength || 500} words
Language: ${request.language || 'English'}`;

    const prompt = `Please summarize the following content:\n\n${request.content}`;

    if (request.context) {
      return this.generateText(`${prompt}\n\nContext: ${request.context}`, systemPrompt);
    }

    return this.generateText(prompt, systemPrompt);
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const systemPrompt = `You are an expert code analyzer. Provide ${request.analysisType} analysis for ${request.language} code.`;

    const prompt = `Analyze this ${request.language} code:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;

    if (request.context) {
      return this.generateText(`${prompt}\n\nContext: ${request.context}`, systemPrompt);
    }

    return this.generateText(prompt, systemPrompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const systemPrompt = `Generate a ${request.format} ${request.type} diagram based on the description. Return only the diagram code without explanations.`;

    const prompt = `Create a ${request.type} diagram in ${request.format} format for: ${request.description}`;

    return this.generateText(prompt, systemPrompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Google Gemini doesn't provide embedding API through genai package
    // This would require a different approach or separate embedding model
    // Unused parameter for interface compliance
    void text;
    throw new Error('Embedding generation is not supported by Google Gemini through the genai package. Use a dedicated embedding service.');
  }

  estimateTokens(text: string): number {
    // Rough estimation for Gemini models (approximately 4 characters per token)
    return Math.ceil(text.length / 4);
  }
}