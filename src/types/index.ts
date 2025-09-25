export interface CodeChunk {
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

export enum ChunkType {
  CLASS = 'class',
  FUNCTION = 'function',
  METHOD = 'method',
  INTERFACE = 'interface',
  TYPE = 'type',
  ENUM = 'enum',
  VARIABLE = 'variable',
  MODULE = 'module',
  NAMESPACE = 'namespace',
  COMMENT = 'comment',
  DATABASE_TABLE = 'database_table',
  DATABASE_SCHEMA = 'database_schema',
}

export enum Language {
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

export interface ParsedModule {
  path: string;
  name: string;
  language: Language;
  chunks: CodeChunk[];
  imports: string[];
  exports: string[];
  dependencies: DependencyInfo[];
}

export interface DependencyInfo {
  source: string;
  target: string;
  type: 'import' | 'export' | 'call' | 'inheritance';
}

export interface DocumentationSection {
  id: string;
  type: DocType;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  children?: DocumentationSection[];
}

export enum DocType {
  ARCHITECTURE = 'architecture',
  API_REFERENCE = 'api_reference',
  DATABASE = 'database',
  MODULE = 'module',
  OVERVIEW = 'overview',
  DIAGRAM = 'diagram',
}

export interface AIConfig {
  // Provider configuration
  provider?: string; // AI provider to use (e.g., 'openai', 'anthropic', 'grok', 'vscode-extension', etc.)
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseURL?: string;

  // Provider-specific configurations
  region?: string; // For AWS Bedrock, Azure
  projectId?: string; // For Google Gemini
  githubToken?: string; // For GitHub Copilot
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  stopSequences?: string[];
  bestOf?: number;
  useBeamSearch?: boolean;
  customHeaders?: Record<string, string>;

  // Multi-provider configuration
  fallbackProviders?: string[];
  enableFallback?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  additionalProviders?: any[]; // Additional provider configurations

  // GitHub Copilot specific options
  copilotAccessMethod?: 'api' | 'vscode' | 'language-server' | 'auto';
  vscodeExtensionPath?: string;

  // VS Code Extension Integration
  vscodeExtensions?: VSCodeExtensionConfig[];
  useVSCodeExtensions?: boolean;
  preferVSCodeExtensions?: boolean;

  // Grok AI specific options
  enableSearch?: boolean; // For Grok's Live Search capability
  reasoningEffort?: 'low' | 'medium' | 'high'; // For grok-3-mini models
}

export interface VSCodeExtensionConfig {
  id: string; // Extension ID (e.g., 'ms-vscode.vscode-ai', 'GitHub.copilot')
  name: string; // Human-readable name
  provider: string; // AI provider type (e.g., 'openai', 'anthropic', 'claude', 'copilot')
  model?: string; // Model to use
  enabled: boolean;
  priority?: number; // Higher priority extensions are tried first
  settings?: Record<string, any>; // Extension-specific settings
}

export interface DocDeltaConfig {
  sourceDir: string;
  outputDir: string;
  include?: string[];
  exclude?: string[];
  languages?: Language[];
  ai: AIConfig;
  git?: GitConfig;
  metadata?: MetadataConfig;
}

export interface GitConfig {
  enabled: boolean;
  autoPush?: boolean;
  remote?: string;
  branch?: string;
  commitPrefix?: string;
}

export interface MetadataConfig {
  dir: string;
  cacheDir?: string;
  enableCache?: boolean;
}

export interface DiffResult {
  added: CodeChunk[];
  modified: CodeChunk[];
  deleted: CodeChunk[];
  unchanged: CodeChunk[];
}

export interface GenerationResult {
  sections: DocumentationSection[];
  files: GeneratedFile[];
  stats: GenerationStats;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: DocType;
  module?: string; // Reference to the source module
  crossReferences?: string[]; // List of related files
  tags?: string[]; // File categorization tags
  metadata?: any; // Additional metadata for specialized file types
}

export interface GenerationStats {
  filesProcessed: number;
  chunksAnalyzed: number;
  tokensUsed: number;
  timeElapsed: number;
  errors: string[];
}

export interface ChunkMetadata {
  hash: string;
  lastModified: Date;
  aiSummary?: string;
  docReferences?: string[];
}

export interface ProjectMetadata {
  version: string;
  lastGenerated: Date;
  chunks: Map<string, ChunkMetadata>;
  configuration: DocDeltaConfig;
}