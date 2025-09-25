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
import { ValidationUtils, ValidationError } from '../../utils/validation';
import { ErrorHandler, ScribeVerseError, ErrorCode, ErrorUtils } from '../../utils/error-handler';

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
  private readonly providerManager: AIProviderManager;
  private readonly config: AIConfig;
  private readonly errorHandler: ErrorHandler;
  private tokenCount: number = 0;
  private isInitialized: boolean = false;

  constructor(config?: AIConfig) {
    this.errorHandler = ErrorHandler.getInstance();

    try {
      // Validate and set configuration
      this.config = this.validateAndNormalizeConfig(config);

      // Initialize provider manager with validated configuration
      const managerConfig = this.buildManagerConfig(this.config);
      this.providerManager = new AIProviderManager(managerConfig);

      // Initialize asynchronously with proper error handling
      this.initializeAsync();

    } catch (error) {
      throw this.errorHandler.handle(error as Error, {
        component: 'AIService',
        operation: 'constructor'
      });
    }
  }

  private validateAndNormalizeConfig(config?: AIConfig): AIConfig {
    const defaultConfig = ConfigManager.getInstance().getConfig().ai;
    const mergedConfig = { ...defaultConfig, ...config };

    // Validate essential configuration
    if (!mergedConfig.apiKey && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      throw new ValidationError('AI service requires an API key to function');
    }

    return {
      ...mergedConfig,
      maxTokens: ValidationUtils.validMaxTokens(mergedConfig.maxTokens, 'maxTokens'),
      temperature: ValidationUtils.validTemperature(mergedConfig.temperature, 'temperature'),
      maxRetries: ValidationUtils.numberInRange(mergedConfig.maxRetries || 3, 'maxRetries', 1, 10),
      retryDelay: ValidationUtils.numberInRange(mergedConfig.retryDelay || 1000, 'retryDelay', 100, 30000)
    };
  }

  private buildManagerConfig(config: AIConfig): AIProviderManagerConfig {
    const managerConfig: AIProviderManagerConfig = {
      providers: [],
      primaryProvider: (config.provider as AIProvider) || AIProvider.OPENAI,
      fallbackProviders: config.fallbackProviders as AIProvider[] || [],
      enableFallback: config.enableFallback ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    // Add primary provider configuration with validation
    if (config.provider && config.apiKey) {
      try {
        ValidationUtils.validApiKey(config.apiKey, 'apiKey');
        managerConfig.providers.push({
          provider: config.provider as AIProvider,
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          topP: config.topP,
          region: config.region,
          customHeaders: config.customHeaders,
        });
      } catch (error) {
        console.warn(`Primary provider configuration invalid: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (config.apiKey) {
      // Default to OpenAI if no provider specified but API key exists
      try {
        ValidationUtils.validApiKey(config.apiKey, 'apiKey');
        managerConfig.providers.push({
          provider: AIProvider.OPENAI,
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        });
      } catch (error) {
        console.warn(`Default provider configuration invalid: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add additional provider configurations if specified
    if (config.additionalProviders && Array.isArray(config.additionalProviders)) {
      const validProviders = config.additionalProviders.filter(provider => {
        try {
          return provider.apiKey && ValidationUtils.validApiKey(provider.apiKey, 'additionalProvider.apiKey');
        } catch {
          return false;
        }
      });
      managerConfig.providers.push(...validProviders);
    }

    if (managerConfig.providers.length === 0) {
      throw new ValidationError('No valid AI providers configured');
    }

    return managerConfig;
  }

  private async initializeAsync(): Promise<void> {
    try {
      await this.providerManager.initialize();
      this.isInitialized = true;
    } catch (error) {
      this.errorHandler.handle(error as Error, {
        component: 'AIService',
        operation: 'initialize'
      });
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeAsync();
    }
  }

  async summarizeChunks(request: SummarizationRequest): Promise<SummarizationResult> {
    return ErrorUtils.withErrorHandling(async () => {
      await this.ensureInitialized();

      // Validate input
      const validatedRequest = this.validateSummarizationRequest(request);

      // Validate that chunks array is not empty
      if (validatedRequest.chunks.length === 0) {
        throw new ValidationError('Cannot generate documentation from empty chunks array');
      }

      const prompt = this.buildPrompt(validatedRequest);
      const systemPrompt = this.getSystemPrompt(validatedRequest.docType);

      // Validate generated content
      if (!prompt?.trim()) {
        throw new ValidationError('Cannot generate documentation prompt from provided chunks');
      }

      const providerRequest: ProviderSummarizationRequest = {
        content: prompt,
        style: 'technical',
        maxLength: validatedRequest.maxTokens || this.config.maxTokens || 2000,
        context: systemPrompt,
      };

      const response = await this.providerManager.summarize(providerRequest);

      if (!response?.content?.trim()) {
        throw new ScribeVerseError(
          'AI provider returned empty response',
          ErrorCode.AI_SERVICE_ERROR,
          { operation: 'summarizeChunks' }
        );
      }

      const tokens = ValidationUtils.safeNumber(response.tokensUsed, 0);
      this.tokenCount += tokens;

      return this.parseResponse(response.content, validatedRequest.docType, tokens);
    }, { component: 'AIService', operation: 'summarizeChunks' })();
  }

  private validateSummarizationRequest(request: SummarizationRequest): SummarizationRequest {
    if (!request || typeof request !== 'object') {
      throw new ValidationError('Summarization request must be a valid object');
    }

    // Allow empty chunks array - we'll handle this gracefully
    const chunks = request.chunks || [];
    if (!Array.isArray(chunks)) {
      throw new ValidationError('chunks must be an array');
    }

    const validatedChunks: CodeChunk[] = [];

    chunks.forEach((chunk, index) => {
      try {
        validatedChunks.push(ValidationUtils.validCodeChunk(chunk, index));
      } catch (error) {
        console.warn(`Skipping invalid chunk at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Instead of throwing an error, let the caller handle empty chunks with fallback behavior
    if (validatedChunks.length === 0 && chunks.length > 0) {
      console.warn('No valid chunks found after validation - this may result in limited documentation');
    }

    const docType = ValidationUtils.validDocType(request.docType, 'docType');

    return {
      chunks: validatedChunks,
      context: request.context ? ValidationUtils.safeString(request.context) : undefined,
      docType,
      maxTokens: request.maxTokens ? ValidationUtils.validMaxTokens(request.maxTokens, 'maxTokens') : undefined
    };
  }

  private getSystemPrompt(docType: DocType): string {
    const prompts: Record<DocType, string> = {
      [DocType.API_REFERENCE]: `You are an AI-optimized documentation expert specializing in creating docs that help AI assistants understand codebases efficiently. Generate detailed API reference documentation with these priorities:

# CRITICAL FOR AI UNDERSTANDING:
1. **Clear Function Signatures**: Always show exact TypeScript/JavaScript signatures with full type information
2. **Purpose Statement**: Start each function with a ONE-LINE clear purpose statement
3. **Input/Output Contract**: Explicitly state what goes in and what comes out
4. **Side Effects**: List any file operations, network calls, state changes, or external dependencies
5. **Error Conditions**: Document when and why functions might fail
6. **Call Chain Context**: Show which other functions this typically calls or is called by

# STRUCTURE FOR AI PARSING:
- Use consistent markdown headers (##, ###)
- Include structured metadata blocks
- Provide minimal but complete usage examples
- Use code blocks with language specifications
- Include parameter/return type tables when complex

# AVOID TOKEN WASTE:
- Skip verbose descriptions, focus on technical contracts
- Don't repeat obvious information from code
- Prioritize actionable information over commentary
- Use bullet points over paragraphs where possible

Generate documentation that allows an AI to understand the complete API surface without reading source code.`,

      [DocType.ARCHITECTURE]: `You are an AI-optimized architecture documentation expert. Create architectural documentation that helps AI assistants understand system design without reading every file. Focus on:

# SYSTEM COMPREHENSION FOR AI:
1. **Component Hierarchy**: Show clear parent-child and sibling relationships
2. **Data Flow Maps**: Document how data moves through the system
3. **Entry Points**: Identify all ways the system can be invoked
4. **Critical Paths**: Highlight main execution flows and error handling paths
5. **External Dependencies**: List all external services, databases, APIs, and third-party libraries
6. **Configuration Points**: Document environment variables, config files, and runtime settings

# ARCHITECTURAL PATTERNS:
- Identify and name design patterns used
- Show dependency injection patterns
- Document event flows and pub/sub patterns
- Explain middleware/filter chains
- Map out authentication/authorization flows

# MERMAID DIAGRAMS REQUIRED:
Create flowchart diagrams showing:
\`\`\`mermaid
flowchart TD
    A[Entry Point] --> B[Router/Controller]
    B --> C[Business Logic]
    C --> D[Database]
    C --> E[External API]
\`\`\`

Focus on enabling AI to understand the "why" and "how" of system design decisions.`,

      [DocType.DATABASE]: `You are an AI-optimized database documentation expert. Generate database documentation that helps AI understand data structures and relationships without examining SQL files directly:

# DATA MODEL FOR AI:
1. **Entity Relationships**: Show clear FK relationships and cardinality
2. **Data Flow**: How data enters, transforms, and exits the system
3. **Query Patterns**: Common query types and their performance implications
4. **Constraints and Validations**: Business rules enforced at DB level
5. **Migration History**: How schema evolves over time
6. **Performance Considerations**: Indexes, partitioning, optimization strategies

# STRUCTURED SCHEMA INFO:
- Table purpose and business context
- Column types with precision and constraints
- Index strategies and query optimization
- Stored procedures and their triggers
- Views and their use cases
- Data security and access patterns

# RELATIONSHIP DIAGRAMS:
Create ER diagrams using Mermaid:
\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
\`\`\`

Enable AI to understand data architecture without SQL parsing.`,

      [DocType.MODULE]: `You are an AI-optimized module documentation expert. Generate module documentation that allows AI assistants to understand module functionality, dependencies, and usage patterns without reading source code:

# MODULE COMPREHENSION FOR AI:
1. **Primary Responsibility**: Single sentence describing module's main purpose
2. **Public Interface**: All exported functions, classes, types, and constants
3. **Dependency Map**: What this module imports and why
4. **Usage Patterns**: How other modules typically consume this module
5. **Configuration**: Environment variables, settings, and initialization requirements
6. **State Management**: Any internal state, caches, or persistent data

# TECHNICAL CONTRACTS:
- Input validation and sanitization
- Output formats and error conditions
- Performance characteristics and limitations
- Thread safety and concurrency considerations
- Memory usage and cleanup requirements

# INTEGRATION CONTEXT:
- Which modules depend on this one
- Common integration patterns
- Event emission/listening patterns
- Error propagation strategies

Focus on information that helps AI understand how to use and integrate with this module effectively.`,

      [DocType.OVERVIEW]: `You are an AI-optimized technical writer creating project overviews that help AI assistants understand entire projects quickly. Generate comprehensive overviews optimized for AI comprehension:

# PROJECT UNDERSTANDING FOR AI:
1. **System Purpose**: What problem does this project solve?
2. **Architecture Summary**: High-level system design and component interaction
3. **Technology Stack**: Languages, frameworks, databases, and key libraries with versions
4. **Entry Points**: How users/systems interact with this project (CLI, API, UI, etc.)
5. **Environment Requirements**: Runtime dependencies, configuration, and deployment needs
6. **Development Workflow**: Build process, testing strategy, and development setup

# QUICK REFERENCE FOR AI:
- Project structure and key directories
- Important configuration files and their purposes
- External service integrations and APIs
- Authentication and authorization model
- Data storage and persistence strategy
- Logging, monitoring, and error handling approach

# OPERATIONAL CONTEXT:
- Deployment patterns and infrastructure requirements
- Security considerations and compliance requirements
- Performance characteristics and scaling considerations
- Maintenance and support procedures

Create documentation that gives AI assistants complete project context without requiring deep code analysis.`,

      [DocType.DIAGRAM]: `You are an AI-optimized diagram generation expert. Create Mermaid.js diagrams that visually represent system relationships and flows for AI comprehension:

# DIAGRAM TYPES FOR AI UNDERSTANDING:
1. **Flowcharts**: Show process flows and decision points
2. **Sequence Diagrams**: Illustrate interaction patterns between components
3. **Class Diagrams**: Display object relationships and inheritance
4. **State Diagrams**: Show state transitions and business process flows
5. **Component Diagrams**: Visualize system architecture and dependencies

# MERMAID BEST PRACTICES:
- Use clear, descriptive node labels
- Show directionality with appropriate arrows
- Include decision points and alternative paths
- Add relevant metadata to edges
- Use consistent styling and color coding
- Keep diagrams focused and not overly complex

# DIAGRAM + EXPLANATION:
Always provide both:
1. The Mermaid diagram code
2. A structured explanation of what the diagram represents
3. Key insights or patterns visible in the diagram

Generate diagrams that help AI understand system structure and behavior patterns visually.`,
    };

    return prompts[docType] || prompts[DocType.MODULE];
  }

  private buildPrompt(request: SummarizationRequest): string {
    if (!request?.chunks || !Array.isArray(request.chunks)) {
      throw new ValidationError('Invalid request: chunks array is required');
    }

    const promptParts: string[] = [];

    // Add context if provided
    if (request.context?.trim()) {
      const sanitizedContext = ValidationUtils.safeString(request.context).trim();
      if (sanitizedContext.length > 0) {
        promptParts.push(`Context: ${sanitizedContext}\n`);
      }
    }

    promptParts.push('Please analyze and document the following code:\n');

    // Process each chunk with validation
    const validChunks = request.chunks.filter(chunk => {
      return chunk &&
             typeof chunk === 'object' &&
             chunk.content?.trim() &&
             chunk.filePath?.trim() &&
             chunk.language?.trim() &&
             chunk.type?.trim();
    });

    if (validChunks.length === 0) {
      throw new ValidationError('No valid chunks with content found');
    }

    validChunks.forEach((chunk, index) => {
      try {
        const chunkParts: string[] = [];

        // Add file information with null checks
        const filePath = ValidationUtils.safeString(chunk.filePath).trim();
        if (filePath) {
          chunkParts.push(`File: ${filePath}`);
        }

        const type = ValidationUtils.safeString(chunk.type).trim();
        if (type) {
          chunkParts.push(`Type: ${type}`);
        }

        // Add metadata name if available
        if (chunk.metadata?.name?.trim()) {
          const name = ValidationUtils.safeString(chunk.metadata.name).trim();
          if (name) {
            chunkParts.push(`Name: ${name}`);
          }
        }

        // Add line numbers with validation
        const startLine = ValidationUtils.safeNumber(chunk.startLine, 1);
        const endLine = ValidationUtils.safeNumber(chunk.endLine, startLine);
        chunkParts.push(`Lines: ${Math.max(1, startLine)}-${Math.max(startLine, endLine)}`);

        // Add code content with language
        const language = ValidationUtils.safeString(chunk.language).trim() || 'text';
        const content = ValidationUtils.safeString(chunk.content).trim();

        if (!content) {
          console.warn(`Chunk ${index} has no content, skipping`);
          return;
        }

        chunkParts.push(`\`\`\`${language}`);
        chunkParts.push(content);
        chunkParts.push('```\n');

        promptParts.push(chunkParts.join('\n'));

      } catch (error) {
        console.warn(`Error processing chunk ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    const finalPrompt = promptParts.join('\n');

    if (!finalPrompt.trim()) {
      throw new ValidationError('Generated prompt is empty after processing chunks');
    }

    // Validate prompt length (avoid extremely long prompts)
    const maxPromptLength = 100000; // ~100KB reasonable limit
    if (finalPrompt.length > maxPromptLength) {
      console.warn(`Prompt length (${finalPrompt.length}) exceeds recommended maximum (${maxPromptLength}). May cause issues with AI providers.`);
    }

    return finalPrompt;
  }


  private parseResponse(
    content: string,
    docType: DocType,
    tokens: number
  ): SummarizationResult {
    // Validate inputs
    const validatedContent = ValidationUtils.nonEmptyString(content, 'response content');
    const validatedDocType = ValidationUtils.validDocType(docType, 'docType');
    const validatedTokens = ValidationUtils.numberInRange(tokens, 'tokens', 0);

    try {
      const sections = this.extractSections(validatedContent, validatedDocType);

      return {
        summary: validatedContent,
        sections,
        tokens: validatedTokens,
      };
    } catch (error) {
      throw new ScribeVerseError(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCode.AI_SERVICE_ERROR,
        { operation: 'parseResponse', metadata: { docType: validatedDocType } },
        error instanceof Error ? error : undefined
      );
    }
  }

  private extractSections(content: string, docType: DocType): DocumentationSection[] {
    if (!content?.trim()) {
      throw new ValidationError('Content is required to extract sections');
    }

    const sections: DocumentationSection[] = [];
    const lines = content.split('\n');
    let currentSection: DocumentationSection | undefined;
    let sectionContent: string[] = [];

    try {
      lines.forEach((line) => {
        const safeLine = ValidationUtils.safeString(line);

        const h1Match = safeLine.match(/^# (.+)/);
        const h2Match = safeLine.match(/^## (.+)/);
        const h3Match = safeLine.match(/^### (.+)/);

        if (h1Match || h2Match) {
          // Save previous section if exists
          if (currentSection) {
            currentSection.content = sectionContent.join('\n').trim();
            sections.push(currentSection);
          }

          const title = (h1Match?.[1] || h2Match?.[1] || '').trim();
          if (title) {
            currentSection = {
              id: this.generateSectionId(title),
              type: docType,
              title: title,
              content: '',
              children: [],
            };
            sectionContent = [];
          }
        } else if (h3Match && currentSection) {
          const childTitle = h3Match[1]?.trim();
          if (childTitle) {
            const childSection: DocumentationSection = {
              id: this.generateSectionId(childTitle),
              type: docType,
              title: childTitle,
              content: '',
            };
            currentSection.children = currentSection.children || [];
            currentSection.children.push(childSection);
          }
        } else {
          sectionContent.push(safeLine);
        }
      });

      // Handle final section
      if (currentSection) {
        currentSection.content = sectionContent.join('\n').trim();
        sections.push(currentSection);
      }

      // If no sections found, create a default content section
      if (sections.length === 0) {
        sections.push({
          id: this.generateSectionId('content'),
          type: docType,
          title: 'Content',
          content: content.trim(),
        });
      }

      // Validate extracted sections
      const validSections = sections.filter(section => {
        return section.title?.trim() && (section.content?.trim() || section.children?.length);
      });

      return validSections.length > 0 ? validSections : sections;

    } catch (error) {
      // If extraction fails, return content as single section
      console.warn('Section extraction failed, returning content as single section:', error);
      return [{
        id: this.generateSectionId('content'),
        type: docType,
        title: 'Content',
        content: content.trim(),
      }];
    }
  }

  private generateSectionId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  async generateCommitMessage(changes: string[]): Promise<string> {
    return ErrorUtils.withErrorHandling(async () => {
      await this.ensureInitialized();

      // Validate input
      const validChanges = ValidationUtils.nonEmptyArray(changes, 'changes');
      const sanitizedChanges = validChanges
        .map(change => ValidationUtils.safeString(change).trim())
        .filter(change => change.length > 0);

      if (sanitizedChanges.length === 0) {
        return 'docs: Update documentation';
      }

      const prompt = `Generate a concise git commit message for the following documentation changes:\n\n${sanitizedChanges.join('\n')}`;
      const systemPrompt = 'You are a git commit message generator. Create clear, concise commit messages following conventional commit format.';

      const response = await this.providerManager.generateText(prompt, systemPrompt);

      if (!response?.content?.trim()) {
        console.warn('AI provider returned empty commit message, using fallback');
        return 'docs: Update documentation';
      }

      // Clean up the generated message
      const cleanMessage = ValidationUtils.safeString(response.content)
        .trim()
        .split('\n')[0] // Take only the first line
        .substring(0, 72); // Limit to reasonable commit message length

      return cleanMessage || 'docs: Update documentation';

    }, { component: 'AIService', operation: 'generateCommitMessage' })();
  }

  async generateDiagram(chunks: CodeChunk[], diagramType: 'flow' | 'sequence' | 'class' | 'er'): Promise<string> {
    return ErrorUtils.withErrorHandling(async () => {
      await this.ensureInitialized();

      // Validate that chunks array is not empty
      if (!chunks || chunks.length === 0) {
        throw new ValidationError('Cannot generate diagram from empty chunks array');
      }

      // Validate inputs
      const validChunks = chunks;
      const validDiagramTypes = ['flow', 'sequence', 'class', 'er'];

      if (!validDiagramTypes.includes(diagramType)) {
        throw new ValidationError(`Invalid diagram type: ${diagramType}. Must be one of: ${validDiagramTypes.join(', ')}`);
      }

      // Process chunks safely
      const processedChunks = validChunks
        .filter(chunk => chunk && typeof chunk === 'object')
        .map((chunk, index) => ({
          name: ValidationUtils.safeString(chunk.metadata?.name || `component_${index}`),
          type: ValidationUtils.safeString(chunk.type || 'unknown'),
          dependencies: Array.isArray(chunk.dependencies) ? chunk.dependencies : [],
        }));

      if (processedChunks.length === 0) {
        return '';
      }

      const description = `Code structure with ${processedChunks.length} components: ${JSON.stringify(
        processedChunks,
        null,
        2
      )}`;

      const request: DiagramGenerationRequest = {
        type: diagramType,
        format: 'mermaid',
        description,
      };

      const response = await this.providerManager.generateDiagram(request);

      if (!response?.content?.trim()) {
        console.warn('AI provider returned empty diagram');
        return '';
      }

      return ValidationUtils.safeString(response.content).trim();

    }, { component: 'AIService', operation: 'generateDiagram' })();
  }

  async generateFunctionFlowDiagram(chunks: CodeChunk[], entryPoint?: string): Promise<string> {
    return ErrorUtils.withErrorHandling(async () => {
      // Validate inputs
      if (!chunks || !Array.isArray(chunks)) {
        throw new ValidationError('Chunks array is required for function flow diagram generation');
      }

      // Filter valid chunks with content
      const validChunks = chunks.filter(chunk => {
        return chunk &&
               typeof chunk === 'object' &&
               chunk.content?.trim() &&
               (chunk.type === 'function' || chunk.type === 'method');
      });

      if (validChunks.length === 0) {
        return ''; // Return empty string if no function chunks
      }

      const functionCalls = this.extractFunctionCalls(validChunks);
      const functions = validChunks;

      let mermaidDiagram = 'flowchart TD\n';
      const nodeIds = new Map<string, string>();
      let nodeIdCounter = 0;

      // Create nodes for all functions with proper escaping
      functions.forEach((func, index) => {
        try {
          const funcName = ValidationUtils.safeString(func.metadata?.name || `anonymous_${index}`);
          const safeFuncName = this.sanitizeMermaidLabel(funcName);
          const nodeId = `F${nodeIdCounter++}`;

          nodeIds.set(funcName, nodeId);
          mermaidDiagram += `    ${nodeId}["${safeFuncName}()"]\n`;
        } catch (error) {
          console.warn(`Error processing function ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      // Add entry point if specified and valid
      if (entryPoint?.trim()) {
        const sanitizedEntry = ValidationUtils.safeString(entryPoint).trim();
        if (sanitizedEntry && !nodeIds.has(sanitizedEntry)) {
          const entryId = 'ENTRY';
          const safeEntryName = this.sanitizeMermaidLabel(sanitizedEntry);
          nodeIds.set(sanitizedEntry, entryId);
          mermaidDiagram += `    ${entryId}["🚀 ${safeEntryName}()"]\n`;
        }
      }

      // Create edges for function calls with validation
      if (functionCalls.length > 0) {
        functionCalls.forEach(call => {
          try {
            const callerId = nodeIds.get(call.caller);
            const calleeId = nodeIds.get(call.callee);

            if (callerId && calleeId && callerId !== calleeId) {
              mermaidDiagram += `    ${callerId} --> ${calleeId}\n`;
            }
          } catch (error) {
            console.warn(`Error creating edge from ${call.caller} to ${call.callee}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
      }

      // Add styling with proper class definitions
      mermaidDiagram += '\n';
      mermaidDiagram += '    classDef entryPoint fill:#e1f5fe,stroke:#0277bd,stroke-width:3px\n';
      mermaidDiagram += '    classDef functionNode fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n';
      mermaidDiagram += '    classDef externalCall fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n';

      // Apply classes
      if (nodeIds.has(entryPoint || '')) {
        mermaidDiagram += '    class ENTRY entryPoint\n';
      }

      const functionNodeIds = Array.from(nodeIds.values()).filter(id => id !== 'ENTRY');
      if (functionNodeIds.length > 0) {
        mermaidDiagram += `    class ${functionNodeIds.join(',')} functionNode\n`;
      }

      return mermaidDiagram;

    }, { component: 'AIService', operation: 'generateFunctionFlowDiagram' })();
  }

  private sanitizeMermaidLabel(label: string): string {
    if (!label) return 'unnamed';

    // Escape special characters that could break Mermaid syntax
    return ValidationUtils.safeString(label)
      .replace(/"/g, '\\"')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .trim();
  }

  private extractFunctionCalls(chunks: CodeChunk[]): Array<{caller: string, callee: string}> {
    if (!chunks || !Array.isArray(chunks)) {
      return [];
    }

    const calls: Array<{caller: string, callee: string}> = [];
    const processedCalls = new Set<string>(); // Avoid duplicates

    chunks.forEach((chunk, index) => {
      try {
        if (!chunk || typeof chunk !== 'object') {
          return;
        }

        if (chunk.type === 'function' || chunk.type === 'method') {
          const callerName = ValidationUtils.safeString(chunk.metadata?.name || `anonymous_${index}`);
          const content = ValidationUtils.safeString(chunk.content);

          if (!content.trim()) {
            return;
          }

          // Extract function calls from the code content with improved regex
          const callRegex = /(?<!\/\/.*?)(?<!\/\*[\s\S]*?)\b(\w+)\s*\(/g;
          let match;

          // Reset regex lastIndex for safety
          callRegex.lastIndex = 0;

          const maxMatches = 100; // Prevent infinite loops
          let matchCount = 0;

          while ((match = callRegex.exec(content)) !== null && matchCount < maxMatches) {
            matchCount++;

            try {
              const calledFunction = ValidationUtils.safeString(match[1]).trim();

              if (!calledFunction) {
                continue;
              }

              // Skip common keywords, built-in functions, and self-references
              if (this.isCommonKeyword(calledFunction) || calledFunction === callerName) {
                continue;
              }

              // Create unique identifier for the call to avoid duplicates
              const callId = `${callerName}->${calledFunction}`;
              if (!processedCalls.has(callId)) {
                processedCalls.add(callId);
                calls.push({
                  caller: callerName,
                  callee: calledFunction
                });
              }

            } catch (error) {
              console.warn(`Error processing function call match at position ${match.index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              continue;
            }
          }

          if (matchCount >= maxMatches) {
            console.warn(`Maximum function call matches (${maxMatches}) reached for chunk ${index}, may have truncated results`);
          }
        }
      } catch (error) {
        console.warn(`Error processing chunk ${index} for function calls: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    return calls;
  }

  private isCommonKeyword(name: string): boolean {
    const keywords = [
      'if', 'for', 'while', 'switch', 'catch', 'try', 'function', 'class',
      'const', 'let', 'var', 'return', 'new', 'this', 'super', 'typeof',
      'console', 'log', 'error', 'warn', 'info', 'debug', 'JSON', 'Object',
      'Array', 'String', 'Number', 'Boolean', 'Date', 'Math', 'parseInt',
      'parseFloat', 'isNaN', 'isFinite', 'setTimeout', 'setInterval',
      'clearTimeout', 'clearInterval', 'Promise', 'async', 'await'
    ];
    return keywords.includes(name);
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