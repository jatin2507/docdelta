import { BaseAIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';
import { AIConfig } from '../../../types';

export class VSCodeLMProvider extends BaseAIProvider {
  constructor(config: AIConfig) {
    const providerConfig: AIProviderConfig = {
      ...config,
      provider: 'vscode-lm' as any
    };
    super(providerConfig);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if running in VS Code environment
      return process.env.VSCODE_PID !== undefined ||
             process.env.TERM_PROGRAM === 'vscode' ||
             typeof process.env.VSCODE_IPC_HOOK !== 'undefined' ||
             typeof process.env.VSCODE_IPC_HOOK_CLI !== 'undefined';
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    // For VSCode LM, we don't need to validate API keys
    // Just check if we're in the right environment
    const available = await this.isAvailable();
    if (!available) {
      console.warn('VS Code Language Model API: Not running in VS Code environment. This provider will work only within VS Code.');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateText(_prompt: string, _systemPrompt?: string): Promise<AIResponse> {
    const available = await this.isAvailable();

    if (!available) {
      throw new Error(
        'VS Code Language Model API is not available. ' +
        'This provider only works when running ScribeVerse from within VS Code with Language Model extensions installed. ' +
        'Please either:\n' +
        '1. Run ScribeVerse from VS Code terminal, or\n' +
        '2. Use a different AI provider (like OpenAI, Anthropic, or Google Gemini)\n' +
        '3. Configure an alternative provider in your .env file'
      );
    }

    // This would be implemented when the VS Code LM API is properly integrated
    // For now, provide a helpful error message
    throw new Error(
      'VS Code Language Model API integration is not yet fully implemented. ' +
      'Please use an alternative provider like:\n' +
      '- OpenAI (set OPENAI_API_KEY)\n' +
      '- Anthropic (set ANTHROPIC_API_KEY)\n' +
      '- Google Gemini (set GOOGLE_AI_API_KEY)\n' +
      '- Ollama (local, set OLLAMA_HOST if not localhost:11434)'
    );
  }

  async testConnection(): Promise<boolean> {
    return this.isAvailable();
  }

  getProviderName(): string {
    return 'vscode-lm';
  }

  getModelName(): string {
    return this.config.model || 'vscode-default';
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    const response = await this.generateText(prompt, systemPrompt);
    yield response.content;
  }

  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    const prompt = `Please summarize the following content in a ${request.style || 'technical'} style${request.maxLength ? ` (max ${request.maxLength} words)` : ''}:

${request.context ? `Context: ${request.context}\n\n` : ''}Content:
${request.content}`;

    return this.generateText(prompt);
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const prompt = `Analyze the following ${request.language} code for ${request.analysisType}:

${request.context ? `Context: ${request.context}\n\n` : ''}Code:
\`\`\`${request.language}
${request.code}
\`\`\`

Please provide a detailed ${request.analysisType} analysis.`;

    return this.generateText(prompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const prompt = `Generate a ${request.format} diagram of type "${request.type}" for the following description:

${request.description}

Please provide the diagram code in ${request.format} format.`;

    return this.generateText(prompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Simple fallback embedding
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0).map((_, i) =>
      Math.sin(hash * (i + 1) * 0.1) * 0.1
    );
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  async validateConfig(): Promise<boolean> {
    return this.isAvailable();
  }

  async getModelList(): Promise<string[]> {
    return ['vscode-default'];
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}