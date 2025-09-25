# AI Provider Configuration Guide

ScribeVerse supports 6 major AI providers with access to the latest models. This guide covers setup, configuration, and optimization for each provider.

## Overview

| Provider | Type | Cost | Speed | Quality | Local | Features |
|----------|------|------|--------|---------|-------|----------|
| **OpenAI** | Cloud | $$$ | Fast | Excellent | No | Vision, Embeddings, Code |
| **Anthropic** | Cloud | $$$ | Medium | Excellent | No | Large context, Safety |
| **Google Gemini** | Cloud | $$ | Fast | Very Good | No | Multimodal, Free tier |
| **xAI Grok** | Cloud | $$$ | Medium | Very Good | No | Real-time search |
| **VS Code LM** | IDE | Free* | Fast | Variable | No | VS Code integration |
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

# Optional
export DOCDELTA_LOG_LEVEL="info"
```

### 2. Configuration File

Create `scribeverse.config.json`:

```json
{
  "ai": {
    "provider": "openai",
    "model": "latest",
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

OpenAI provides access to their latest GPT models optimized for different use cases:
- **Latest GPT-4o models**: Best performance and quality for complex documentation
- **GPT-4o Mini**: Cost-effective option with excellent performance for most use cases
- **Legacy models**: Available for compatibility but latest models are recommended

Use `npm run validate-models openai` to see currently available models and their specifications.

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

Anthropic offers Claude models with exceptional reasoning capabilities:
- **Claude 3.5 Sonnet**: Latest balanced model with excellent performance
- **Claude 3.5 Haiku**: Fast and efficient for quick documentation tasks
- **Claude 3 Opus**: Highest quality model for complex analysis

All models support 200k+ context windows for processing large codebases.
Use `npm run validate-models anthropic` to see currently available models.

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

Google provides Gemini models with multimodal capabilities:
- **Gemini 2.0 Flash**: Latest experimental model with cutting-edge features
- **Gemini 1.5 Pro**: Best for large context processing (up to 2M tokens)
- **Gemini 1.5 Flash**: Fast and efficient for general documentation

All models support vision, text, and code processing with competitive pricing.
Use `npm run validate-models google-gemini` to see currently available models.

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

### VS Code Language Model

**Best for**: Integrated development, using existing VS Code AI extensions

#### Setup Steps

1. **Install VS Code AI Extension**: Choose from GitHub Copilot, Claude, Continue, etc.
2. **Configure Extension**: Follow the extension's authentication process
3. **Enable Language Model API**: Ensure the extension supports VS Code's Language Model API

#### Configuration

```json
{
  "ai": {
    "provider": "vscode-lm",
    "model": "auto",
    "maxTokens": 4000,
    "temperature": 0.2
  }
}
```

#### Available Models

VS Code Language Model API provides access to models from various providers:
- **Auto-detection**: Automatically uses available models from installed extensions
- **Provider flexibility**: Works with GitHub Copilot, Claude, Continue, Codeium, etc.
- **No separate API keys**: Uses existing VS Code extension authentication

Use `npm run validate-models vscode-lm` to detect available models in your VS Code environment.

#### Benefits

- **No additional setup**: Uses existing VS Code AI extensions
- **Seamless integration**: Works within your existing development environment
- **Multiple providers**: Access different AI models through one interface
- **Cost-effective**: Uses your existing extension subscriptions

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

xAI provides Grok models with unique capabilities:
- **Latest Grok models**: State-of-the-art reasoning and analysis capabilities
- **Fast variants**: Optimized for speed while maintaining quality
- **Code-specialized models**: Specifically trained for software development tasks
- **Reasoning modes**: Advanced cognitive capabilities for complex problems

Use `npm run validate-models xai-grok` to see currently available models and their specifications.

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

#### Popular Models

Ollama provides access to many open-source models:
- **Llama models**: Latest versions with excellent performance
- **Code-specialized models**: CodeLlama, DeepSeek Coder, Qwen Coder
- **Lightweight options**: Smaller models for resource-constrained environments
- **Multilingual models**: Support for various languages and use cases

Use `npm run validate-models ollama` to see currently available models and their requirements.

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