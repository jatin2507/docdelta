# DocDelta Usage Guide

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Set Environment Variables
Create a `.env` file in the project root:
```env
OPENAI_API_KEY=your-openai-api-key-here
DOC_OUTPUT_DIR=./docs
ENABLE_GIT_PUSH=false
LOG_LEVEL=info
```

### 4. Initialize DocDelta
```bash
npx tsx src/cli/index.ts init
```

## Basic Commands

### Generate AI-Optimized Documentation (Recommended)
```bash
npx tsx src/cli/index.ts ai-flow --source ./src --output ./docs-ai
```

This generates documentation optimized for AI understanding by:
- Starting from entry points
- Following code execution flow
- Creating dependency graphs
- Organizing files by their relationships

## Basic Commands

### Generate Complete Documentation
```bash
npx tsx src/cli/index.ts generate --source ./src --output ./docs
```

### Update Documentation (Incremental)
```bash
npx tsx src/cli/index.ts update --source ./src
```

### Check Documentation Status
```bash
npx tsx src/cli/index.ts status
```

### View Documentation Changes
```bash
npx tsx src/cli/index.ts diff-docs
```

### Commit Documentation Changes
```bash
npx tsx src/cli/index.ts commit -m "Update documentation"
```

## Configuration File

Create `.docdelta.yml` in your project root:

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
ai:
  apiKey: ${OPENAI_API_KEY}
  model: gpt-4-turbo-preview
  maxTokens: 2000
git:
  enabled: true
  autoPush: false
  remote: origin
  branch: main
metadata:
  dir: .metadata
  cacheDir: .docdelta-cache
  enableCache: true
```

## Development Commands

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Lint Code
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

### Type Check
```bash
npm run typecheck
```

## Example Workflow

1. **Initial Setup**
   ```bash
   # Clone or create your project
   cd your-project

   # Initialize DocDelta
   npx tsx path/to/doc-delta/src/cli/index.ts init

   # Configure your API key
   export OPENAI_API_KEY=your-key
   ```

2. **Generate Initial Documentation**
   ```bash
   # Generate complete documentation
   npx tsx path/to/doc-delta/src/cli/index.ts generate

   # Check the generated docs
   ls -la docs/
   ```

3. **Make Code Changes**
   ```bash
   # Edit your code files
   # ...

   # Update documentation incrementally
   npx tsx path/to/doc-delta/src/cli/index.ts update
   ```

4. **Review and Commit**
   ```bash
   # Check status
   npx tsx path/to/doc-delta/src/cli/index.ts status

   # View changes
   npx tsx path/to/doc-delta/src/cli/index.ts diff-docs

   # Commit documentation
   npx tsx path/to/doc-delta/src/cli/index.ts commit -m "Update API documentation"
   ```

## Troubleshooting

### Common Issues

1. **TypeScript Build Errors**
   - Run `npm run build` to compile TypeScript
   - Check for any type errors with `npm run typecheck`

2. **Missing API Key**
   - Ensure OPENAI_API_KEY is set in environment
   - Check .env file exists and is properly formatted

3. **Permission Errors**
   - Ensure write permissions for output directory
   - Check git repository permissions if using git features

4. **Memory Issues with Large Codebases**
   - Use exclude patterns to skip unnecessary files
   - Adjust MAX_PARALLEL_CHUNKS environment variable
   - Enable caching for better performance

## Advanced Usage

### Custom Language Parsers

You can extend the parser system by creating custom parsers:

```typescript
import { BaseParser } from 'doc-delta';

class MyCustomParser extends BaseParser {
  // Implementation
}
```

### Programmatic API

Use DocDelta in your Node.js scripts:

```typescript
import { ParserFactory, DocumentationGenerator } from 'doc-delta';

async function generateDocs() {
  const modules = await ParserFactory.parseDirectory('./src');
  const generator = new DocumentationGenerator();
  const result = await generator.generate(modules);
  console.log(`Generated ${result.files.length} documentation files`);
}

generateDocs();
```

## Project Structure

```
doc-delta/
├── src/
│   ├── cli/              # CLI commands
│   ├── config/           # Configuration management
│   ├── core/
│   │   ├── parser/       # Language parsers
│   │   ├── diff/         # Diff engine
│   │   ├── ai/           # AI integration
│   │   ├── generator/    # Doc generation
│   │   ├── git/          # Git operations
│   │   └── metadata/     # Metadata management
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── dist/                 # Compiled JavaScript
├── docs/                 # Generated documentation
├── .metadata/            # Metadata storage
└── .docdelta-cache/      # Cache directory
```

## Support

For issues or questions, please refer to the main README.md or open an issue on GitHub.