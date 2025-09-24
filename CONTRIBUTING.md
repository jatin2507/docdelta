# Contributing to ScribeVerse

Thank you for your interest in contributing to ScribeVerse! This guide will help you get started with contributing to this AI-powered documentation generation tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contribution Guidelines](#contribution-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New Features](#adding-new-features)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them get started
- **Be collaborative**: Work together and share knowledge
- **Be constructive**: Provide helpful feedback and suggestions
- **Be professional**: Keep discussions focused and productive

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- Basic knowledge of TypeScript/JavaScript

### Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/scribeverse.git
   cd scribeverse
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run tests** to ensure everything works:
   ```bash
   npm test
   ```

## Development Setup

### Environment Configuration

Create a `.env` file in the root directory:

```bash
# AI Provider API Keys (optional for development)
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key
GOOGLE_AI_API_KEY=AIza-your-key
XAI_API_KEY=xai-your-key
GITHUB_TOKEN=ghp_your-token

# Development settings
NODE_ENV=development
LOG_LEVEL=debug
```

### Build and Development

```bash
# Development build with watch mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

### IDE Setup

**VS Code** (recommended):

Install the following extensions:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Jest

The repository includes VS Code configuration in `.vscode/`:
- Debugger configurations
- Recommended extensions
- Workspace settings

## Project Structure

```
scribeverse/
├── src/                        # Source code
│   ├── core/                   # Core functionality
│   │   ├── ai/                 # AI providers and management
│   │   │   ├── providers/      # Individual AI providers
│   │   │   ├── factory.ts      # Provider factory
│   │   │   └── manager.ts      # Multi-provider manager
│   │   ├── parser/             # Language parsers
│   │   │   ├── base.ts         # Base parser class
│   │   │   ├── typescript-parser.ts
│   │   │   ├── python-parser.ts
│   │   │   └── sql-parser.ts
│   │   └── generator/          # Documentation generators
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── cli/                    # CLI implementation
├── docs/                       # Documentation
├── examples/                   # Usage examples
├── __tests__/                  # Test files
├── dist/                       # Built files (generated)
└── scripts/                    # Build and utility scripts
```

### Key Concepts

#### Parsers
Parsers extract code chunks from source files:
- Inherit from `BaseParser`
- Support specific programming languages
- Extract functions, classes, methods, etc.

#### AI Providers
AI providers interface with different AI services:
- Implement `IAIProvider` interface
- Handle authentication and API calls
- Support text generation, code analysis, and embeddings

#### Generators
Generators create documentation from parsed code:
- Use AI providers to generate content
- Support multiple output formats
- Handle templating and formatting

## Contribution Guidelines

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Fix issues in existing code
- **Features**: Add new functionality
- **Documentation**: Improve docs and examples
- **Tests**: Add or improve test coverage
- **Performance**: Optimize existing code
- **Refactoring**: Improve code quality

### Before You Start

1. **Check existing issues**: Look for related issues or discussions
2. **Create an issue**: For new features or significant changes
3. **Discuss your approach**: Get feedback before implementing
4. **Check the roadmap**: Ensure alignment with project goals

### Coding Standards

#### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Check for linting issues
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format
```

#### TypeScript Guidelines

- Use strict TypeScript configuration
- Provide explicit type annotations for public APIs
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Use enums for constants

```typescript
// Good
interface ConfigOptions {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

function createProvider(config: ConfigOptions): IAIProvider {
  // Implementation
}

// Avoid
function createProvider(config: any): any {
  // Implementation
}
```

#### Error Handling

- Use custom error classes for different error types
- Provide meaningful error messages
- Include context information in errors
- Handle async errors properly

```typescript
class AIProviderError extends Error {
  constructor(
    public provider: AIProvider,
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

// Usage
try {
  const response = await provider.generateText(prompt);
} catch (error) {
  if (error instanceof AIProviderError) {
    console.error(`${error.provider} failed:`, error.message);
  }
  throw error;
}
```

#### Async/Await

- Prefer `async/await` over Promises chains
- Handle errors appropriately
- Use proper return types

```typescript
// Good
async function parseFile(filePath: string): Promise<ParsedModule> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return await parser.parse(filePath, content);
  } catch (error) {
    throw new ParsingError(filePath, `Failed to parse: ${error.message}`);
  }
}
```

## Testing

### Test Structure

Tests are located in the `__tests__` directory and use Jest:

```
__tests__/
├── core/
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── openai.test.ts
│   │   │   └── anthropic.test.ts
│   │   └── manager.test.ts
│   ├── parser/
│   │   ├── typescript-parser.test.ts
│   │   └── python-parser.test.ts
│   └── generator/
└── utils/
```

### Writing Tests

#### Unit Tests

```typescript
// __tests__/core/parser/typescript-parser.test.ts
import { TypeScriptParser } from '@/core/parser/typescript-parser';
import { ChunkType } from '@/types';

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(() => {
    parser = new TypeScriptParser();
  });

  test('should parse TypeScript functions', () => {
    const code = `
      export function testFunction(param: string): string {
        return param.toUpperCase();
      }
    `;

    const chunks = parser.extractChunks(code, 'test.ts');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe(ChunkType.FUNCTION);
    expect(chunks[0].metadata?.name).toBe('testFunction');
  });

  test('should extract dependencies correctly', () => {
    const code = `
      import { Component } from '@angular/core';
      import * as lodash from 'lodash';
    `;

    const dependencies = parser.extractDependencies(code);

    expect(dependencies).toContain('@angular/core');
    expect(dependencies).toContain('lodash');
  });
});
```

#### Integration Tests

```typescript
// __tests__/integration/scribeverse.test.ts
import { ScribeVerse } from '@/index';
import { MockAIProvider } from '@/test-utils/mock-ai-provider';

describe('ScribeVerse Integration', () => {
  test('should generate documentation for sample project', async () => {
    const docDelta = new ScribeVerse({
      sourceDir: '__tests__/fixtures/sample-project',
      outputDir: '__tests__/output',
      ai: {
        provider: new MockAIProvider()
      }
    });

    const result = await docDelta.generate();

    expect(result.stats.filesProcessed).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.stats.errors).toHaveLength(0);
  });
});
```

#### Mock Providers

Create mock AI providers for testing:

```typescript
// src/test-utils/mock-ai-provider.ts
export class MockAIProvider extends BaseAIProvider {
  constructor() {
    super({
      provider: 'mock' as AIProvider,
      apiKey: 'test-key'
    });
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async generateText(prompt: string): Promise<AIResponse> {
    return {
      content: `Mock response for: ${prompt.substring(0, 50)}...`,
      model: 'mock-model',
      tokensUsed: 100
    };
  }

  // Implement other required methods...
}
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- typescript-parser.test.ts

# Run tests with coverage
npm run test:coverage

# Update snapshots
npm run test:update-snapshots
```

## Submitting Changes

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Build process or auxiliary tool changes

Examples:
```bash
git commit -m "feat(ai): add Grok AI provider support"
git commit -m "fix(parser): handle empty TypeScript files"
git commit -m "docs(api): update AI provider configuration examples"
```

### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/new-feature
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** following the guidelines above

3. **Write/update tests** for your changes

4. **Ensure all tests pass**:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

5. **Update documentation** if needed

6. **Commit your changes** with descriptive messages

7. **Push to your fork**:
   ```bash
   git push origin feature/new-feature
   ```

8. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Reference related issues
   - Include screenshots if applicable
   - Add tests and documentation updates

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Other (specify)

## Testing
- [ ] All existing tests pass
- [ ] New tests added for changes
- [ ] Manual testing completed

## Documentation
- [ ] Documentation updated
- [ ] Examples updated if needed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] No breaking changes (or clearly documented)
```

## Adding New Features

### Adding a New AI Provider

1. **Create provider class** in `src/core/ai/providers/`:

```typescript
// src/core/ai/providers/new-provider.ts
export class NewProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super({ ...config, provider: AIProvider.NEW_PROVIDER });
  }

  async initialize(): Promise<void> {
    // Initialize API client
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    // Implement text generation
  }

  // Implement all required methods...
}
```

2. **Update enums and types**:

```typescript
// src/types/index.ts
export enum AIProvider {
  // ... existing providers
  NEW_PROVIDER = 'new-provider',
}
```

3. **Register in factory**:

```typescript
// src/core/ai/providers/factory.ts
import { NewProvider } from './new-provider';

