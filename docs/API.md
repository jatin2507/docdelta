# ScribeVerse API Reference

This document provides comprehensive API documentation for ScribeVerse's programmatic interfaces.

## Table of Contents

- [Core Classes](#core-classes)
- [Parser API](#parser-api)
- [AI Provider API](#ai-provider-api)
- [Generator API](#generator-api)
- [Configuration API](#configuration-api)
- [Utilities](#utilities)

## Core Classes

### ScribeVerse

The main ScribeVerse class that orchestrates documentation generation.

```typescript
import { ScribeVerse, ScribeVerseConfig } from 'scribeverse';

class ScribeVerse {
  constructor(config: ScribeVerseConfig);

  // Main methods
  async generate(): Promise<GenerationResult>;
  async parseFile(filePath: string): Promise<CodeChunk[]>;
  async analyzeDependencies(): Promise<DependencyInfo[]>;

  // Configuration
  updateConfig(updates: Partial<ScribeVerseConfig>): void;
  getConfig(): ScribeVerseConfig;

  // Validation
  async validateConfig(): Promise<boolean>;
}
```

#### Example Usage

```typescript
const docDelta = new ScribeVerse({
  sourceDir: './src',
  outputDir: './docs',
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini'
  }
});

const result = await docDelta.generate();
console.log(`Generated documentation for ${result.stats.filesProcessed} files`);
```

### ScribeVerseManager

Advanced manager for multi-project documentation generation.

```typescript
import { ScribeVerseManager } from 'scribeverse';

class ScribeVerseManager {
  // Project management
  async addProject(name: string, config: ScribeVerseConfig): Promise<void>;
  async removeProject(name: string): Promise<void>;
  async processProjects(projects: ProjectConfig[]): Promise<Map<string, GenerationResult>>;

  // Batch operations
  async generateAll(): Promise<Map<string, GenerationResult>>;
  async validateAll(): Promise<Map<string, boolean>>;
}
```

## Parser API

### BaseParser

Abstract base class for language parsers.

```typescript
abstract class BaseParser {
  protected language: Language;

  constructor(language: Language);

  // Abstract methods to implement
  abstract async parse(filePath: string, content: string): Promise<ParsedModule>;
  abstract extractChunks(content: string, filePath: string): CodeChunk[];
  abstract extractDependencies(content: string): string[];

  // Utility methods
  protected generateHash(content: string): string;
  protected getLineNumbers(content: string, match: string): { start: number; end: number };
}
```

### TypeScriptParser

Parser for TypeScript and JavaScript files.

```typescript
class TypeScriptParser extends BaseParser {
  constructor();

  async parse(filePath: string, content: string): Promise<ParsedModule>;
  extractChunks(content: string, filePath: string): CodeChunk[];
  extractDependencies(content: string): string[];

  // TypeScript-specific methods
  private extractImports(content: string): string[];
  private extractExports(content: string): string[];
  private analyzeDependencies(content: string, filePath: string): DependencyInfo[];
}
```

### PythonParser

Parser for Python files.

```typescript
class PythonParser extends BaseParser {
  constructor();

  async parse(filePath: string, content: string): Promise<ParsedModule>;
  extractChunks(content: string, filePath: string): CodeChunk[];
  extractDependencies(content: string): string[];

  // Python-specific methods
  private extractClassChunk(content: string, startIndex: number, className: string, filePath: string): CodeChunk | null;
  private extractMethodChunk(classContent: string, startIndex: number, methodName: string, className: string, filePath: string, classStartLine: number): CodeChunk | null;
}
```

### SQLParser

Parser for SQL files.

```typescript
class SQLParser extends BaseParser {
  constructor();

  async parse(filePath: string, content: string): Promise<ParsedModule>;
  extractChunks(content: string, filePath: string): CodeChunk[];
  extractDependencies(content: string): string[];

  // SQL-specific methods
  private parseCreateTable(content: string, tableName: string, filePath: string): CodeChunk;
  private parseColumns(tableDefinition: string): ColumnInfo[];
  private parseForeignKeys(tableDefinition: string): ForeignKeyInfo[];
}
```

### ParserFactory

Factory for creating appropriate parsers based on file extensions.

```typescript
class ParserFactory {
  static createParser(language: Language): BaseParser;
  static getLanguageFromFile(filePath: string): Language;
  static getSupportedLanguages(): Language[];

  // Batch parsing
  static async parseDirectory(dirPath: string, options?: ParseOptions): Promise<ParsedModule[]>;
  static async parseFiles(filePaths: string[], options?: ParseOptions): Promise<ParsedModule[]>;
}
```

## AI Provider API

### BaseAIProvider

Abstract base class for AI providers.

```typescript
abstract class BaseAIProvider implements IAIProvider {
  protected config: AIProviderConfig;
  protected tokenCount: number;

  constructor(config: AIProviderConfig);

  // Abstract methods
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

  // Common methods
  getProvider(): AIProvider;
  getTokenCount(): number;
  resetTokenCount(): void;
}
```

### OpenAIProvider

OpenAI GPT models provider.

```typescript
class OpenAIProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig);

  async initialize(): Promise<void>;
  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse>;
  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
  async getModelList(): Promise<string[]>;

  // OpenAI-specific methods
  async generateWithVision(prompt: string, imageUrls: string[]): Promise<AIResponse>;
  async generateEmbeddings(texts: string[]): Promise<number[][]>;
}
```

### AnthropicProvider

Anthropic Claude models provider.

```typescript
class AnthropicProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig);

  async initialize(): Promise<void>;
  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse>;
  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
  async getModelList(): Promise<string[]>;
}
```

### GrokProvider

xAI Grok models provider.

```typescript
class GrokProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig);

  // Grok-specific methods
  async generateWithSearch(prompt: string, useSearch?: boolean): Promise<AIResponse>;
  async generateWithReasoning(prompt: string, reasoningEffort?: 'low' | 'medium' | 'high'): Promise<AIResponse>;
  async codeAnalysis(code: string, language: string, task?: string): Promise<AIResponse>;
}
```

### AIProviderFactory

Factory for creating AI providers.

```typescript
class AIProviderFactory {
  static create(config: AIProviderConfig): IAIProvider;
  static getAvailableProviders(): AIProvider[];
  static isProviderSupported(provider: AIProvider): boolean;
  static getProviderInfo(provider: AIProvider): ProviderInfo;
  static getRecommendations(): ProviderRecommendations;
}
```

### AIProviderManager

Manager for handling multiple AI providers with fallback support.

```typescript
class AIProviderManager {
  constructor(config: AIProviderManagerConfig);

  async initialize(): Promise<void>;
  async validateProviders(): Promise<Map<AIProvider, boolean>>;

  // Provider management
  getProvider(provider?: AIProvider): IAIProvider | undefined;
  setPrimaryProvider(provider: AIProvider): void;

  // AI operations with fallback
  async generateText(prompt: string, systemPrompt?: string, provider?: AIProvider): Promise<AIResponse>;
  async *generateStream(prompt: string, systemPrompt?: string, provider?: AIProvider): AsyncGenerator<string>;
  async summarize(request: SummarizationRequest, provider?: AIProvider): Promise<AIResponse>;
  async analyzeCode(request: CodeAnalysisRequest, provider?: AIProvider): Promise<AIResponse>;

  // Statistics
  getTokenCount(): number;
  getProviderTokenCount(provider: AIProvider): number;
  resetTokenCount(): void;
}
```

## Generator API

### DocumentationGenerator

Main documentation generator class.

```typescript
class DocumentationGenerator {
  constructor(config: GeneratorConfig);

  async generate(modules: ParsedModule[]): Promise<GenerationResult>;
  async generateSection(chunks: CodeChunk[], type: DocType): Promise<DocumentationSection>;

  // Template management
  setTemplate(type: DocType, template: string): void;
  getTemplate(type: DocType): string;

  // Custom generators
  registerCustomGenerator(type: string, generator: CustomGenerator): void;
}
```

### TemplateEngine

Handlebars-based template engine for custom documentation templates.

```typescript
class TemplateEngine {
  constructor();

  registerTemplate(name: string, template: string): void;
  registerHelper(name: string, helper: Function): void;
  compile(template: string): CompiledTemplate;
  render(template: string, data: any): string;
}
```

## Configuration API

### ConfigManager

Configuration management utilities.

```typescript
class ConfigManager {
  static load(configPath?: string): Promise<ScribeVerseConfig>;
  static save(config: ScribeVerseConfig, configPath?: string): Promise<void>;
  static validate(config: ScribeVerseConfig): ValidationResult;
  static merge(base: ScribeVerseConfig, override: Partial<ScribeVerseConfig>): ScribeVerseConfig;
  static getDefaultConfig(): ScribeVerseConfig;
}
```

## Utilities

### FileUtils

File system utilities.

```typescript
class FileUtils {
  static async readFile(filePath: string): Promise<string>;
  static async writeFile(filePath: string, content: string): Promise<void>;
  static async ensureDir(dirPath: string): Promise<void>;
  static async globFiles(pattern: string, options?: GlobOptions): Promise<string[]>;
  static getFileExtension(filePath: string): string;
  static getLanguageFromExtension(extension: string): Language;
}
```

### GitUtils

Git integration utilities.

```typescript
class GitUtils {
  static async isGitRepository(path: string): Promise<boolean>;
  static async getChangedFiles(path: string): Promise<string[]>;
  static async commitChanges(path: string, message: string): Promise<void>;
  static async pushChanges(path: string, remote?: string, branch?: string): Promise<void>;
  static async getCurrentBranch(path: string): Promise<string>;
}
```

### MetadataManager

Metadata and caching management.

```typescript
class MetadataManager {
  constructor(config: MetadataConfig);

  async initialize(): Promise<void>;

  // Chunk metadata
  async getChunkMetadata(chunkId: string): Promise<ChunkMetadata | null>;
  async updateChunkMetadata(chunkId: string, metadata: ChunkMetadata): Promise<void>;
  async deleteChunkMetadata(chunkId: string): Promise<void>;

  // Project metadata
  async getProjectMetadata(): Promise<ProjectMetadata>;
  async updateProjectMetadata(metadata: ProjectMetadata): Promise<void>;

  // Cache management
  async clearCache(): Promise<void>;
  async getCacheStats(): Promise<CacheStats>;
}
```

## Type Definitions

### Core Types

```typescript
interface ScribeVerseConfig {
  sourceDir: string;
  outputDir: string;
  include?: string[];
  exclude?: string[];
  languages?: Language[];
  ai: AIConfig;
  git?: GitConfig;
  metadata?: MetadataConfig;
}

interface CodeChunk {
  id: string;
  filePath: string;
  content: string;
  type: ChunkType;
  language: Language;
  startLine: number;
  endLine: number;
  hash: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

interface ParsedModule {
  path: string;
  name: string;
  language: Language;
  chunks: CodeChunk[];
  imports: string[];
  exports: string[];
  dependencies: DependencyInfo[];
}

interface GenerationResult {
  sections: DocumentationSection[];
  files: GeneratedFile[];
  stats: GenerationStats;
}
```

### AI Types

```typescript
interface AIConfig {
  provider: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseURL?: string;
  // Provider-specific options...
}

interface AIResponse {
  content: string;
  model?: string;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string;
  metadata?: Record<string, any>;
}

interface SummarizationRequest {
  content: string;
  context?: string;
  maxLength?: number;
  style?: 'technical' | 'simple' | 'detailed';
  language?: string;
}

interface CodeAnalysisRequest {
  code: string;
  language: string;
  analysisType: 'summary' | 'review' | 'documentation' | 'complexity' | 'security';
  context?: string;
}
```

### Enums

```typescript
enum Language {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  GO = 'go',
  RUST = 'rust',
  JAVA = 'java',
  CPP = 'cpp',
  SQL = 'sql',
  UNKNOWN = 'unknown',
}

enum ChunkType {
  CLASS = 'class',
  FUNCTION = 'function',
  METHOD = 'method',
  INTERFACE = 'interface',
  TYPE = 'type',
  ENUM = 'enum',
  VARIABLE = 'variable',
  MODULE = 'module',
  DATABASE_TABLE = 'database_table',
}

enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE_GEMINI = 'google-gemini',
  GITHUB_COPILOT = 'github-copilot',
  GROK = 'grok',
  OLLAMA = 'ollama',
  LITELLM = 'litellm',
}
```

## Error Handling

### ScribeVerseError

Base error class for ScribeVerse-specific errors.

```typescript
class ScribeVerseError extends Error {
  constructor(message: string, code?: string);

  readonly code?: string;
  readonly timestamp: Date;
}

class ParsingError extends ScribeVerseError {
  constructor(filePath: string, message: string);

  readonly filePath: string;
}

class AIProviderError extends ScribeVerseError {
  constructor(provider: AIProvider, message: string, statusCode?: number);

  readonly provider: AIProvider;
  readonly statusCode?: number;
  readonly retryable: boolean;
}

class ConfigurationError extends ScribeVerseError {
  constructor(message: string, path?: string);

  readonly path?: string;
}
```

## Examples

### Basic Usage

```typescript
import { ScribeVerse } from 'scribeverse';

const docDelta = new ScribeVerse({
  sourceDir: './src',
  outputDir: './docs',
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  }
});

try {
  const result = await docDelta.generate();
  console.log(`Generated ${result.files.length} documentation files`);
} catch (error) {
  console.error('Documentation generation failed:', error);
}
```

### Advanced Multi-Provider Setup

```typescript
import { AIProviderManager } from 'scribeverse';

const manager = new AIProviderManager({
  providers: [
    {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini'
    },
    {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022'
    }
  ],
  primaryProvider: 'openai',
  fallbackProviders: ['anthropic'],
  enableFallback: true
});

await manager.initialize();

const response = await manager.generateText(
  'Explain this function',
  'You are a code documentation expert'
);
```

### Custom Parser

```typescript
import { BaseParser, Language } from 'scribeverse';

class CustomParser extends BaseParser {
  constructor() {
    super(Language.UNKNOWN);
  }

  async parse(filePath: string, content: string): Promise<ParsedModule> {
    const chunks = this.extractChunks(content, filePath);

    return {
      path: filePath,
      name: path.basename(filePath),
      language: this.language,
      chunks,
      imports: [],
      exports: [],
      dependencies: []
    };
  }

  extractChunks(content: string, filePath: string): CodeChunk[] {
    // Custom parsing logic
    return [];
  }

  extractDependencies(content: string): string[] {
    // Custom dependency extraction
    return [];
  }
}
```

This API reference provides comprehensive documentation for integrating ScribeVerse into your applications and extending its functionality with custom parsers, providers, and generators.