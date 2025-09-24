import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';

export class GoogleGeminiProvider extends BaseAIProvider {
  private client?: GoogleGenerativeAI;
  private model?: any;

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.GOOGLE_GEMINI });
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Google Gemini API key is required');
    }

    this.client = new GoogleGenerativeAI(this.config.apiKey);

    // Initialize the model
    const modelName = this.config.model || 'gemini-2.0-flash';
    this.model = this.client.getGenerativeModel({ model: modelName });
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();
      // Try a minimal request to validate
      const result = await this.model!.generateContent('test');
      return result.response !== undefined;
    } catch (error) {
      console.error('Google Gemini config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    // Current Google Gemini models
    return [
      // Gemini 2.5 Series (Latest)
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash-live',
      'gemini-2.5-flash-image-preview',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',

      // Gemini 2.0 Series
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-live',

      // Gemini 1.5 Series (Still available)
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',

      // Gemini 1.0 Series
      'gemini-1.0-pro',
    ];
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.model) await this.initialize();

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await this.retry(async () => {
      const result = await this.model!.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxTokens,
          stopSequences: this.config.stopSequences,
        },
      });

      return result;
    });

    const text = response.response.text();
    const tokensUsed = response.response.usageMetadata?.totalTokenCount;

    if (tokensUsed) {
      this.tokenCount += tokensUsed;
    }

    return {
      content: text,
      model: this.config.model || 'gemini-2.0-flash',
      tokensUsed,
      promptTokens: response.response.usageMetadata?.promptTokenCount,
      completionTokens: response.response.usageMetadata?.candidatesTokenCount,
      finishReason: response.response.candidates?.[0]?.finishReason,
    };
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    if (!this.model) await this.initialize();

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const result = await this.model!.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
      },
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    const systemPrompt = `You are an expert at summarization. Provide a ${request.style || 'technical'} summary.`;
    const prompt = `Summarize the following content:\n\n${request.content}${
      request.context ? `\n\nContext: ${request.context}` : ''
    }`;

    return this.generateText(prompt, systemPrompt);
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const prompts = {
      summary: 'Explain what this code does in detail',
      review: 'Review this code for bugs, improvements, and best practices',
      documentation: 'Generate comprehensive documentation for this code',
      complexity: 'Analyze the time and space complexity of this code',
      security: 'Check for security vulnerabilities and issues',
    };

    const systemPrompt = `You are Gemini, an expert ${request.language} developer and code reviewer.`;
    const prompt = `${prompts[request.analysisType]}:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;

    return this.generateText(prompt, systemPrompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const systemPrompt = 'You are an expert at creating technical diagrams. Generate clean, valid diagram code.';
    const prompt = `Generate a ${request.type} diagram in ${request.format} format for: ${request.description}. Return only the diagram code without any explanation or markdown formatting.`;

    return this.generateText(prompt, systemPrompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) await this.initialize();

    // Use the embedding model
    const model = this.client!.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);

    return result.embedding.values;
  }

  estimateTokens(text: string): number {
    if (!this.model) {
      // Rough estimation if model not initialized
      return Math.ceil(text.length / 4);
    }

    // Use the model's token counting if available
    try {
      const tokens = this.model.countTokens(text);
      return tokens.totalTokens;
    } catch {
      return Math.ceil(text.length / 4);
    }
  }
}