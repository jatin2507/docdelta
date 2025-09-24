import { Ollama } from 'ollama';
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';

export class OllamaProvider extends BaseAIProvider {
  private client?: Ollama;

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.OLLAMA });
  }

  async initialize(): Promise<void> {
    // Ollama doesn't require API keys
    this.client = new Ollama({
      host: this.config.baseURL || 'http://localhost:11434',
    });

    // Verify the server is reachable
    try {
      await this.client.list();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Cannot connect to Ollama. Error: ${errorMessage}. Make sure Ollama is running.`);
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      console.error('Ollama config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    if (!this.client) await this.initialize();

    try {
      const response = await this.client!.list();
      const installedModels = response.models?.map(m => m.name) || [];

      // Also include commonly available models
      const commonModels = [
        // Llama Models
        'llama3.2:latest',
        'llama3.2:1b',
        'llama3.2:3b',
        'llama3.1:latest',
        'llama3.1:8b',
        'llama3.1:70b',
        'llama3.1:405b',
        'llama2:7b',
        'llama2:13b',
        'llama2:70b',

        // Code Models
        'codellama:7b',
        'codellama:13b',
        'codellama:34b',
        'codellama:70b',
        'deepseek-coder:6.7b',
        'deepseek-coder:33b',
        'starcoder2:3b',
        'starcoder2:7b',
        'starcoder2:15b',

        // Mistral Models
        'mistral:latest',
        'mistral:7b',
        'mixtral:8x7b',
        'mixtral:8x22b',

        // Other Models
        'gemma2:2b',
        'gemma2:9b',
        'gemma2:27b',
        'qwen2.5:0.5b',
        'qwen2.5:1.5b',
        'qwen2.5:3b',
        'qwen2.5:7b',
        'qwen2.5:14b',
        'qwen2.5:32b',
        'qwen2.5:72b',
        'phi3:mini',
        'phi3:medium',
      ];

      // Combine installed and common models, removing duplicates
      const combinedModels = installedModels.concat(commonModels);
      const uniqueModels = combinedModels.filter((model, index) => combinedModels.indexOf(model) === index);
      return uniqueModels;
    } catch {
      // Return default models if API fails
      return ['llama3.2', 'codellama', 'mistral', 'mixtral'];
    }
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.client) await this.initialize();

    const response = await this.retry(async () => {
      const result = await this.client!.generate({
        model: this.config.model || 'llama3.2',
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        options: {
          temperature: this.config.temperature || 0.7,
          top_p: this.config.topP || 0.95,
          top_k: this.config.topK,
          num_predict: this.config.maxTokens || 2000,
          repeat_penalty: this.config.repetitionPenalty,
          stop: this.config.stopSequences,
        },
      });

      return result;
    });

    // Estimate tokens (Ollama doesn't always provide token counts)
    const tokensUsed = this.estimateTokens(response.response);
    this.tokenCount += tokensUsed;

    return {
      content: response.response,
      model: this.config.model || 'llama3.2',
      tokensUsed,
      metadata: {
        total_duration: response.total_duration,
        load_duration: response.load_duration,
        eval_duration: response.eval_duration,
      },
    };
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    if (!this.client) await this.initialize();

    const stream = await this.client!.generate({
      model: this.config.model || 'llama3.2',
      prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
      stream: true,
      options: {
        temperature: this.config.temperature || 0.7,
        num_predict: this.config.maxTokens || 2000,
      },
    });

    for await (const chunk of stream) {
      if (chunk.response) {
        yield chunk.response;
      }
    }
  }

  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    const systemPrompt = `Provide a ${request.style || 'technical'} summary.`;
    const prompt = `Summarize the following:\n\n${request.content}${
      request.context ? `\n\nContext: ${request.context}` : ''
    }`;
    return this.generateText(prompt, systemPrompt);
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    // Use code-specific model if available
    const codeModel = this.config.model?.includes('code') ? this.config.model : 'codellama';
    this.config.model = codeModel;

    const prompts = {
      summary: 'Explain what this code does',
      review: 'Review this code and suggest improvements',
      documentation: 'Generate documentation for this code',
      complexity: 'Analyze the complexity of this code',
      security: 'Check for security issues in this code',
    };

    const prompt = `${prompts[request.analysisType]} (${request.language}):\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;
    return this.generateText(prompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const prompt = `Generate a ${request.type} diagram in ${request.format} format for: ${request.description}. Return only the diagram code.`;
    return this.generateText(prompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) await this.initialize();

    const response = await this.client!.embeddings({
      model: this.config.model || 'llama3.2',
      prompt: text,
    });

    return response.embedding || [];
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Ollama-specific methods
  async pullModel(modelName: string): Promise<void> {
    if (!this.client) await this.initialize();

    await this.client!.pull({ model: modelName });
  }

  async deleteModel(modelName: string): Promise<void> {
    if (!this.client) await this.initialize();

    await this.client!.delete({ model: modelName });
  }

  async listModels(): Promise<any> {
    if (!this.client) await this.initialize();

    return this.client!.list();
  }
}