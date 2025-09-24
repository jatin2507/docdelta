import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';

export class LiteLLMProvider extends BaseAIProvider {
  private baseURL: string;
  private apiKey?: string;

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.LITELLM });
    this.baseURL = config.baseURL || 'http://localhost:4000'; // Default LiteLLM proxy port
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<void> {
    // LiteLLM proxy may or may not require API key depending on configuration
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Test connection to LiteLLM proxy
      const response = await fetch(`${this.baseURL}/health`);
      if (!response.ok) {
        throw new Error('LiteLLM proxy is not reachable');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Cannot connect to LiteLLM proxy at ${this.baseURL}. Error: ${errorMessage}. Make sure LiteLLM proxy is running.`);
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      console.error('LiteLLM config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    try {
      const headers: any = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseURL}/v1/models`, { headers });
      const data: any = await response.json();
      return data.data?.map((m: any) => m.id) || this.getDefaultModels();
    } catch {
      return this.getDefaultModels();
    }
  }

  private getDefaultModels(): string[] {
    // Common models supported by LiteLLM proxy
    return [
      // OpenAI models
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4-turbo',
      'openai/gpt-4',
      'openai/gpt-3.5-turbo',

      // Anthropic models
      'anthropic/claude-3-5-sonnet-20241022',
      'anthropic/claude-3-5-haiku-20241022',
      'anthropic/claude-3-opus-20240229',

      // Google models
      'gemini/gemini-2.0-flash',
      'gemini/gemini-2.5-pro',
      'gemini/gemini-2.5-flash',

      // Ollama models
      'ollama/llama3.2',
      'ollama/codellama',
      'ollama/mistral',

      // Other providers
      'cohere/command-r',
      'groq/llama3-70b-8192',
      'together_ai/meta-llama/Llama-2-70b-chat-hf',
      'huggingface/microsoft/DialoGPT-medium',
    ];
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    await this.initialize();

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const headers: any = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await this.retry(async () => {
      const res = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.model || 'openai/gpt-4o-mini',
          messages,
          max_tokens: this.config.maxTokens || 2000,
          temperature: this.config.temperature || 0.7,
          top_p: this.config.topP,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty,
          stop: this.config.stopSequences,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`LiteLLM error: ${error}`);
      }

      return res.json() as Promise<any>;
    });

    const usage = (response as any).usage;
    if (usage) {
      this.tokenCount += usage.total_tokens;
    }

    return {
      content: (response as any).choices?.[0]?.message?.content || '',
      model: (response as any).model,
      tokensUsed: usage?.total_tokens,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      finishReason: (response as any).choices?.[0]?.finish_reason,
    };
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    await this.initialize();

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const headers: any = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model || 'openai/gpt-4o-mini',
        messages,
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.7,
        stream: true,
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e: unknown) {
              // Skip invalid JSON - error details logged for debugging
              console.debug('JSON parse error:', e instanceof Error ? e.message : String(e));
            }
          }
        }
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

    const systemPrompt = `You are an expert ${request.language} developer and code reviewer.`;
    const prompt = `${prompts[request.analysisType]}:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;

    return this.generateText(prompt, systemPrompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const systemPrompt = 'You are an expert at creating technical diagrams. Generate clean, valid diagram code.';
    const prompt = `Generate a ${request.type} diagram in ${request.format} format for: ${request.description}. Return only the diagram code without any explanation or markdown formatting.`;

    return this.generateText(prompt, systemPrompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    const headers: any = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/v1/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: text,
      }),
    });

    const data: any = await response.json();
    return data.data?.[0]?.embedding || [];
  }

  estimateTokens(text: string): number {
    // Rough estimation since it depends on the underlying model
    return Math.ceil(text.length / 4);
  }

  // LiteLLM-specific methods
  async getHealth(): Promise<any> {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  async getProviderInfo(): Promise<any> {
    const headers: any = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/v1/models`, { headers });
    return response.json();
  }

  // Method to switch underlying provider/model
  async switchModel(model: string): Promise<void> {
    this.config.model = model;
  }
}