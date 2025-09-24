export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE_GEMINI = 'google-gemini',
  GITHUB_COPILOT = 'github-copilot',
  OLLAMA = 'ollama',
  LITELLM = 'litellm',
  GROK = 'grok',
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  stopSequences?: string[];
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  organizationId?: string;
  projectId?: string;
  region?: string;
  githubToken?: string;
  customHeaders?: Record<string, string>;
  proxyUrl?: string;
  streamingEnabled?: boolean;

  // GitHub Copilot specific options
  copilotAccessMethod?: 'api' | 'vscode' | 'language-server' | 'auto';
  vscodeExtensionPath?: string; // Custom VS Code extensions directory
}

export interface AIResponse {
  content: string;
  model?: string;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string;
  metadata?: Record<string, unknown>;
}

export interface AIError {
  provider: AIProvider;
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
  details?: unknown;
}

export interface SummarizationRequest {
  content: string;
  context?: string;
  maxLength?: number;
  style?: 'technical' | 'simple' | 'detailed';
  language?: string;
}

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  analysisType: 'summary' | 'review' | 'documentation' | 'complexity' | 'security';
  context?: string;
}

export interface DiagramGenerationRequest {
  description: string;
  type: 'flow' | 'sequence' | 'class' | 'er' | 'architecture';
  format: 'mermaid' | 'plantuml' | 'graphviz';
}

export interface IAIProvider {
  initialize(): Promise<void>;
  generateText(prompt: string, systemPrompt?: string): Promise<AIResponse>;
  generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
  summarize(request: SummarizationRequest): Promise<AIResponse>;
  analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse>;
  generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse>;
  generateEmbedding(text: string): Promise<number[]>;
  validateConfig(): Promise<boolean>;
  getModelList(): Promise<string[]>;
  estimateTokens(text: string): number;
  getProvider(): AIProvider;
  getTokenCount(): number;
  resetTokenCount(): void;
}

export abstract class BaseAIProvider implements IAIProvider {
  protected config: AIProviderConfig;
  protected tokenCount: number = 0;
  private databaseManager?: import('../../database').DatabaseManager;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const { DatabaseManager } = await import('../../database');
      this.databaseManager = new DatabaseManager();
      await this.databaseManager.initialize();
    } catch (error) {
      console.warn('Failed to initialize token usage database:', error);
    }
  }

  abstract initialize(): Promise<void>;
  abstract generateText(prompt: string, systemPrompt?: string): Promise<AIResponse>;
  abstract generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
  abstract summarize(request: SummarizationRequest): Promise<AIResponse>;
  abstract analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse>;
  abstract generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse>;
  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract validateConfig(): Promise<boolean>;
  abstract getModelList(): Promise<string[]>;
  abstract estimateTokens(text: string): number;

  getProvider(): AIProvider {
    return this.config.provider;
  }

  getTokenCount(): number {
    return this.tokenCount;
  }

  resetTokenCount(): void {
    this.tokenCount = 0;
  }

  protected async recordTokenUsage(
    tokensUsed: number,
    operation: string,
    model?: string,
    promptTokens?: number,
    completionTokens?: number,
    cost?: number
  ): Promise<void> {
    if (!this.databaseManager) {
      await this.initializeDatabase();
    }

    if (this.databaseManager) {
      try {
        await this.databaseManager.recordTokenUsage({
          provider: this.config.provider,
          model: model || this.config.model || 'unknown',
          tokensUsed,
          promptTokens,
          completionTokens,
          operation,
          cost
        });
      } catch (error) {
        console.warn('Failed to record token usage:', error);
      }
    }
  }

  protected handleError(error: unknown): AIError {
    const errorObj = error as Record<string, unknown>;
    return {
      provider: this.config.provider,
      code: (errorObj.code as string) || 'UNKNOWN_ERROR',
      message: (errorObj.message as string) || 'An unknown error occurred',
      statusCode: (errorObj.statusCode as number) || ((errorObj.response as Record<string, unknown>)?.status as number),
      retryable: this.isRetryableError(error),
      details: ((errorObj.response as Record<string, unknown>)?.data as unknown) || error,
    };
  }

  protected isRetryableError(error: unknown): boolean {
    const errorObj = error as Record<string, unknown>;
    const statusCode = (errorObj.statusCode as number) || ((errorObj.response as Record<string, unknown>)?.status as number);
    return statusCode >= 500 || statusCode === 429 || errorObj.code === 'ECONNRESET';
  }

  protected async retry<T>(
    fn: () => Promise<T>,
    attempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1 || !this.isRetryableError(error)) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    throw new Error('Max retry attempts reached');
  }
}