export class AIProviderFactory {
  private static providers = new Map([
    // ... existing providers
    [AIProvider.NEW_PROVIDER, NewProvider],
  ]);

  static getProviderInfo(provider: AIProvider) {
    const providerInfo = {
      // ... existing providers
      [AIProvider.NEW_PROVIDER]: {
        name: 'New Provider',
        requiresApiKey: true,
        supportedFeatures: ['text', 'code'],
        isLocal: false,
        description: 'Description of new provider'
      },
    };

    return providerInfo[provider];
  }
}
```

4. **Add tests**:

```typescript
// __tests__/core/ai/providers/new-provider.test.ts
describe('NewProvider', () => {
  test('should initialize correctly', async () => {
    const provider = new NewProvider({
      provider: AIProvider.NEW_PROVIDER,
      apiKey: 'test-key'
    });

    await expect(provider.validateConfig()).resolves.toBe(true);
  });
});
```

5. **Update documentation**:
   - Add to README.md provider table
   - Add configuration example
   - Update PROVIDERS.md

### Adding a New Language Parser

1. **Create parser class**:

```typescript
// src/core/parser/new-language-parser.ts
export class NewLanguageParser extends BaseParser {
  constructor() {
    super(Language.NEW_LANGUAGE);
  }

  async parse(filePath: string, content: string): Promise<ParsedModule> {
    // Parse logic specific to the language
  }

