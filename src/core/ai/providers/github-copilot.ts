import OpenAI from 'openai';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';

interface CopilotAccessMethod {
  type: 'api' | 'vscode' | 'language-server';
  available: boolean;
}

export class GitHubCopilotProvider extends BaseAIProvider {
  private client?: OpenAI;
  private accessMethod?: CopilotAccessMethod;
  private languageServer?: ChildProcess;

  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.GITHUB_COPILOT });
  }

  async initialize(): Promise<void> {
    // Determine the best access method
    this.accessMethod = await this.detectAccessMethod();

    switch (this.accessMethod.type) {
      case 'api':
        await this.initializeAPI();
        break;
      case 'vscode':
        await this.initializeVSCode();
        break;
      case 'language-server':
        await this.initializeLanguageServer();
        break;
    }
  }

  private async detectAccessMethod(): Promise<CopilotAccessMethod> {
    // Check for API access first
    if (this.config.apiKey || this.config.githubToken) {
      return { type: 'api', available: true };
    }

    // Check for VS Code with Copilot extension
    if (await this.isVSCodeCopilotAvailable()) {
      return { type: 'vscode', available: true };
    }

    // Check for language server
    if (await this.isLanguageServerAvailable()) {
      return { type: 'language-server', available: true };
    }

    throw new Error('No GitHub Copilot access method available. Please install GitHub Copilot extension or provide API credentials.');
  }

  private async initializeAPI(): Promise<void> {
    if (!this.config.apiKey && !this.config.githubToken) {
      throw new Error('GitHub Copilot API requires either API key or GitHub token');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey || this.config.githubToken,
      baseURL: this.config.baseURL || 'https://api.githubcopilot.com/chat/completions',
      organization: this.config.organizationId,
      timeout: this.config.timeout,
      maxRetries: this.config.retryAttempts,
      defaultHeaders: {
        'User-Agent': 'DocDelta/1.0',
        'Accept': 'application/json',
      },
    });
  }

  private async initializeVSCode(): Promise<void> {
    // VS Code extension integration would require VS Code to be running
    // and the extension to be installed. This is a placeholder for future implementation.
    console.log('Using GitHub Copilot through VS Code extension');
  }

  private async initializeLanguageServer(): Promise<void> {
    // Initialize GitHub Copilot Language Server
    const languageServerPath = path.join(
      process.cwd(),
      'node_modules',
      '@github',
      'copilot-language-server',
      'dist',
      'language-server.js'
    );

    this.languageServer = spawn('node', [languageServerPath, '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Set up error handling for the language server
    this.languageServer.on('error', (error) => {
      console.error('Language Server error:', error);
    });

    console.log('GitHub Copilot Language Server initialized');
  }

  private async isVSCodeCopilotAvailable(): Promise<boolean> {
    // Check if VS Code is available and has Copilot extension
    const vscodeExtensionsDir = this.getVSCodeExtensionsDir();
    if (!vscodeExtensionsDir) return false;

    try {
      const extensions = fs.readdirSync(vscodeExtensionsDir);
      return extensions.some(ext => ext.includes('github.copilot'));
    } catch {
      return false;
    }
  }

  private async isLanguageServerAvailable(): Promise<boolean> {
    const languageServerPath = path.join(
      process.cwd(),
      'node_modules',
      '@github',
      'copilot-language-server',
      'dist',
      'language-server.js'
    );
    return fs.existsSync(languageServerPath);
  }

  private getVSCodeExtensionsDir(): string | null {
    const platform = os.platform();
    const homeDir = os.homedir();

    switch (platform) {
      case 'win32':
        return path.join(homeDir, '.vscode', 'extensions');
      case 'darwin':
        return path.join(homeDir, '.vscode', 'extensions');
      case 'linux':
        return path.join(homeDir, '.vscode', 'extensions');
      default:
        return null;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.initialize();

      if (this.accessMethod?.type === 'api' && this.client) {
        // Try a minimal request to validate API access
        const response = await this.client.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        });
        return response.choices.length > 0;
      }

      // For other methods, just check if they initialized successfully
      return this.accessMethod?.available || false;
    } catch (error) {
      console.error('GitHub Copilot config validation failed:', error);
      return false;
    }
  }

  async getModelList(): Promise<string[]> {
    // GitHub Copilot models vary by access method
    switch (this.accessMethod?.type) {
      case 'api':
        return [
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
          'codex-davinci-002',
          'code-davinci-002',
        ];
      case 'vscode':
      case 'language-server':
        return [
          'copilot-chat',
          'copilot-code-completion',
          'copilot-explain',
          'copilot-fix',
          'copilot-test',
        ];
      default:
        return ['copilot-default'];
    }
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.accessMethod) await this.initialize();

    switch (this.accessMethod!.type) {
      case 'api':
        return this.generateTextAPI(prompt, systemPrompt);
      case 'vscode':
        return this.generateTextVSCode(prompt, systemPrompt);
      case 'language-server':
        return this.generateTextLanguageServer(prompt, systemPrompt);
      default:
        throw new Error('No valid GitHub Copilot access method available');
    }
  }

  private async generateTextAPI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.client) throw new Error('GitHub Copilot API client not initialized');

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.retry(async () => {
      const completion = await this.client!.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages,
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.2,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stop: this.config.stopSequences,
      });

      return completion;
    });

    const usage = response.usage;
    if (usage) {
      this.tokenCount += usage.total_tokens;
    }

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      tokensUsed: usage?.total_tokens,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      finishReason: response.choices[0]?.finish_reason,
      metadata: { accessMethod: 'api' },
    };
  }

  private async generateTextVSCode(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    // Placeholder for VS Code extension integration
    // This would require implementing VS Code extension communication
    const content = `[VS Code Copilot Response to: ${systemPrompt ? `${systemPrompt  } - ` : ''}${prompt}]`;

    return {
      content,
      model: 'copilot-vscode',
      metadata: { accessMethod: 'vscode', note: 'VS Code integration not fully implemented' },
    };
  }

  private async generateTextLanguageServer(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    // Placeholder for language server communication
    // This would require implementing Language Server Protocol communication
    const content = `[Language Server Response to: ${systemPrompt ? `${systemPrompt  } - ` : ''}${prompt}]`;

    return {
      content,
      model: 'copilot-language-server',
      metadata: { accessMethod: 'language-server', note: 'Language server integration not fully implemented' },
    };
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    if (this.accessMethod?.type === 'api' && this.client) {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const stream = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages,
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.2,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } else {
      // Fallback for non-API methods
      const response = await this.generateText(prompt, systemPrompt);
      yield response.content;
    }
  }

  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    const systemPrompt = `You are GitHub Copilot, a code documentation expert. Provide a ${request.style || 'technical'} summary focusing on code structure and functionality.`;
    const prompt = `Summarize the following code or documentation:\n\n${request.content}${
      request.context ? `\n\nContext: ${request.context}` : ''
    }`;
    return this.generateText(prompt, systemPrompt);
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const prompts = {
      summary: 'Explain what this code does and how it works',
      review: 'Review this code for best practices, potential bugs, and improvements',
      documentation: 'Generate comprehensive documentation with examples for this code',
      complexity: 'Analyze the time and space complexity of this code',
      security: 'Identify security vulnerabilities and suggest fixes',
    };

    const systemPrompt = `You are GitHub Copilot, an expert ${request.language} code assistant specialized in code analysis and documentation.`;
    const prompt = `${prompts[request.analysisType]}:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;

    return this.generateText(prompt, systemPrompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const systemPrompt = 'You are GitHub Copilot, a technical diagram expert. Generate clean, valid diagram code.';
    const prompt = `Generate a ${request.type} diagram in ${request.format} format for: ${request.description}. Return only the diagram code without explanation.`;
    return this.generateText(prompt, systemPrompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.accessMethod?.type === 'api' && this.client) {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    }

    // For non-API methods, embeddings might not be available
    throw new Error('Embeddings not available for this GitHub Copilot access method');
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // GitHub Copilot-specific methods
  async generateCodeSuggestion(codePrefix: string, language: string): Promise<string> {
    const systemPrompt = `You are GitHub Copilot. Complete the ${language} code based on the context.`;
    const prompt = `Complete this ${language} code:\n\n\`\`\`${language}\n${codePrefix}`;

    const response = await this.generateText(prompt, systemPrompt);
    return response.content;
  }

  async explainCode(code: string, language: string): Promise<string> {
    const response = await this.analyzeCode({
      code,
      language,
      analysisType: 'summary',
    });
    return response.content;
  }

  async generateTests(code: string, language: string, framework?: string): Promise<string> {
    const systemPrompt = `You are GitHub Copilot, expert at generating comprehensive unit tests.`;
    const prompt = `Generate unit tests for the following ${language} code${framework ? ` using ${framework}` : ''}:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    const response = await this.generateText(prompt, systemPrompt);
    return response.content;
  }

  // Method to get current access method info
  getAccessMethodInfo(): CopilotAccessMethod | undefined {
    return this.accessMethod;
  }

  // Method to switch access method (if multiple are available)
  async switchAccessMethod(method: 'api' | 'vscode' | 'language-server'): Promise<void> {
    const newAccessMethod = await this.detectAccessMethod();
    if (newAccessMethod.type !== method) {
      throw new Error(`Access method '${method}' is not available`);
    }

    this.accessMethod = newAccessMethod;
    await this.initialize();
  }
}