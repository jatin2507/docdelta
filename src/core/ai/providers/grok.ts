import { xai } from '@ai-sdk/xai';
import { generateText, streamText } from 'ai';
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';

export class GrokProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.GROK });

    if (!config.apiKey) {
      throw new Error('Grok AI requires an API key');
    }
  }

  async initialize(): Promise<void> {
    // Test API key validity by making a small request
    try {
      const model = xai(this.config.model || 'grok-3-beta');
      await generateText({
        model,
        prompt: 'test',
        maxOutputTokens: 1,
      });
    } catch (error: any) {
      throw new Error(`Grok AI initialization failed: ${error.message}`);
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      console.error('Grok AI config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    return [
      // Current Grok models (2025)
      'grok-4',
      'grok-4-fast',
      'grok-3',
      'grok-3-beta',
      'grok-3-mini',
      'grok-3-mini-fast',
      'grok-code-fast-1',

      // Legacy models that might still be available
      'grok-2',
      'grok-2-mini',
      'grok-1',
    ];
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const model = xai(this.config.model || 'grok-3-beta');

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.retry(async () => {
      return await generateText({
        model,
        messages,
        maxOutputTokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.7,
        topP: this.config.topP,
        topK: this.config.topK,
        frequencyPenalty: this.config.frequencyPenalty,
        presencePenalty: this.config.presencePenalty,
      });
    });

    // Estimate token usage (since AI SDK might not always provide exact counts)
    const tokensUsed = response.usage?.totalTokens || this.estimateTokens(response.text);
    this.tokenCount += tokensUsed;

    return {
      content: response.text,
      model: this.config.model || 'grok-3-beta',
      tokensUsed,
      promptTokens: (response.usage as any)?.promptTokens,
      completionTokens: (response.usage as any)?.completionTokens,
      finishReason: response.finishReason,
      metadata: {
        provider: 'grok',
        usage: response.usage,
      },
    };
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    const model = xai(this.config.model || 'grok-3-beta');

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const result = await streamText({
      model,
      messages,
      maxOutputTokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature || 0.7,
    });

    for await (const delta of result.textStream) {
      yield delta;
    }
  }

  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    const systemPrompt = `You are Grok AI, an expert at creating ${request.style || 'technical'} summaries. Provide clear, concise, and informative summaries.`;
    const prompt = `Summarize the following content in a ${request.style || 'technical'} style:\n\n${request.content}${
      request.context ? `\n\nAdditional context: ${request.context}` : ''
    }`;

    return this.generateText(prompt, systemPrompt);
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const prompts = {
      summary: 'Analyze and explain what this code does, including its purpose, functionality, and key components',
      review: 'Review this code for best practices, potential bugs, performance issues, and suggest improvements',
      documentation: 'Generate comprehensive documentation for this code including usage examples, parameters, and return values',
      complexity: 'Analyze the time and space complexity of this code, identifying bottlenecks and optimization opportunities',
      security: 'Perform a security analysis of this code, identifying vulnerabilities, security risks, and recommended fixes',
    };

    const systemPrompt = `You are Grok AI, an expert ${request.language} developer with deep knowledge of software engineering best practices. Provide detailed, actionable insights.`;
    const prompt = `${prompts[request.analysisType]}:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\`${
      request.context ? `\n\nContext: ${request.context}` : ''
    }`;

    return this.generateText(prompt, systemPrompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const systemPrompt = `You are Grok AI, an expert at creating technical diagrams. Generate clean, well-structured ${request.format} code that accurately represents the requested diagram.`;
    const prompt = `Generate a ${request.type} diagram in ${request.format} format for: ${request.description}.

Requirements:
- Return only the ${request.format} code without explanations or markdown formatting
- Ensure the diagram is complete and properly structured
- Use appropriate styling and layout for clarity`;

    return this.generateText(prompt, systemPrompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // xAI doesn't currently offer embedding models, so we'll use a simple fallback
    console.warn('Grok embedding not available, using simple text-based embedding fallback');
    return this.generateSimpleEmbedding(text);
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding fallback (not ideal but functional)
    const embedding = new Array(384).fill(0);
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % 384] += charCode / 1000;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  estimateTokens(text: string): number {
    // Grok uses similar tokenization to GPT models
    return Math.ceil(text.length / 3.5);
  }

  // Grok-specific methods

  async generateWithSearch(prompt: string, useSearch: boolean = true): Promise<AIResponse> {
    // This would use Grok's Live Search capability if available through the SDK
    const systemPrompt = useSearch
      ? 'You have access to real-time search. Use it to provide up-to-date, accurate information with citations.'
      : undefined;

    return this.generateText(prompt, systemPrompt);
  }

  async generateWithReasoning(prompt: string, reasoningEffort?: 'low' | 'medium' | 'high'): Promise<AIResponse> {
    // For grok-3-mini and grok-3-mini-fast models that support reasoning effort
    const isReasoningModel = this.config.model?.includes('mini');

    if (!isReasoningModel) {
      console.warn('Reasoning effort only supported by grok-3-mini and grok-3-mini-fast models');
    }

    const systemPrompt = reasoningEffort
      ? `Use ${reasoningEffort} reasoning effort to analyze and respond to this query thoroughly.`
      : undefined;

    return this.generateText(prompt, systemPrompt);
  }

  async codeAnalysis(code: string, language: string, task: string = 'analyze'): Promise<AIResponse> {
    // Use grok-code-fast-1 model if available for coding tasks
    const originalModel = this.config.model;
    const models = await this.getModelList();
    if (models.includes('grok-code-fast-1')) {
      this.config.model = 'grok-code-fast-1';
    }

    const systemPrompt = 'You are Grok AI, specialized in code analysis and development. Provide expert-level insights and solutions.';
    const prompt = `${task} the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    const result = await this.generateText(prompt, systemPrompt);

    // Restore original model
    this.config.model = originalModel;

    return result;
  }
}