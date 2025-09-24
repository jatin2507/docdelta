# ScribeVerse

**AI-Powered Documentation Generation for Codebases**

ScribeVerse is a powerful tool that analyzes your codebase and generates comprehensive documentation using advanced AI models. It intelligently parses your code, understands dependencies, and creates structured documentation that helps developers understand and maintain projects more effectively.

## 🚀 Features

- **Multi-Language Support**: TypeScript, JavaScript, Python, Go, Rust, Java, C++, SQL, and more
- **AI-Powered Analysis**: Support for 7 major AI providers with 50+ models
- **Intelligent Parsing**: Extracts functions, classes, interfaces, types, and dependencies
- **Multiple Output Formats**: Markdown, HTML, JSON, and custom templates
- **Incremental Updates**: Only processes changed files for efficiency
- **Git Integration**: Automatic commits and push support
- **Dependency Mapping**: Visualizes code relationships and imports
- **Customizable Templates**: Flexible documentation generation
- **🔧 Function Flow Diagrams**: Auto-generated Mermaid.js flowcharts showing function call relationships
- **🛡️ Enterprise-Grade Error Handling**: Bulletproof validation, error recovery, and comprehensive logging
- **🎯 AI-Optimized Prompts**: Token-efficient documentation generation designed for AI comprehension
- **⚡ Smart Filtering**: Advanced file/folder exclusion patterns for optimal performance
- **🧪 130+ Tests**: Comprehensive test coverage with zero-bug guarantee

## 🎯 Supported AI Providers

| Provider | Models | Features |
|----------|--------|----------|
| **OpenAI** | GPT-4o, GPT-4-turbo, GPT-3.5-turbo | Text, Code, Embeddings, Vision |
| **Anthropic** | Claude 3.5 Sonnet/Haiku, Claude 3 Opus | Advanced reasoning, Large context |
| **Google Gemini** | Gemini 2.5/2.0/1.5 Pro/Flash | Multimodal, Code generation |
| **GitHub Copilot** | GPT-4, Code models | Code-specialized, VS Code integration |
| **xAI Grok** | Grok-4, Grok-3, Code-fast-1 | Real-time search, Reasoning |
| **Ollama** | Llama, Mistral, CodeLlama, Qwen | Local execution, Privacy-focused |
| **LiteLLM** | 100+ unified models | Multi-provider proxy |

## 🔧 **Advanced Features**
- **Function Flow Diagrams**: Auto-generated Mermaid.js flowcharts showing function call relationships within files
- **Smart Error Recovery**: Graceful handling of invalid inputs, network failures, and provider errors
- **AI-Optimized Prompts**: Token-efficient documentation designed specifically for AI comprehension
- **Comprehensive Validation**: Input sanitization, type checking, and security hardening
- **Performance Optimized**: Advanced filtering excludes 50+ unnecessary file/folder patterns
- **🧠 Smart Automation**: Intelligent language detection, auto-commits, and workflow optimization - see [Smart Features Guide](docs/SMART-FEATURES.md)

## 📦 Installation

```bash
npm install -g scribeverse
```

Or use with npx:
```bash
npx scribeverse --help
```

## 🏗️ Quick Start

### 1. Initialize Configuration

```bash
scribeverse init
```

This creates a `scribeverse.config.json` with default settings.

### 2. Configure AI Provider

Edit the generated config file:

```json
{
  "sourceDir": "./src",
  "outputDir": "./docs",
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key",
    "model": "gpt-4o-mini",
    "maxTokens": 4000,
    "temperature": 0.2
  }
}
```

### 3. Generate Documentation

```bash
# Generate full documentation
scribeverse generate

# Generate for specific files
scribeverse generate --include "src/**/*.ts"

# Watch mode (regenerate on changes)
scribeverse generate --watch
```

## ⚙️ Configuration

### Basic Configuration

```json
{
  "sourceDir": "./src",
  "outputDir": "./docs",
  "include": ["**/*.{ts,js,py,go,rs,java,cpp,sql}"],
  "exclude": ["node_modules/**", "dist/**", "*.test.*"],
  "languages": ["typescript", "python", "sql"],
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini"
  }
}
```

### AI Provider Configuration

