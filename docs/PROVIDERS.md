# AI Provider Configuration Guide

ScribeVerse supports 7 major AI providers with 50+ models. This guide covers setup, configuration, and optimization for each provider.

## Overview

| Provider | Type | Cost | Speed | Quality | Local | Features |
|----------|------|------|--------|---------|-------|----------|
| **OpenAI** | Cloud | $$$ | Fast | Excellent | No | Vision, Embeddings, Code |
| **Anthropic** | Cloud | $$$ | Medium | Excellent | No | Large context, Safety |
| **Google Gemini** | Cloud | $$ | Fast | Very Good | No | Multimodal, Free tier |
| **GitHub Copilot** | Cloud | $$ | Fast | Code-focused | No | VS Code integration |
| **xAI Grok** | Cloud | $$$ | Medium | Very Good | No | Real-time search |
| **Ollama** | Local | Free | Variable | Good | Yes | Privacy, Customizable |
| **LiteLLM** | Proxy | Variable | Variable | Variable | Optional | Unified API |

## Quick Setup

### 1. Environment Variables

Set your API keys in environment variables:

```bash
# Core providers
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_AI_API_KEY="AIza..."
export XAI_API_KEY="xai-..."
export GITHUB_TOKEN="ghp_..."

# Optional
export DOCDELTA_LOG_LEVEL="info"
```

### 2. Configuration File

Create `scribeverse.config.json`:

```json
{
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "maxTokens": 4000,
    "temperature": 0.2
  }
}
```

## Provider-Specific Configuration

### OpenAI

**Best for**: General documentation, code analysis, embeddings

#### Setup

1. **Get API Key**: Visit [platform.openai.com](https://platform.openai.com/api-keys)
2. **Set Environment Variable**: `OPENAI_API_KEY=sk-...`

#### Configuration

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "baseURL": "https://api.openai.com/v1",
    "organizationId": "org-...",
    "maxTokens": 4000,
    "temperature": 0.2,
    "topP": 0.95,
    "frequencyPenalty": 0,
    "presencePenalty": 0,
    "stopSequences": ["END"]
  }
}
```

#### Available Models

| Model | Context | Speed | Cost | Best For |
|-------|---------|-------|------|----------|
| `gpt-4o` | 128k | Fast | High | Complex analysis |
| `gpt-4o-mini` | 128k | Very Fast | Low | General docs |
| `gpt-4-turbo` | 128k | Medium | High | Detailed analysis |
| `gpt-4` | 8k | Slow | High | High-quality docs |
| `gpt-3.5-turbo` | 16k | Very Fast | Very Low | Simple docs |

#### Optimization Tips

```json
{
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.1,     // Lower for consistent docs
    "maxTokens": 2000,      // Adjust based on needs
    "topP": 0.9             // Lower for focused output
  }
}
```

#### Cost Management

```typescript
// Monitor usage
const provider = new OpenAIProvider(config);
await provider.generateText("...");
console.log(`Tokens used: ${provider.getTokenCount()}`);

// Batch requests
const requests = chunks.map(chunk =>
  provider.analyzeCode({
    code: chunk.content,
    language: chunk.language,
    analysisType: 'summary'
  })
);
const results = await Promise.all(requests);
```

### Anthropic Claude

**Best for**: Large codebases, detailed analysis, safety-critical docs

#### Setup

1. **Get API Key**: Visit [console.anthropic.com](https://console.anthropic.com/)
2. **Set Environment Variable**: `ANTHROPIC_API_KEY=sk-ant-...`

#### Configuration

```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 4096,
    "temperature": 0.2,
    "topP": 0.95,
    "topK": 40
  }
}
```

#### Available Models

| Model | Context | Speed | Cost | Best For |
|-------|---------|-------|------|----------|
| `claude-3-5-sonnet-20241022` | 200k | Medium | Medium | Balanced performance |
| `claude-3-5-haiku-20241022` | 200k | Fast | Low | Quick documentation |
| `claude-3-opus-20240229` | 200k | Slow | High | Highest quality |
| `claude-3-sonnet-20240229` | 200k | Medium | Medium | General purpose |
| `claude-3-haiku-20240307` | 200k | Fast | Low | Simple tasks |

#### Large Context Usage

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 8192,
    "temperature": 0.1
  }
}
```

```typescript
// Process large files
const largeModule = await parser.parse('large-file.ts', content);
const documentation = await provider.summarize({
  content: largeModule.chunks.map(c => c.content).join('\n\n'),
  style: 'technical',
  maxLength: 2000
});
```

