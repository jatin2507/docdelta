# DocDelta

A powerful multi-language documentation tool that generates comprehensive documentation suites from codebases with incremental updates and AI-powered summaries.

## Features

- **Multi-Language Support**: Parse and document JavaScript, TypeScript, Python, Go, Rust, Java, C++, SQL, and MongoDB schemas
- **AI-Optimized Flow Analysis**: Analyzes code from entry points, tracks execution flow, and generates AI-friendly documentation
- **Incremental Updates**: Only process changed code chunks for efficient documentation updates
- **AI-Powered Summaries**: Generate human-readable documentation using OpenAI's GPT models
- **Comprehensive Documentation**: Creates architecture overviews, API references, database schemas, and module documentation
- **Entry Point Detection**: Automatically identifies and follows code flow from application entry points
- **Cross-Platform Support**: Works seamlessly on Windows, macOS, and Linux
- **Git Integration**: Automatic commit and push of documentation updates with AI-generated commit messages
- **Intelligent Caching**: Metadata and cache management for optimal performance
- **Dependency Graph**: Visual representation of module relationships and dependencies
- **MongoDB Schema Support**: Parses Mongoose schemas and MongoDB collection definitions

## Installation

```bash
npm install -g doc-delta
```

Or install locally in your project:

```bash
npm install --save-dev doc-delta
```

## Quick Start

1. **Initialize DocDelta in your project:**

```bash
docdelta init
```

2. **Set your OpenAI API key:**

```bash
export OPENAI_API_KEY=your-api-key-here
```

3. **Generate documentation:**

```bash
docdelta generate
```

## Configuration

DocDelta can be configured through:
- Environment variables
- `.docdelta.yml` configuration file
- CLI command options

### Environment Variables

```bash
OPENAI_API_KEY=your-openai-api-key
DOC_OUTPUT_DIR=./docs
ENABLE_GIT_PUSH=false
LOG_LEVEL=info
MAX_PARALLEL_CHUNKS=5
CACHE_DIR=.docdelta-cache
METADATA_DIR=.metadata
```

### Configuration File (.docdelta.yml)

```yaml
sourceDir: ./src
outputDir: ./docs
include:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.py"
exclude:
  - "**/node_modules/**"
  - "**/dist/**"
languages:
  - typescript
  - javascript
  - python
ai:
  apiKey: ${OPENAI_API_KEY}
  model: gpt-4-turbo-preview
  maxTokens: 2000
  temperature: 0.7
git:
  enabled: true
  autoPush: false
  remote: origin
  branch: main
  commitPrefix: "docs:"
metadata:
  dir: .metadata
  cacheDir: .docdelta-cache
  enableCache: true
```

## CLI Commands

### Generate AI-Optimized Documentation with Flow Analysis

Generate documentation that follows code flow from entry points, perfect for AI understanding:

```bash
docdelta ai-flow [options]

Options:
  -s, --source <path>       Source directory path (default: current directory)
  -o, --output <path>       Output directory for AI docs (default: ./docs-ai)
  -i, --include <patterns>  File patterns to include
  -e, --exclude <patterns>  File patterns to exclude
  --entry <files>           Specify entry point files
  --no-git                  Disable git integration

Example:
docdelta ai-flow --source ./src --output ./ai-docs
```

This command will:
1. Automatically detect entry points (main.js, index.ts, app.js, etc.)
2. Follow import/export chains from entry points
3. Build a complete dependency graph
4. Generate structured documentation optimized for AI consumption
5. Create execution flow documentation showing how modules interact

### Generate Documentation

Generate complete documentation for your codebase:

```bash
docdelta generate [options]

Options:
  -s, --source <path>       Source directory path (default: current directory)
  -o, --output <path>       Output directory for documentation (default: ./docs)
  -i, --include <patterns>  File patterns to include
  -e, --exclude <patterns>  File patterns to exclude
  --no-git                  Disable git integration
  --no-cache                Disable caching
```

### Update Documentation

Incrementally update documentation based on code changes:

```bash
docdelta update [options]

Options:
  -s, --source <path>  Source directory path (default: current directory)
  -o, --output <path>  Output directory for documentation (default: ./docs)
  --force              Force update all documentation
```

### Commit Changes

Generate commit message and commit documentation changes:

```bash
docdelta commit [options]

Options:
  -m, --message <message>  Custom commit message
  -p, --push               Push changes after commit
```

### Check Status

Show documentation status and pending changes:

```bash
docdelta status
```

### Show Differences

Show differences between current docs and pending updates:

```bash
docdelta diff-docs [options]

Options:
  -f, --file <path>  Show diff for specific file
```

## Documentation Types

DocDelta generates multiple types of documentation:

### 1. Architecture Documentation
- System overview and component relationships
- Dependency analysis and visualization
- Design patterns and architectural decisions
- Mermaid.js diagrams for visual representation

### 2. API Reference
- Function and method signatures
- Parameter descriptions and types
- Return value specifications
- Usage examples

### 3. Database Documentation
- Table structures and relationships
- Column specifications and constraints
- Indexes and foreign keys
- Views and stored procedures

### 4. Module Documentation
- Module purpose and responsibilities
- Exported functions and classes
- Internal implementation details
- Dependencies and imports

### 5. Project Overview
- High-level project description
- Key features and capabilities
- Technology stack
- Getting started guide

## Programmatic Usage

DocDelta can also be used programmatically in your Node.js applications:

```typescript
import {
  ParserFactory,
  DocumentationGenerator,
  MetadataManager,
  GitService
} from 'doc-delta';

// Parse source files
const modules = await ParserFactory.parseDirectory('./src');

// Generate documentation
const generator = new DocumentationGenerator();
const result = await generator.generate(modules);

// Manage metadata
const metadata = new MetadataManager();
await metadata.initialize();
await metadata.updateChunksMetadata(chunks);

// Git operations
const git = new GitService();
await git.generateAndCommit(changedFiles);
```

## Advanced Features

### Incremental Updates

DocDelta tracks changes at the chunk level (functions, classes, methods) and only regenerates documentation for modified chunks:

```bash
# First generation creates full documentation and metadata
docdelta generate

# Subsequent runs only update changed chunks
docdelta update
```

### Custom Parsers

Extend DocDelta with custom language parsers:

```typescript
import { BaseParser } from 'doc-delta';

class CustomParser extends BaseParser {
  parse(filePath: string, content: string): ParsedModule {
    // Custom parsing logic
  }
}
```

### AI Model Configuration

Configure different AI models and parameters:

```yaml
ai:
  model: gpt-4-turbo-preview  # or gpt-3.5-turbo for faster/cheaper generation
  maxTokens: 2000
  temperature: 0.7  # Lower for more consistent output
```

## Performance Optimization

- **Chunk-level Caching**: Only modified code chunks are sent to the AI
- **Parallel Processing**: Multiple chunks processed concurrently
- **Metadata Storage**: File hashes and summaries cached locally
- **Incremental Updates**: Only changed files trigger documentation updates

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure `OPENAI_API_KEY` is set in environment variables
   - Check `.env` file in project root

2. **Large Codebase Performance**
   - Use `--exclude` patterns to skip unnecessary files
   - Adjust `MAX_PARALLEL_CHUNKS` for your system
   - Enable caching with `ENABLE_CACHE=true`

3. **Git Integration Issues**
   - Ensure working directory is clean before generating docs
   - Check git remote configuration
   - Verify branch permissions for pushing

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs to our GitHub repository.

## License

MIT

## Support

For issues, questions, or feature requests, please open an issue on our [GitHub repository](https://github.com/yourusername/doc-delta).#   d o c d e l t a  
 