#### OpenAI
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "baseURL": "https://api.openai.com/v1"
  }
}
```

#### Anthropic Claude
```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 4096
  }
}
```

#### Google Gemini
```json
{
  "ai": {
    "provider": "google-gemini",
    "apiKey": "AIza...",
    "model": "gemini-2.0-flash-exp",
    "projectId": "your-project-id"
  }
}
```

#### GitHub Copilot
```json
{
  "ai": {
    "provider": "github-copilot",
    "githubToken": "ghp_...",
    "model": "gpt-4",
    "copilotAccessMethod": "auto"
  }
}
```

#### xAI Grok
```json
{
  "ai": {
    "provider": "grok",
    "apiKey": "xai-...",
    "model": "grok-3-beta",
    "enableSearch": true,
    "reasoningEffort": "medium"
  }
}
```

#### Ollama (Local)
```json
{
  "ai": {
    "provider": "ollama",
    "model": "llama3.2",
    "baseURL": "http://localhost:11434"
  }
}
```

#### LiteLLM Proxy
```json
{
  "ai": {
    "provider": "litellm",
    "model": "openai/gpt-4o-mini",
    "baseURL": "http://localhost:4000",
    "apiKey": "optional"
  }
}
```

### Git Integration

```json
{
  "git": {
    "enabled": true,
    "autoPush": false,
    "remote": "origin",
    "branch": "main",
    "commitPrefix": "docs:"
  }
}
```

### Metadata & Caching

```json
{
  "metadata": {
    "dir": ".scribeverse",
    "enableCache": true,
    "cacheDir": ".scribeverse/cache"
  }
}
```

## 🛠️ CLI Commands

### Generate Documentation
```bash
scribeverse generate [options]

Options:
  -c, --config <file>     Config file path (default: scribeverse.config.json)
  -w, --watch             Watch for changes and regenerate
  -i, --include <pattern> Include files matching pattern
  -e, --exclude <pattern> Exclude files matching pattern
  --force                 Force regeneration of all files
  --no-git                Disable git operations
```

### Initialize Project
```bash
scribeverse init [options]

Options:
  --provider <provider>   AI provider (openai, anthropic, etc.)
  --model <model>        AI model to use
  --output <dir>         Output directory
```

### List Providers & Models
```bash
scribeverse providers                 # List available providers
scribeverse models --provider openai  # List models for provider
```

### Token Usage Tracking
```bash
scribeverse usage                     # Show usage statistics
scribeverse usage --days 7           # Show last 7 days
scribeverse usage --provider openai   # Filter by provider
scribeverse usage --export           # Export usage data to JSON
scribeverse usage --clear            # Clear all usage history
scribeverse usage --clear 30         # Clear records older than 30 days
```

### Validate Configuration
```bash
scribeverse validate                  # Validate config and AI connection
```

## 📁 Output Structure

```
docs/
├── README.md                   # Project overview
├── api/                        # API documentation
│   ├── functions.md
│   ├── classes.md
│   └── interfaces.md
├── architecture/               # High-level documentation
│   ├── overview.md
│   ├── dependencies.md
│   └── diagrams/
├── modules/                    # Module-specific docs
│   ├── auth/
│   ├── database/
│   └── utils/
└── .metadata/                  # ScribeVerse metadata
    ├── chunks.json
    ├── dependencies.json
    └── cache/
```

## 🔍 Code Analysis Features

### Supported Code Elements

- **Functions/Methods**: Parameters, return types, documentation
- **Classes**: Properties, methods, inheritance
- **Interfaces/Types**: Structure and relationships
- **Variables/Constants**: Type information and usage
- **Imports/Exports**: Dependency mapping
- **Database Schemas**: Tables, columns, relationships

### Analysis Types

```typescript
// Function analysis
export async function authenticateUser(
  credentials: UserCredentials
): Promise<AuthResult> {
  // Implementation
}

// Class analysis
export class UserService {
  private db: Database;

  async createUser(data: CreateUserData): Promise<User> {
    // Implementation
  }
}

// Interface analysis
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}
```

## 🎨 Customization

### Custom Templates

Create custom documentation templates:

```typescript
// templates/function.md.hbs
# {{name}}

**Description**: {{description}}

