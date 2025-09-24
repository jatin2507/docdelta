import { CodeChunk, AIConfig, DocumentationSection, DocType } from '../../types';
import { ConfigManager } from '../../config';
import {
  AIProvider,
  AIProviderManager,
  AIProviderManagerConfig,
  CodeAnalysisRequest,
  SummarizationRequest as ProviderSummarizationRequest,
  DiagramGenerationRequest
} from './providers';

interface SummarizationRequest {
  chunks: CodeChunk[];
  context?: string;
  docType: DocType;
  maxTokens?: number;
}

interface SummarizationResult {
  summary: string;
  sections: DocumentationSection[];
  tokens: number;
}

export class AIService {
  private providerManager: AIProviderManager;
  private config: AIConfig;
  private tokenCount: number = 0;

  constructor(config?: AIConfig) {
    this.config = config || ConfigManager.getInstance().getConfig().ai;

    // Initialize provider manager with configured providers
    const managerConfig: AIProviderManagerConfig = {
      providers: [],
      primaryProvider: this.config.provider as AIProvider || AIProvider.OPENAI,
      fallbackProviders: this.config.fallbackProviders as AIProvider[],
      enableFallback: this.config.enableFallback ?? true,
      maxRetries: this.config.maxRetries ?? 3,
      retryDelay: this.config.retryDelay ?? 1000,
    };

    // Add primary provider configuration
    if (this.config.provider) {
      managerConfig.providers.push({
        provider: this.config.provider as AIProvider,
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        topP: this.config.topP,
        region: this.config.region,
        customHeaders: this.config.customHeaders,
      });
    } else if (this.config.apiKey) {
      // Default to OpenAI if no provider specified but API key exists
      managerConfig.providers.push({
        provider: AIProvider.OPENAI,
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });
    }

    // Add additional provider configurations if specified
    if (this.config.additionalProviders) {
      managerConfig.providers.push(...this.config.additionalProviders);
    }

    this.providerManager = new AIProviderManager(managerConfig);
    this.providerManager.initialize().catch(console.error);
  }

  async summarizeChunks(request: SummarizationRequest): Promise<SummarizationResult> {
    const prompt = this.buildPrompt(request);
    const systemPrompt = this.getSystemPrompt(request.docType);

    try {
      // Use provider manager for summarization
      const providerRequest: ProviderSummarizationRequest = {
        content: prompt,
        style: 'technical',
        maxLength: request.maxTokens || this.config.maxTokens || 2000,
        context: systemPrompt,
      };

      const response = await this.providerManager.summarize(providerRequest);

      const tokens = response.tokensUsed || 0;
      this.tokenCount += tokens;

      return this.parseResponse(response.content, request.docType, tokens);
    } catch (error) {
      console.error('AI summarization failed:', error);
      throw error;
    }
  }

  private getSystemPrompt(docType: DocType): string {
    const prompts: Record<DocType, string> = {
      [DocType.API_REFERENCE]: `You are a technical documentation expert. Generate detailed API reference documentation for the provided code chunks. Include:
- Function/method signatures with parameters and return types
- Clear descriptions of what each function/method does
- Parameter descriptions and types
- Return value descriptions
- Usage examples where appropriate
- Any important notes or warnings
Format the output in Markdown with proper headings and code blocks.`,

      [DocType.ARCHITECTURE]: `You are a software architecture expert. Analyze the provided code and generate architectural documentation. Include:
- High-level system overview
- Component descriptions and their responsibilities
- Dependencies and relationships between components
- Data flow descriptions
- Design patterns used
- Architectural decisions and rationale
Create Mermaid.js diagrams where appropriate to visualize the architecture.`,

      [DocType.DATABASE]: `You are a database documentation expert. Generate comprehensive database documentation from the provided SQL schemas. Include:
- Table descriptions and purposes
- Column specifications with types and constraints
- Relationships between tables (foreign keys)
- Indexes and their purposes
- Views and stored procedures
- Data validation rules
Format as clear, structured Markdown with tables for schema definitions.`,

      [DocType.MODULE]: `You are a code documentation expert. Generate module-level documentation that includes:
- Module purpose and responsibilities
- Exported functions/classes/constants
- Internal implementation details (if relevant)
- Dependencies (imports and external libraries)
- Usage examples
- Configuration options
Provide clear, concise documentation in Markdown format.`,

      [DocType.OVERVIEW]: `You are a technical writer. Create a comprehensive project overview that includes:
- Project description and purpose
- Key features and capabilities
- Technology stack
- Project structure overview
- Getting started guide
- Configuration requirements
- Links to other documentation sections
Write in a clear, accessible style suitable for both technical and non-technical audiences.`,

      [DocType.DIAGRAM]: `You are a diagram generation expert. Create Mermaid.js diagrams to visualize:
- Component relationships
- Data flow
- Sequence diagrams for key processes
- Class hierarchies
- Database relationships
Provide both the diagram code and a textual description of what the diagram represents.`,
    };

    return prompts[docType] || prompts[DocType.MODULE];
  }

