import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';

export class AnthropicProvider extends BaseAIProvider {
  private client?: Anthropic;

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.ANTHROPIC });
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.retryAttempts,
    });
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();
      // Try a minimal request to validate the API key
      if (!this.client) throw new Error('Anthropic client not initialized');
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      console.error('Anthropic config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    // Current Anthropic Claude models
    return [
      // Claude 3.5 Series
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',

      // Claude 3 Series
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',

      // Legacy models
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.client) await this.initialize();

    const response = await this.retry(async () => {
      if (!this.client) throw new Error('Anthropic client not initialized');
      const message = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        top_k: this.config.topK,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stop_sequences: this.config.stopSequences,
      });

      return message;
    });

    const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens;
    if (tokensUsed) {
      this.tokenCount += tokensUsed;
    }

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n');

    return {
      content,
      model: response.model,
      tokensUsed,
      promptTokens: response.usage?.input_tokens,
      completionTokens: response.usage?.output_tokens,
      finishReason: response.stop_reason || undefined,
    };
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    if (!this.client) await this.initialize();

    if (!this.client) throw new Error('Anthropic client not initialized');
    const stream = await this.client.messages.create({
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
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

    const systemPrompt = `You are Claude, an expert ${request.language} developer and code reviewer.`;
    const prompt = `${prompts[request.analysisType]}:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;

    return this.generateText(prompt, systemPrompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const systemPrompt = 'You are an expert at creating technical diagrams. Generate clean, valid diagram code.';
    const prompt = `Generate a ${request.type} diagram in ${request.format} format for: ${request.description}. Return only the diagram code without any explanation or markdown formatting.`;

    return this.generateText(prompt, systemPrompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Anthropic doesn't provide embeddings directly
    // You would need to use a different service or model for embeddings
    throw new Error(`Anthropic does not support embeddings for text: "${text.substring(0, 50)}...". Use OpenAI or another provider for embedding generation.`);
  }

  estimateTokens(text: string): number {
    // Claude uses a similar tokenization to GPT models
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}