### Google Gemini

**Best for**: Multimodal docs, free tier usage, fast generation

#### Setup

1. **Get API Key**: Visit [aistudio.google.com](https://aistudio.google.com/)
2. **Set Environment Variable**: `GOOGLE_AI_API_KEY=AIza...`

#### Configuration

```json
{
  "ai": {
    "provider": "google-gemini",
    "apiKey": "AIza...",
    "model": "gemini-2.0-flash-exp",
    "projectId": "your-project-id",
    "region": "us-central1",
    "maxTokens": 8192,
    "temperature": 0.2,
    "topP": 0.95,
    "topK": 40
  }
}
```

#### Available Models

| Model | Context | Speed | Cost | Best For |
|-------|---------|-------|------|----------|
| `gemini-2.0-flash-exp` | 1M | Very Fast | Low | Latest features |
| `gemini-1.5-pro` | 2M | Medium | Medium | Large contexts |
| `gemini-1.5-flash` | 1M | Fast | Low | General docs |
| `gemini-1.0-pro` | 32k | Medium | Low | Basic tasks |

#### Free Tier Usage

```json
{
  "ai": {
    "provider": "google-gemini",
    "model": "gemini-1.5-flash",
    "maxTokens": 2048,
    "temperature": 0.3
  }
}
```

#### Multimodal Features

```typescript
// Process diagrams and images
const provider = new GoogleGeminiProvider(config);
const response = await provider.generateText(
  'Analyze this code diagram and generate documentation',
  'You are analyzing a system architecture diagram'
);
```

### GitHub Copilot

**Best for**: Code-focused documentation, VS Code users

#### Setup Options

**Option 1: API Access**
1. **GitHub Copilot Business/Enterprise**: Contact GitHub sales
2. **Set Token**: `GITHUB_TOKEN=ghp_...`

**Option 2: VS Code Extension**
1. **Install**: GitHub Copilot extension in VS Code
2. **Sign In**: With GitHub Copilot subscription

#### Configuration

```json
{
  "ai": {
    "provider": "github-copilot",
    "githubToken": "ghp_...",
    "model": "gpt-4",
    "copilotAccessMethod": "auto",
    "vscodeExtensionPath": "/custom/path/.vscode/extensions",
    "maxTokens": 2000,
    "temperature": 0.2
  }
}
```

#### Access Methods

| Method | Requirements | Features |
|--------|-------------|----------|
| `api` | API key/token | Full programmatic access |
| `vscode` | VS Code + extension | Native integration |
| `language-server` | Copilot Language Server | Local server |
| `auto` | Automatic detection | Best available method |

#### VS Code Integration

```typescript
const provider = new GitHubCopilotProvider({
  provider: 'github-copilot',
  copilotAccessMethod: 'vscode'
});

// Code-specific methods
const suggestion = await provider.generateCodeSuggestion(
  'function authenticate',
  'typescript'
);

const explanation = await provider.explainCode(
  'const user = await User.findById(id);',
  'typescript'
);

const tests = await provider.generateTests(
  functionCode,
  'typescript',
  'jest'
);
```

### xAI Grok

**Best for**: Real-time information, reasoning tasks, code analysis

#### Setup

1. **Get API Key**: Visit [x.ai/api](https://x.ai/api)
2. **Set Environment Variable**: `XAI_API_KEY=xai-...`
3. **Free Beta**: $25/month credits during beta

#### Configuration

```json
{
  "ai": {
    "provider": "grok",
    "apiKey": "xai-...",
    "model": "grok-3-beta",
    "baseURL": "https://api.x.ai/v1",
    "enableSearch": true,
    "reasoningEffort": "medium",
    "maxTokens": 4096,
    "temperature": 0.2
  }
}
```

#### Available Models

| Model | Features | Best For |
|-------|----------|----------|
| `grok-4` | Latest, most capable | Complex analysis |
| `grok-4-fast` | Optimized speed | Quick docs |
| `grok-3-beta` | Balanced performance | General use |
| `grok-3-mini` | With reasoning effort | Specialized tasks |
| `grok-code-fast-1` | Code-specialized | Code analysis |

#### Special Features

```typescript
const provider = new GrokProvider(config);

// Real-time search
const response = await provider.generateWithSearch(
  'What are the latest TypeScript features for 2024?',
  true
);

// Reasoning modes
const analysis = await provider.generateWithReasoning(
  'Analyze the complexity of this algorithm',
  'high'
);

// Code-specific analysis
const codeAnalysis = await provider.codeAnalysis(
  sourceCode,
  'typescript',
  'review'
);
```

### Ollama (Local)

**Best for**: Privacy, offline use, customization, no API costs

#### Setup

1. **Install Ollama**: Visit [ollama.ai](https://ollama.ai)
2. **Start Service**: `ollama serve`
3. **Pull Models**: `ollama pull llama3.2`

#### Configuration

```json
{
  "ai": {
    "provider": "ollama",
    "model": "llama3.2",
    "baseURL": "http://localhost:11434",
    "maxTokens": 4096,
    "temperature": 0.2,
    "topP": 0.95,
    "topK": 40
  }
}
```

#### Model Management

```bash
# List available models
ollama list

# Pull specific models
ollama pull llama3.2:8b
ollama pull codellama:13b
ollama pull mistral:7b

# Remove models
ollama rm unused-model
```

#### Recommended Models

| Model | Size | RAM | Speed | Best For |
|-------|------|-----|--------|----------|
| `llama3.2:1b` | 1.3GB | 4GB | Fast | Simple docs |
| `llama3.2:3b` | 2GB | 8GB | Medium | General docs |
| `codellama:7b` | 3.8GB | 8GB | Medium | Code analysis |
| `mistral:7b` | 4.1GB | 8GB | Medium | Balanced |
| `qwen2.5:7b` | 4.4GB | 8GB | Medium | Multilingual |

#### Custom Model Configuration

```typescript
const provider = new OllamaProvider({
  provider: 'ollama',
  model: 'codellama:13b',
  baseURL: 'http://localhost:11434'
});

// Model-specific operations
await provider.pullModel('llama3.2:3b');
await provider.deleteModel('old-model');
const models = await provider.listModels();
```

### LiteLLM Proxy

**Best for**: Multi-provider setups, cost optimization, experimentation

#### Setup

1. **Install LiteLLM**: `pip install litellm`
2. **Start Proxy**: `litellm --config config.yaml`
3. **Configure Providers**: Set up provider credentials

#### Configuration

```json
{
  "ai": {
    "provider": "litellm",
    "model": "openai/gpt-4o-mini",
    "baseURL": "http://localhost:4000",
    "apiKey": "optional-proxy-key",
    "maxTokens": 4000,
    "temperature": 0.2
  }
}
```

#### LiteLLM Proxy Config

```yaml
# litellm_config.yaml
model_list:
  - model_name: fast-model
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: sk-...

  - model_name: quality-model
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: sk-ant-...

  - model_name: local-model
    litellm_params:
      model: ollama/llama3.2
      api_base: http://localhost:11434
```

#### Model Routing

```typescript
const provider = new LiteLLMProvider({
  provider: 'litellm',
  baseURL: 'http://localhost:4000'
});

// Use different models for different tasks
await provider.switchModel('openai/gpt-4o-mini'); // Fast docs
await provider.generateText('Simple documentation task');

await provider.switchModel('anthropic/claude-3-5-sonnet-20241022'); // Complex analysis
await provider.analyzeCode({
  code: complexCode,
  language: 'typescript',
  analysisType: 'complexity'
});
```

## Multi-Provider Setup

### Provider Manager Configuration

```json
{
  "ai": {
    "providers": [
      {
        "provider": "openai",
        "apiKey": "sk-...",
        "model": "gpt-4o-mini"
      },
      {
        "provider": "anthropic",
        "apiKey": "sk-ant-...",
        "model": "claude-3-5-sonnet-20241022"
      },
      {
        "provider": "ollama",
        "model": "llama3.2",
        "baseURL": "http://localhost:11434"
      }
    ],
    "primaryProvider": "openai",
    "fallbackProviders": ["anthropic", "ollama"],
    "enableFallback": true,
    "maxRetries": 3,
    "retryDelay": 1000
  }
}
```

### Smart Provider Selection

```typescript
const manager = new AIProviderManager({
  providers: [
    { provider: 'openai', apiKey: '...', model: 'gpt-4o-mini' },
    { provider: 'anthropic', apiKey: '...', model: 'claude-3-5-sonnet-20241022' },
    { provider: 'ollama', model: 'codellama:7b' }
  ],
  primaryProvider: 'openai',
  fallbackProviders: ['anthropic', 'ollama']
});

// Automatic fallback on failure
const response = await manager.generateText(prompt);

// Provider-specific requests
const codeAnalysis = await manager.analyzeCode(request, 'ollama'); // Use local model for code
const documentation = await manager.summarize(request, 'anthropic'); // Use Claude for docs
```

## Performance Optimization

### Request Batching

```typescript
// Batch similar requests
const chunks = await parser.extractChunks(content, filePath);
const analysisPromises = chunks.map(chunk =>
  provider.analyzeCode({
    code: chunk.content,
    language: chunk.language,
    analysisType: 'summary'
  })
);

// Process in parallel with concurrency limit
const results = await Promise.all(analysisPromises.slice(0, 5));
```

### Caching Strategy

```typescript
const metadataManager = new MetadataManager({
  enableCache: true,
  cacheDir: '.scribeverse/cache'
});

// Check cache before AI request
const cachedResult = await metadataManager.getChunkMetadata(chunk.id);
if (cachedResult && cachedResult.hash === chunk.hash) {
  return cachedResult.aiSummary;
}

// Generate and cache
const result = await provider.generateText(prompt);
await metadataManager.updateChunkMetadata(chunk.id, {
  hash: chunk.hash,
  aiSummary: result.content,
  lastModified: new Date()
});
```

### Error Handling

```typescript
class ProviderErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryable(error) || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  static isRetryable(error: any): boolean {
    const retryableCodes = [429, 500, 502, 503, 504];
    return retryableCodes.includes(error.status) ||
           error.code === 'ECONNRESET';
  }
}
```

## Cost Management

### Token Estimation

```typescript
// Estimate costs before processing
const totalTokens = chunks.reduce((sum, chunk) =>
  sum + provider.estimateTokens(chunk.content), 0
);

console.log(`Estimated tokens: ${totalTokens}`);
console.log(`Estimated cost: $${(totalTokens / 1000) * 0.002}`); // GPT-4o-mini pricing
```

### Smart Model Selection

```json
{
  "ai": {
    "modelSelection": {
      "simple": "gpt-4o-mini",      // $0.002/1K tokens
      "complex": "gpt-4-turbo",     // $0.030/1K tokens
      "code": "codellama:7b",       // Free (local)
      "fallback": "gemini-1.5-flash" // Free tier
    }
  }
}
```

### Usage Monitoring

```typescript
class UsageMonitor {
  private costs: Map<string, number> = new Map();

  trackUsage(provider: string, tokens: number, model: string) {
    const cost = this.calculateCost(tokens, model);
    const current = this.costs.get(provider) || 0;
    this.costs.set(provider, current + cost);
  }

  private calculateCost(tokens: number, model: string): number {
    const pricing = {
      'gpt-4o-mini': 0.002 / 1000,
      'gpt-4o': 0.03 / 1000,
      'claude-3-5-sonnet-20241022': 0.015 / 1000,
      'gemini-1.5-flash': 0.0015 / 1000
    };

    return tokens * (pricing[model] || 0);
  }

  generateReport(): string {
    let report = 'Usage Report:\n';
    for (const [provider, cost] of this.costs) {
      report += `${provider}: $${cost.toFixed(4)}\n`;
    }
    return report;
  }
}
```

## Troubleshooting

### Common Issues

#### Rate Limiting
```typescript
// Handle rate limits
try {
  const response = await provider.generateText(prompt);
} catch (error) {
  if (error.status === 429) {
    console.log('Rate limited. Waiting 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    // Retry logic
  }
}
```

#### API Key Issues
```typescript
// Validate API keys
const isValid = await provider.validateConfig();
if (!isValid) {
  throw new Error('Invalid API key or configuration');
}
```

#### Context Length Limits
```typescript
// Chunk large content
function chunkContent(content: string, maxTokens: number): string[] {
  const chunks = [];
  const words = content.split(' ');
  let currentChunk = '';

  for (const word of words) {
    const testChunk = currentChunk + ' ' + word;
    if (provider.estimateTokens(testChunk) > maxTokens) {
      chunks.push(currentChunk);
      currentChunk = word;
    } else {
      currentChunk = testChunk;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}
```

### Provider-Specific Issues

#### Ollama Connection
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama service
ollama serve

# Check logs
ollama logs
```

#### GitHub Copilot Access
```typescript
const provider = new GitHubCopilotProvider(config);
const accessInfo = provider.getAccessMethodInfo();
console.log('Access method:', accessInfo);

if (!accessInfo?.available) {
  console.log('Try different access method or check VS Code setup');
}
```

This guide provides comprehensive setup and optimization strategies for all supported AI providers in ScribeVerse.