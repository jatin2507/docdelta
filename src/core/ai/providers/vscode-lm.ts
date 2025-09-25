import { BaseAIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest, AIProvider } from './base';

// VS Code types (these would normally come from @types/vscode)
interface LanguageModelChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LanguageModel {
  id: string;
  sendRequest(messages: LanguageModelChatMessage[], options?: any, token?: any): { stream: AsyncIterable<any> };
}

interface VSCodeAPI {
  lm: {
    selectChatModels(selector?: { vendor?: string; family?: string }): Promise<LanguageModel[]>;
  };
}

declare const vscode: VSCodeAPI | undefined;

export class VSCodeLMProvider extends BaseAIProvider {
  private selectedModel?: LanguageModel;
  private availableModels: string[] = [];

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.VSCODE_LM });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if VS Code API is available
      return typeof vscode !== 'undefined' && typeof vscode.lm !== 'undefined';
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (!await this.isAvailable()) {
      throw new Error(
        'VS Code Language Model API is not available. ' +
        'This provider only works when running within VS Code as an extension. ' +
        'Please use a different AI provider for CLI usage.'
      );
    }

    try {
      // Get available models
      const models = await vscode!.lm.selectChatModels();
      if (models.length === 0) {
        throw new Error(
          'No VS Code Language Models are available. ' +
          'Please install VS Code extensions that provide language models (like GitHub Copilot Chat) ' +
          'or use a different AI provider.'
        );
      }

      // Store available model names
      this.availableModels = models.map(model => model.id);

      // Select the preferred model or first available
      const preferredModel = this.config.model || 'gpt-4o';
      this.selectedModel = models.find(m => m.id === preferredModel) || models[0];

      if (this.selectedModel.id !== preferredModel && this.config.model) {
        console.warn(`Requested model "${preferredModel}" not available. Using "${this.selectedModel.id}" instead.`);
      }
    } catch (error) {
      throw new Error(`Failed to initialize VS Code Language Model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    await this.initialize();

    if (!this.selectedModel) {
      throw new Error('No language model available');
    }

    try {
      const messages: LanguageModelChatMessage[] = [];

      if (systemPrompt) {
        messages.push({ role: 'assistant', content: systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const request = this.selectedModel.sendRequest(messages);
      let content = '';

      for await (const chunk of request.stream) {
        content += chunk.toString();
      }

      const tokensUsed = this.estimateTokens(content + prompt + (systemPrompt || ''));
      this.tokenCount += tokensUsed;
      await this.recordTokenUsage(tokensUsed, 'generateText', this.selectedModel.id);

      return {
        content,
        model: this.selectedModel.id,
        tokensUsed,
        finishReason: 'stop'
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('consent')) {
        throw new Error(
          'User consent required for VS Code Language Model access. ' +
          'Please accept the language model usage prompt in VS Code, or use a different AI provider.'
        );
      }
      throw this.handleError(error);
    }
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
    return 'vscode-lm';
  }

  getModelName(): string {
    return this.selectedModel?.id || this.config.model || 'vscode-default';
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    await this.initialize();

    if (!this.selectedModel) {
      throw new Error('No language model available');
    }

    try {
      const messages: LanguageModelChatMessage[] = [];

      if (systemPrompt) {
        messages.push({ role: 'assistant', content: systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const request = this.selectedModel.sendRequest(messages);

      for await (const chunk of request.stream) {
        if (chunk) {
          yield chunk.toString();
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('consent')) {
        throw new Error(
          'User consent required for VS Code Language Model access. ' +
          'Please accept the language model usage prompt in VS Code, or use a different AI provider.'
        );
      }
      throw this.handleError(error);
    }
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
    // Unused parameter for interface compliance
    void text;
    throw new Error('Embedding generation is not supported by VS Code Language Model API. Use a dedicated embedding service.');
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    try {
      await this.initialize();
      return this.availableModels;
    } catch {
      return ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet'];
    }
  }

  estimateTokens(text: string): number {
    // Rough estimation for language models (approximately 4 characters per token)
    return Math.ceil(text.length / 4);
  }
}