  extractChunks(content: string, filePath: string): CodeChunk[] {
    // Extract functions, classes, etc.
  }

  extractDependencies(content: string): string[] {
    // Extract imports/dependencies
  }
}
```

2. **Update types**:

```typescript
// src/types/index.ts
export enum Language {
  // ... existing languages
  NEW_LANGUAGE = 'new-language',
}
```

3. **Register in factory**:

```typescript
// src/core/parser/factory.ts
export class ParserFactory {
  static createParser(language: Language): BaseParser {
    const parsers = {
      // ... existing parsers
      [Language.NEW_LANGUAGE]: () => new NewLanguageParser(),
    };

    return parsers[language]?.() ?? new BaseParser(language);
  }
}
```

4. **Add comprehensive tests**:

```typescript
// __tests__/core/parser/new-language-parser.test.ts
describe('NewLanguageParser', () => {
  test('should parse functions correctly', () => {
    const code = `function example() { return 42; }`;
    const chunks = parser.extractChunks(code, 'test.ext');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe(ChunkType.FUNCTION);
  });
});
```

### Adding New Documentation Templates

1. **Create template files** in `src/templates/`:

```handlebars
{{!-- src/templates/new-format.hbs --}}
# {{name}}

**File**: {{filePath}}
**Type**: {{type}}

{{#if description}}
## Description
{{description}}
{{/if}}

{{#if parameters}}
## Parameters
{{#each parameters}}
- **{{name}}** ({{type}}): {{description}}
{{/each}}
{{/if}}
```

2. **Register template**:

```typescript
// src/core/generator/template-engine.ts
export class TemplateEngine {
  private static defaultTemplates = {
    // ... existing templates
    'new-format': require('../../templates/new-format.hbs'),
  };
}
```

## Development Tips

### Debugging

Use VS Code debugger with provided configurations:

1. Set breakpoints in your code
2. Run "Debug Tests" or "Debug CLI" from VS Code
3. Step through code execution

### Performance Testing

```typescript
// Measure performance
console.time('operation');
await performOperation();
console.timeEnd('operation');

// Memory usage
const used = process.memoryUsage();
console.log('Memory usage:', used);
```

### Testing with Real AI Providers

Create test configurations for different providers:

```typescript
// __tests__/config/test-providers.ts
export const testConfigs = {
  openai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini'
  },
  anthropic: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022'
  }
};
```

## Getting Help

- **Issues**: Check existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Refer to docs/ directory
- **Examples**: Check examples/ directory

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Special acknowledgments for significant contributions

Thank you for contributing to ScribeVerse! Your contributions help make documentation generation better for everyone.