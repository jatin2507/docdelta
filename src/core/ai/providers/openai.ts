import OpenAI from 'openai';
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI | null = null;

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.OPENAI });
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      organization: this.config.organizationId,
      maxRetries: this.config.retryAttempts || 3,
      timeout: this.config.timeout || 60000,
    });
  }

  async validateConfig(): Promise<boolean> {
    try {
      if (!this.client) await this.initialize();
      const models = await this.client!.models.list();
      return models.data.length > 0;
    } catch (error) {
      console.error('OpenAI config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    // Current OpenAI models (updated list)
    return [
      // GPT-4o Series (Latest)
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4o-audio-preview',
      'gpt-4o-realtime-preview',

      // GPT-4 Turbo
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-turbo-2024-04-09',

      // GPT-4
      'gpt-4',
      'gpt-4-32k',

      // GPT-3.5 Turbo
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-instruct',

      // Embeddings
      'text-embedding-3-small',
      'text-embedding-3-large',
      'text-embedding-ada-002',
    ];
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.client) await this.initialize();

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.retry(() =>
      this.client!.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages,
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.7,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
      })
    );

    const usage = response.usage;
    if (usage) {
      this.tokenCount += usage.total_tokens;

      // Record token usage in database
      await this.recordTokenUsage(
        usage.total_tokens,
        'generateText',
        response.model,
        usage.prompt_tokens,
        usage.completion_tokens,
        this.estimateCost(usage.total_tokens, response.model)
      );
    }

    return {
      content: response.choices[0].message.content || '',
      model: response.model,
      tokensUsed: usage?.total_tokens,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      finishReason: response.choices[0].finish_reason || undefined,
    };
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    if (!this.client) await this.initialize();

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const stream = await this.client!.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      messages,
      max_tokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    const systemPrompt = `You are a technical documentation expert. Provide a ${request.style || 'technical'} summary.`;
    const prompt = `Summarize the following content:\n\n${request.content}\n\nContext: ${request.context || 'None'}`;
    return this.generateText(prompt, systemPrompt);
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const analysisPrompts = {
      summary: 'Provide a concise summary of what this code does',
      review: 'Review this code for best practices, potential issues, and improvements',
      documentation: 'Generate comprehensive documentation for this code',
      complexity: 'Analyze the complexity and suggest simplifications',
      security: 'Analyze this code for security vulnerabilities',
    };

    const systemPrompt = `You are a code analysis expert specializing in ${request.language}.`;
    const prompt = `${analysisPrompts[request.analysisType]}:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;

    return this.generateText(prompt, systemPrompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const systemPrompt = `Generate a ${request.format} diagram based on the description. Return only valid ${request.format} syntax.`;
    const prompt = `Create a ${request.type} diagram for: ${request.description}`;
    return this.generateText(prompt, systemPrompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) await this.initialize();

    const response = await this.client!.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private estimateCost(tokens: number, model: string): number {
    // OpenAI pricing as of 2025 (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.50, output: 10.00 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-4': { input: 30.00, output: 60.00 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    // Estimate average cost between input and output
    const avgCost = (modelPricing.input + modelPricing.output) / 2;
    return (tokens / 1_000_000) * avgCost;
  }
}