  private buildPrompt(request: SummarizationRequest): string {
    let prompt = '';

    if (request.context) {
      prompt += `Context: ${request.context}\n\n`;
    }

    prompt += 'Please analyze and document the following code:\n\n';

    request.chunks.forEach((chunk) => {
      prompt += `File: ${chunk.filePath}\n`;
      prompt += `Type: ${chunk.type}\n`;
      if (chunk.metadata?.name) {
        prompt += `Name: ${chunk.metadata.name}\n`;
      }
      prompt += `Lines: ${chunk.startLine}-${chunk.endLine}\n`;
      prompt += `\`\`\`${  chunk.language  }\n`;
      prompt += `${chunk.content  }\n`;
      prompt += '```\n\n';
    });

    return prompt;
  }

  private parseResponse(
    content: string,
    docType: DocType,
    tokens: number
  ): SummarizationResult {
    const sections = this.extractSections(content, docType);

    return {
      summary: content,
      sections,
      tokens,
    };
  }

  private extractSections(content: string, docType: DocType): DocumentationSection[] {
    const sections: DocumentationSection[] = [];
    const lines = content.split('\n');
    let currentSection: DocumentationSection | undefined;
    let sectionContent: string[] = [];

    lines.forEach((line) => {
      const h1Match = line.match(/^# (.+)/);
      const h2Match = line.match(/^## (.+)/);
      const h3Match = line.match(/^### (.+)/);

      if (h1Match || h2Match) {
        if (currentSection) {
          currentSection.content = sectionContent.join('\n').trim();
          sections.push(currentSection);
        }

        currentSection = {
          id: this.generateSectionId(h1Match?.[1] || h2Match?.[1] || ''),
          type: docType,
          title: h1Match?.[1] || h2Match?.[1] || '',
          content: '',
          children: [],
        };
        sectionContent = [];
      } else if (h3Match && currentSection) {
        const childSection: DocumentationSection = {
          id: this.generateSectionId(h3Match[1]),
          type: docType,
          title: h3Match[1],
          content: '',
        };
        currentSection.children = currentSection.children || [];
        currentSection.children.push(childSection);
      } else {
        sectionContent.push(line);
      }
    });

    if (currentSection) {
      currentSection.content = sectionContent.join('\n').trim();
      sections.push(currentSection);
    }

    if (sections.length === 0) {
      sections.push({
        id: this.generateSectionId('content'),
        type: docType,
        title: 'Content',
        content: content,
      });
    }

    return sections;
  }

  private generateSectionId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  async generateCommitMessage(changes: string[]): Promise<string> {
    const prompt = `Generate a concise git commit message for the following documentation changes:\n\n${changes.join('\n')}`;
    const systemPrompt = 'You are a git commit message generator. Create clear, concise commit messages following conventional commit format.';

    try {
      const response = await this.providerManager.generateText(prompt, systemPrompt);
      return response.content || 'docs: Update documentation';
    } catch (error) {
      console.error('Failed to generate commit message:', error);
      return 'docs: Update documentation';
    }
  }

  async generateDiagram(chunks: CodeChunk[], diagramType: 'flow' | 'sequence' | 'class' | 'er'): Promise<string> {
    const description = `Code structure with ${chunks.length} components: ${JSON.stringify(
      chunks.map((c) => ({
        name: c.metadata?.name,
        type: c.type,
        dependencies: c.dependencies,
      })),
      null,
      2
    )}`;

    try {
      const request: DiagramGenerationRequest = {
        type: diagramType,
        format: 'mermaid',
        description,
      };

      const response = await this.providerManager.generateDiagram(request);
      return response.content || '';
    } catch (error) {
      console.error('Failed to generate diagram:', error);
      return '';
    }
  }

  getTokenCount(): number {
    return this.tokenCount + this.providerManager.getTokenCount();
  }

  resetTokenCount(): void {
    this.tokenCount = 0;
    this.providerManager.resetTokenCount();
  }

  // New methods for provider management
  async switchProvider(provider: AIProvider): Promise<void> {
    this.providerManager.setPrimaryProvider(provider);
  }

  async getAvailableProviders(): Promise<AIProvider[]> {
    return this.providerManager.getConfiguredProviders();
  }

  async getAvailableModels(provider?: AIProvider): Promise<string[]> {
    return this.providerManager.getAvailableModels(provider);
  }

  async analyzeCode(code: string, language: string, analysisType: 'summary' | 'review' | 'documentation' | 'complexity' | 'security'): Promise<string> {
    const request: CodeAnalysisRequest = {
      code,
      language,
      analysisType,
    };

    const response = await this.providerManager.analyzeCode(request);
    return response.content;
  }
}