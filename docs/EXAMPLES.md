# ScribeVerse Usage Examples

This document provides practical examples for using ScribeVerse in various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Configuration Examples](#configuration-examples)
- [CLI Usage](#cli-usage)
- [Programmatic Usage](#programmatic-usage)
- [Advanced Scenarios](#advanced-scenarios)
- [Integration Examples](#integration-examples)

## Basic Usage

### 1. Quick Start

```bash
# Initialize ScribeVerse in your project
cd my-project
scribeverse init

# Set your AI provider credentials
export OPENAI_API_KEY="sk-your-api-key-here"

# Generate documentation
scribeverse generate
```

### 2. Minimal Configuration

Create `scribeverse.config.json`:

```json
{
  "sourceDir": "./src",
  "outputDir": "./docs",
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini"
  }
}
```

Generate documentation:

```bash
scribeverse generate
```

### 3. Specific File Patterns

```bash
# Document only TypeScript files
scribeverse generate --include "**/*.ts" --exclude "**/*.test.ts"

# Document Python modules
scribeverse generate --include "src/**/*.py" --exclude "**/test_*.py"

# Document SQL schemas
scribeverse generate --include "database/**/*.sql"
```

## Configuration Examples

### Multi-Language Project

```json
{
  "sourceDir": "./src",
  "outputDir": "./docs",
  "include": [
    "**/*.{ts,js,tsx,jsx}",
    "**/*.py",
    "**/*.go",
    "**/*.sql"
  ],
  "exclude": [
    "node_modules/**",
    "**/*.test.*",
    "**/*.spec.*",
    "dist/**",
    "build/**"
  ],
  "languages": ["typescript", "python", "go", "sql"],
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "maxTokens": 4000,
    "temperature": 0.2
  },
  "git": {
    "enabled": true,
    "autoPush": false,
    "commitPrefix": "docs: "
  }
}
```

### Enterprise Setup with Multiple Providers

```json
{
  "sourceDir": "./src",
  "outputDir": "./documentation",
  "ai": {
    "providers": [
      {
        "provider": "openai",
        "apiKey": "${OPENAI_API_KEY}",
        "model": "gpt-4o-mini"
      },
      {
        "provider": "anthropic",
        "apiKey": "${ANTHROPIC_API_KEY}",
        "model": "claude-3-5-sonnet-20241022"
      },
      {
        "provider": "ollama",
        "model": "codellama:13b",
        "baseURL": "http://localhost:11434"
      }
    ],
    "primaryProvider": "openai",
    "fallbackProviders": ["anthropic", "ollama"],
    "enableFallback": true
  },
  "metadata": {
    "enableCache": true,
    "cacheDir": ".scribeverse/cache"
  }
}
```

### Local-First Configuration

```json
{
  "sourceDir": "./src",
  "outputDir": "./docs",
  "ai": {
    "provider": "ollama",
    "model": "llama3.2:8b",
    "baseURL": "http://localhost:11434",
    "temperature": 0.1
  },
  "git": {
    "enabled": false
  },
  "metadata": {
    "enableCache": true
  }
}
```

## CLI Usage

### Basic Commands

```bash
# Initialize with specific provider
scribeverse init --provider anthropic --model claude-3-5-sonnet-20241022

# Generate with custom output directory
scribeverse generate --output ./documentation

# Force regeneration of all files
scribeverse generate --force

# Watch mode for development
scribeverse generate --watch
```

### Advanced CLI Usage

```bash
# List available providers
scribeverse providers

# List models for specific provider
scribeverse models --provider openai

# Validate configuration
scribeverse validate

# Generate with specific configuration file
scribeverse generate --config ./custom-scribeverse.config.json

# Disable git integration
scribeverse generate --no-git

# Include/exclude specific patterns
scribeverse generate \
  --include "src/**/*.ts" \
  --include "lib/**/*.js" \
  --exclude "**/*.test.*"
```

### Environment-Specific Configurations

```bash
# Development environment
export DOCDELTA_CONFIG=./configs/dev.scribeverse.config.json
export DOCDELTA_LOG_LEVEL=debug
scribeverse generate

# Production environment
export DOCDELTA_CONFIG=./configs/prod.scribeverse.config.json
export DOCDELTA_LOG_LEVEL=error
scribeverse generate --no-git
```

## Programmatic Usage

### Basic API Usage

```typescript
import { ScribeVerse } from 'scribeverse';

const docDelta = new ScribeVerse({
  sourceDir: './src',
  outputDir: './docs',
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini'
  }
});

async function generateDocs() {
  try {
    const result = await docDelta.generate();

    console.log(`Generated documentation for ${result.stats.filesProcessed} files`);
    console.log(`Created ${result.files.length} documentation files`);
    console.log(`Used ${result.stats.tokensUsed} tokens`);
    console.log(`Generation took ${result.stats.timeElapsed}ms`);

    if (result.stats.errors.length > 0) {
      console.warn('Errors encountered:', result.stats.errors);
    }
  } catch (error) {
    console.error('Documentation generation failed:', error);
  }
}

generateDocs();
```

### Custom Parser Integration

```typescript
import { ScribeVerse, ParserFactory, Language } from 'scribeverse';

// Register custom parser for a new language
class RustParser extends BaseParser {
  constructor() {
    super(Language.RUST);
  }

  async parse(filePath: string, content: string): Promise<ParsedModule> {
    // Custom Rust parsing logic
    const chunks = this.extractChunks(content, filePath);

    return {
      path: filePath,
      name: path.basename(filePath, '.rs'),
      language: Language.RUST,
      chunks,
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      dependencies: this.analyzeDependencies(content, filePath)
    };
  }

  extractChunks(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    // Extract Rust functions
    const fnRegex = /(?:pub\s+)?fn\s+(\w+)/g;
    let match;

    while ((match = fnRegex.exec(content)) !== null) {
      chunks.push({
        id: `${filePath}:${match[1]}`,
        filePath,
        content: this.extractFunctionContent(content, match.index),
        type: ChunkType.FUNCTION,
        language: this.language,
        startLine: this.getLineNumber(content, match.index),
        endLine: 0, // Calculate actual end
        hash: this.generateHash(match[0]),
        metadata: { name: match[1] }
      });
    }

    return chunks;
  }

  extractDependencies(content: string): string[] {
    const dependencies: string[] = [];

    // Extract use statements
    const useRegex = /use\s+([\w:]+)/g;
    let match;

    while ((match = useRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }
}

// Register the custom parser
ParserFactory.registerParser(Language.RUST, RustParser);

const docDelta = new ScribeVerse({
  sourceDir: './src',
  outputDir: './docs',
  include: ['**/*.rs'],
  languages: [Language.RUST],
  ai: {
    provider: 'openai',
    model: 'gpt-4o-mini'
  }
});
```

### Multi-Provider Setup

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
    },
    {
      provider: 'ollama',
      model: 'codellama:7b',
      baseURL: 'http://localhost:11434'
    }
  ],
  primaryProvider: 'openai',
  fallbackProviders: ['anthropic', 'ollama'],
  enableFallback: true
});

await manager.initialize();

// Use specific provider for different tasks
const quickSummary = await manager.generateText(
  'Summarize this function briefly',
  undefined,
  'openai' // Fast and cost-effective
);

const detailedAnalysis = await manager.analyzeCode({
  code: complexFunction,
  language: 'typescript',
  analysisType: 'complexity'
}, 'anthropic'); // Better for complex analysis

const codeReview = await manager.analyzeCode({
  code: userFunction,
  language: 'typescript',
  analysisType: 'review'
}, 'ollama'); // Local and private
```

### Custom Template Engine

```typescript
import { TemplateEngine } from 'scribeverse';

const templateEngine = new TemplateEngine();

// Register custom templates
templateEngine.registerTemplate('function-detailed', `
# {{metadata.name}}

**File**: \`{{filePath}}\`
**Type**: {{type}}
**Language**: {{language}}

## Description
{{description}}

## Parameters
{{#each parameters}}
- **{{name}}** ({{type}}): {{description}}
{{/each}}

## Returns
{{returnType}} - {{returnDescription}}

## Example
\`\`\`{{language}}
{{example}}
\`\`\`

## Source Code
\`\`\`{{language}}
{{content}}
\`\`\`
`);

// Register custom helpers
templateEngine.registerHelper('uppercase', (str: string) => str.toUpperCase());
templateEngine.registerHelper('formatDate', (date: Date) => date.toISOString().split('T')[0]);

// Use custom template
const documentation = templateEngine.render('function-detailed', {
  metadata: { name: 'authenticateUser' },
  filePath: 'src/auth.ts',
  type: 'function',
  language: 'typescript',
  content: functionCode,
  parameters: [
    { name: 'credentials', type: 'UserCredentials', description: 'User login credentials' }
  ],
  returnType: 'Promise<User>',
  returnDescription: 'Authenticated user object'
});
```

## Advanced Scenarios

### Incremental Documentation Updates

```typescript
import { MetadataManager, FileUtils } from 'scribeverse';

class IncrementalDocGenerator {
  private metadataManager: MetadataManager;
  private docDelta: ScribeVerse;

  constructor(config: ScribeVerseConfig) {
    this.metadataManager = new MetadataManager(config.metadata);
    this.docDelta = new ScribeVerse(config);
  }

  async generateIncremental(): Promise<void> {
    await this.metadataManager.initialize();

    // Get all source files
    const sourceFiles = await FileUtils.globFiles('src/**/*.{ts,js,py}');
    const changedFiles: string[] = [];

    // Check which files have changed
    for (const filePath of sourceFiles) {
      const content = await FileUtils.readFile(filePath);
      const currentHash = this.generateHash(content);

      const metadata = await this.metadataManager.getChunkMetadata(filePath);
      if (!metadata || metadata.hash !== currentHash) {
        changedFiles.push(filePath);
      }
    }

    if (changedFiles.length === 0) {
      console.log('No changes detected. Documentation is up to date.');
      return;
    }

    console.log(`Processing ${changedFiles.length} changed files...`);

    // Process only changed files
    for (const filePath of changedFiles) {
      await this.processFile(filePath);
    }

    console.log('Incremental update completed.');
  }

  private async processFile(filePath: string): Promise<void> {
    const content = await FileUtils.readFile(filePath);
    const chunks = await this.docDelta.parseFile(filePath);

    // Update metadata for each chunk
    for (const chunk of chunks) {
      await this.metadataManager.updateChunkMetadata(chunk.id, {
        hash: chunk.hash,
        lastModified: new Date(),
        aiSummary: await this.generateSummary(chunk)
      });
    }
  }

  private async generateSummary(chunk: CodeChunk): Promise<string> {
    // Use AI to generate summary only for changed chunks
    const provider = this.docDelta.getAIProvider();
    const response = await provider.analyzeCode({
      code: chunk.content,
      language: chunk.language,
      analysisType: 'summary'
    });

    return response.content;
  }
}
```

### Multi-Project Documentation

```typescript
import { ScribeVerseManager } from 'scribeverse';

interface ProjectConfig {
  name: string;
  path: string;
  config: ScribeVerseConfig;
}

class MultiProjectDocGenerator {
  private projects: Map<string, ScribeVerse> = new Map();

  async addProject(name: string, path: string, config: Partial<ScribeVerseConfig> = {}): Promise<void> {
    const fullConfig: ScribeVerseConfig = {
      sourceDir: `${path}/src`,
      outputDir: `${path}/docs`,
      ...config
    };

    const docDelta = new ScribeVerse(fullConfig);
    await docDelta.validateConfig();

    this.projects.set(name, docDelta);
    console.log(`Added project: ${name} at ${path}`);
  }

  async generateAll(): Promise<Map<string, GenerationResult>> {
    const results = new Map<string, GenerationResult>();

    const promises = Array.from(this.projects.entries()).map(async ([name, docDelta]) => {
      try {
        console.log(`Generating documentation for ${name}...`);
        const result = await docDelta.generate();
        results.set(name, result);
        console.log(`✓ ${name}: Generated ${result.files.length} files`);
      } catch (error) {
        console.error(`✗ ${name}: Generation failed`, error);
        throw error;
      }
    });

    await Promise.all(promises);
    return results;
  }

  async generateSummaryReport(results: Map<string, GenerationResult>): Promise<string> {
    let report = '# Multi-Project Documentation Summary\n\n';

    let totalFiles = 0;
    let totalTokens = 0;
    let totalTime = 0;

    for (const [projectName, result] of results) {
      totalFiles += result.stats.filesProcessed;
      totalTokens += result.stats.tokensUsed;
      totalTime += result.stats.timeElapsed;

      report += `## ${projectName}\n`;
      report += `- Files processed: ${result.stats.filesProcessed}\n`;
      report += `- Documentation files: ${result.files.length}\n`;
      report += `- Tokens used: ${result.stats.tokensUsed}\n`;
      report += `- Time elapsed: ${result.stats.timeElapsed}ms\n`;

      if (result.stats.errors.length > 0) {
        report += `- Errors: ${result.stats.errors.length}\n`;
      }

      report += '\n';
    }

    report += '## Total Summary\n';
    report += `- Total files: ${totalFiles}\n`;
    report += `- Total tokens: ${totalTokens}\n`;
    report += `- Total time: ${totalTime}ms\n`;
    report += `- Average time per file: ${Math.round(totalTime / totalFiles)}ms\n`;

    return report;
  }
}

// Usage
const generator = new MultiProjectDocGenerator();

await generator.addProject('frontend', './frontend', {
  ai: { provider: 'openai', model: 'gpt-4o-mini' },
  include: ['**/*.tsx', '**/*.ts'],
  exclude: ['**/*.test.*']
});

await generator.addProject('backend', './backend', {
  ai: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  include: ['**/*.py'],
  exclude: ['**/test_*.py']
});

await generator.addProject('database', './database', {
  ai: { provider: 'ollama', model: 'codellama:7b' },
  include: ['**/*.sql']
});

const results = await generator.generateAll();
const summary = await generator.generateSummaryReport(results);
console.log(summary);
```

### Custom AI Provider

```typescript
import { BaseAIProvider, AIProvider, AIProviderConfig, AIResponse } from 'scribeverse';

class CustomAIProvider extends BaseAIProvider {
  private apiEndpoint: string;
  private apiKey: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.apiEndpoint = config.baseURL || 'https://api.custom-ai.com';
    this.apiKey = config.apiKey!;
  }

  async initialize(): Promise<void> {
    // Test connection
    const response = await fetch(`${this.apiEndpoint}/health`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    if (!response.ok) {
      throw new Error('Failed to initialize Custom AI provider');
    }
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
    const response = await fetch(`${this.apiEndpoint}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    const data = await response.json();
    return data.models.map((m: any) => m.id);
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const response = await this.retry(async () => {
      const res = await fetch(`${this.apiEndpoint}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model || 'default',
          prompt,
          system: systemPrompt,
          max_tokens: this.config.maxTokens || 2000,
          temperature: this.config.temperature || 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      return res.json();
    });

    this.tokenCount += response.usage?.total_tokens || 0;

    return {
      content: response.text,
      model: this.config.model || 'default',
      tokensUsed: response.usage?.total_tokens,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens
    };
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    // Streaming implementation
    const response = await fetch(`${this.apiEndpoint}/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'default',
        prompt,
        system: systemPrompt,
        stream: true
      })
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
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  yield parsed.text;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    }
  }

  // Implement other required methods...
  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    return this.generateText(
      `Summarize: ${request.content}`,
      `Create a ${request.style || 'technical'} summary.`
    );
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const prompt = `Analyze this ${request.language} code:\n\n${request.code}`;
    return this.generateText(prompt, 'You are a code analysis expert.');
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const prompt = `Create a ${request.type} diagram in ${request.format}: ${request.description}`;
    return this.generateText(prompt, 'Generate diagram code only.');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.apiEndpoint}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    return data.embedding;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// Register and use custom provider
const customProvider = new CustomAIProvider({
  provider: 'custom' as AIProvider,
  apiKey: process.env.CUSTOM_AI_API_KEY,
  baseURL: 'https://api.custom-ai.com',
  model: 'custom-model-v1'
});

const docDelta = new ScribeVerse({
  sourceDir: './src',
  outputDir: './docs',
  ai: {
    provider: customProvider
  }
});
```

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/documentation.yml
name: Generate Documentation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  documentation:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install ScribeVerse
      run: npm install -g scribeverse

    - name: Generate documentation
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      run: |
        scribeverse generate --no-git

    - name: Upload documentation
      uses: actions/upload-artifact@v3
      with:
        name: documentation
        path: docs/

    - name: Deploy to GitHub Pages
      if: github.ref == 'refs/heads/main'
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs
```

### Docker Integration

```dockerfile
# Dockerfile.scribeverse
FROM node:18-alpine

WORKDIR /app

# Install ScribeVerse
RUN npm install -g scribeverse

# Copy source code
COPY . .

# Generate documentation
CMD ["scribeverse", "generate"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  scribeverse:
    build:
      context: .
      dockerfile: Dockerfile.scribeverse
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./src:/app/src:ro
      - ./docs:/app/docs
      - ./scribeverse.config.json:/app/scribeverse.config.json:ro
```

### VS Code Extension Integration

```typescript
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate Documentation",
      "type": "shell",
      "command": "scribeverse",
      "args": ["generate"],
      "group": {
        "kind": "build",
        "isDefault": false
      },
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": []
    },
    {
      "label": "Watch Documentation",
      "type": "shell",
      "command": "scribeverse",
      "args": ["generate", "--watch"],
      "group": "build",
      "isBackground": true,
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

### Webpack Plugin

```typescript
// webpack-scribeverse-plugin.js
class ScribeVersePlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('ScribeVersePlugin', (compilation, callback) => {
      const { ScribeVerse } = require('scribeverse');

      const docDelta = new ScribeVerse({
        sourceDir: './src',
        outputDir: './docs',
        ...this.options
      });

      docDelta.generate()
        .then(() => {
          console.log('Documentation generated successfully');
          callback();
        })
        .catch((error) => {
          console.error('Documentation generation failed:', error);
          callback(error);
        });
    });
  }
}

module.exports = ScribeVersePlugin;
```

```javascript
// webpack.config.js
const ScribeVersePlugin = require('./webpack-scribeverse-plugin');

module.exports = {
  // ... other webpack config
  plugins: [
    new ScribeVersePlugin({
      ai: {
        provider: 'openai',
        model: 'gpt-4o-mini'
      }
    })
  ]
};
```

These examples demonstrate various ways to integrate and use ScribeVerse in different environments and workflows.