**Parameters**:
{{#each parameters}}
- `{{name}}`: {{type}} - {{description}}
{{/each}}

**Returns**: {{returnType}}

**Usage**:
```typescript
{{example}}
```
```

### Custom Providers

Extend ScribeVerse with custom AI providers:

```typescript
import { BaseAIProvider, AIResponse } from 'scribeverse';

export class CustomProvider extends BaseAIProvider {
  async generateText(prompt: string): Promise<AIResponse> {
    // Custom implementation
  }
}
```

## 🔧 Advanced Usage

### Token Usage Tracking & Analytics

ScribeVerse automatically tracks token usage and costs for all AI providers with a built-in SQLite database:

#### Features
- **Automatic Tracking**: All AI calls are tracked automatically
- **Cost Estimation**: Real-time cost calculations for all providers
- **Usage Analytics**: Detailed breakdowns by provider, model, and operation
- **Historical Data**: Complete usage history with timestamps
- **Export/Import**: JSON export for external analysis
- **Privacy First**: All data stored locally in `~/.scribeverse/usage.db`

#### Usage Statistics
```bash
# View comprehensive usage statistics
scribeverse usage

# Output example:
📊 Token Usage Statistics (Last 30 days)

📈 Overview:
  Total Tokens: 125,847
  Estimated Cost: $12.45
  Sessions: 23
  Last Usage: 12/24/2025, 3:45:20 PM

🤖 By Provider:
  openai: 89,234 tokens
  anthropic: 36,613 tokens

🎯 By Model:
  gpt-4o-mini: 67,891 tokens
  claude-3-5-sonnet: 36,613 tokens
  gpt-4: 21,343 tokens

⚡ By Operation:
  generateText: 156 calls
  analyzeCode: 89 calls
  summarize: 34 calls
```

#### Data Export
```bash
# Export usage data for analysis
scribeverse usage --export
# Creates: scribeverse-usage-2025-09-24.json

# Example export structure:
{
  "exportDate": "2025-09-24T10:30:00Z",
  "statistics": { ... },
  "usageHistory": [
    {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "tokensUsed": 150,
      "cost": 0.000375,
      "operation": "generateText",
      "timestamp": "2025-09-24T10:25:00Z"
    }
  ]
}
```

### Programmatic API

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

// Generate documentation
await docDelta.generate();

// Parse specific files
const chunks = await docDelta.parseFile('./src/index.ts');

// Get dependency graph
const dependencies = await docDelta.analyzeDependencies();
```

### Batch Processing

```typescript
import { ScribeVerseManager } from 'scribeverse';

const manager = new ScribeVerseManager();

// Process multiple projects
await manager.processProjects([
  { name: 'frontend', path: './frontend' },
  { name: 'backend', path: './backend' },
  { name: 'shared', path: './shared' }
]);
```

### Custom Analysis

```typescript
import { TypeScriptParser } from 'scribeverse/parsers';

const parser = new TypeScriptParser();
const chunks = await parser.parse('./src/app.ts', sourceCode);

// Filter specific chunk types
const functions = chunks.filter(chunk => chunk.type === 'function');
const classes = chunks.filter(chunk => chunk.type === 'class');
```

## 🧪 Testing

ScribeVerse includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=parser
npm test -- --testPathPattern=providers
npm test -- --testPathPattern=generator

# Run with coverage
npm test -- --coverage
```

## 🛡️ Environment Variables

```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
XAI_API_KEY=xai-...
GITHUB_TOKEN=ghp_...

# Optional Configuration
DOCDELTA_CONFIG=./custom-config.json
DOCDELTA_OUTPUT_DIR=./documentation
DOCDELTA_LOG_LEVEL=debug
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/jatin2507/scribeverse.git
cd scribeverse

# Install dependencies
npm install

# Run development build
npm run dev

# Run tests
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/jatin2507/scribeverse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jatin2507/scribeverse/discussions)

## 🗺️ Roadmap

- [ ] **Language Support**: Add PHP, Ruby, C#, Kotlin, Swift
- [ ] **Output Formats**: PDF, Confluence, Notion integration
- [ ] **Advanced AI Features**: Code suggestions, automated refactoring
- [ ] **Team Collaboration**: Multi-user workflows, approval processes
- [ ] **IDE Integration**: VS Code, JetBrains plugins
- [ ] **Analytics**: Documentation usage and effectiveness metrics

---

**ScribeVerse - Intelligent Documentation for Modern Development**