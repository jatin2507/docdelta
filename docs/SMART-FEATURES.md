# ScribeVerse Smart Features

This document covers the intelligent automation features in ScribeVerse that make documentation and git workflows smarter and more efficient.

## 🧠 Smart Language Detection

ScribeVerse automatically detects programming languages in your project without manual configuration.

### Auto-Detection Features
- **Language Recognition**: Scans your project and identifies all programming languages
- **File Type Analysis**: Understands file extensions and their corresponding languages
- **Project Type Detection**: Identifies if it's a web, mobile, desktop, CLI, or library project
- **Manifest Integration**: Reads `package.json`, `requirements.txt`, `go.mod`, etc. for context

### Configuration
```yaml
# Enable automatic language detection
languages: auto

# Or specify minimum files needed per language
detection:
  autoDetectLanguages: true
  minFilesPerLanguage: 2
```

### Supported Languages
- **Web**: TypeScript, JavaScript (including React, Vue, Angular)
- **Backend**: Python, Go, Rust, Java, C#, PHP
- **Mobile**: Swift, Kotlin, Dart (Flutter)
- **Systems**: C, C++, Rust
- **Data**: SQL, NoSQL, Python
- **Config**: YAML, JSON, TOML, XML

## 🎯 Smart AI Model Selection

Choose from 50+ models across 7 major AI providers with intelligent recommendations.

### Supported Providers

#### OpenAI
- **GPT-4o**: Latest and most capable
- **GPT-4o-mini**: Fast and cost-effective
- **GPT-4-turbo**: High-quality with large context
- **GPT-3.5-turbo**: Budget-friendly option

#### Anthropic Claude
- **Claude 3.5 Sonnet**: Latest, excellent for code
- **Claude 3 Opus**: Most capable reasoning
- **Claude 3 Sonnet**: Balanced performance
- **Claude 3 Haiku**: Fastest responses

#### Google Gemini
- **Gemini 2.0 Flash**: Latest experimental
- **Gemini 1.5 Pro**: Production-ready multimodal
- **Gemini 1.5 Flash**: Fast inference

#### GitHub Copilot
- **GPT-4**: Code-specialized model
- **Auto Integration**: Seamless VS Code integration

#### xAI Grok
- **Grok 3 Beta**: Latest with real-time search
- **Grok 2**: Stable with reasoning
- **Web Search**: Real-time information

#### Ollama (Local)
- **Llama 3.2**: Open-source local model
- **CodeLlama**: Specialized for coding
- **Mistral**: Fast local inference
- **Qwen2.5-Coder**: Coding specialist

#### LiteLLM (Unified)
- **100+ Models**: Access any model through unified API
- **Multi-Provider**: Switch providers easily

### Environment-Specific Models
```yaml
environments:
  development:
    ai:
      model: gpt-4o-mini  # Fast for development

  production:
    ai:
      model: gpt-4o       # Best quality for production

  ci:
    ai:
      model: gpt-3.5-turbo  # Cost-effective for CI
```

## 🌊 Smart Git Integration

Revolutionary git workflow that adapts to your current branch and analyzes your changes.

### Current Branch Detection
ScribeVerse automatically uses your current active branch instead of forcing main/master.

```yaml
git:
  branch: auto  # Uses current branch automatically
```

### Smart Commit Prefix
Automatically generates commit prefixes based on the type of changes detected.

```yaml
git:
  commitPrefix: auto  # Auto-detects: feat:, fix:, docs:, etc.
```

### Change Type Detection
ScribeVerse analyzes your code changes to determine the appropriate commit type:

- **feat**: New features, new files, significant additions
- **fix**: Bug fixes, error corrections
- **docs**: Documentation changes, README updates
- **refactor**: Code restructuring, reorganization
- **style**: CSS changes, formatting improvements
- **test**: Test files, spec additions
- **chore**: Configuration, build files, dependencies

## 🚀 Smart Commit Command

The revolutionary `smart-commit` command analyzes your changes and creates intelligent commits.

### Usage
```bash
# Analyze and commit with auto-generated message
scribeverse smart-commit

# Add all files and commit
scribeverse smart-commit --add-all

# Commit and push to current branch
scribeverse smart-commit --add-all --push

# Dry run to see what would happen
scribeverse smart-commit --dry-run

# Only analyze changes without committing
scribeverse smart-commit --analyze-only

# Use custom message but keep analysis
scribeverse smart-commit --message "custom commit message"

# Short alias
scribeverse sc -ap  # add-all and push
```

### Analysis Features
The smart commit command provides detailed analysis:

- **Branch Information**: Shows current branch
- **Change Summary**: File counts, line changes, languages
- **File Analysis**: Shows each file with change type and stats
- **Smart Messages**: Generates contextual commit messages
- **Language Detection**: Identifies which languages were modified

### Example Output
```
📊 Change Analysis:
Branch: feature/smart-commits
Change Type: feat
Summary: 3 files changed, 2 added, 1 modified, +245 lines, -12 lines (typescript, javascript)

📝 Generated Commit Message:
"feat: add smart commit functionality and git utilities"

📁 Files Changed:
  ✅ src/utils/git-smart.ts (+230)
  📝 src/cli/index.ts (+15, -5)
  ✅ docs/SMART-FEATURES.md (+0)
```

## 🔄 Intelligent Configuration

ScribeVerse adapts its configuration based on your project structure and environment.

### Auto-Configuration
- **Project Detection**: Identifies project type from files
- **Dependency Analysis**: Reads manifest files for context
- **Smart Defaults**: Sets appropriate defaults based on detected setup
- **Environment Adaptation**: Different settings for dev/prod/CI

### Smart Caching
```yaml
metadata:
  smartCaching: true      # Intelligent cache invalidation
  cacheDuration: 24       # Hours to keep cache
```

### Performance Optimization
```yaml
advanced:
  parallelism: 4          # CPU cores for processing
  optimizeMemory: true    # Memory-efficient processing
  showProgress: true      # Real-time progress
```

## 🎨 Smart Documentation Generation

Automatically structures documentation based on your project architecture.

### Features
- **Structure Detection**: Analyzes codebase organization
- **Content Categorization**: Groups related functionality
- **Example Generation**: Creates relevant code examples
- **API Documentation**: Generates comprehensive API docs
- **Usage Guides**: Creates how-to documentation

### Configuration
```yaml
generation:
  autoGenerateStructure: true   # Auto-organize content
  smartOrganization: true       # Intelligent grouping
  includeExamples: true         # Generate code examples
  generateAPI: true             # API documentation
  generateUsageGuides: true     # Usage instructions
```

## 🔧 Hooks and Automation

Customize ScribeVerse behavior with hooks and automated workflows.

### Available Hooks
```yaml
hooks:
  preGenerate: []     # Before documentation generation
  postGenerate: []    # After documentation generation
  preCommit: []       # Before git commit
  postCommit: []      # After git commit
```

### Example Automation
```yaml
hooks:
  postGenerate:
    - "npm run test"                    # Run tests after docs
    - "npx prettier --write docs/"     # Format generated docs

  postCommit:
    - "npm run deploy-docs"             # Deploy docs after commit
```

## 📈 Smart Usage Tracking

Intelligent token usage tracking with cost optimization suggestions.

### Features
- **Auto-Model Selection**: Suggests optimal models for your use case
- **Cost Monitoring**: Real-time cost tracking
- **Usage Analytics**: Detailed usage patterns
- **Optimization Tips**: Suggestions to reduce costs

## 🌍 Environment-Aware Configuration

Different configurations for different environments automatically.

```yaml
environments:
  development:
    ai:
      model: gpt-4o-mini        # Fast and cheap for dev
    advanced:
      verboseLogging: true      # Detailed logs in dev

  production:
    ai:
      model: gpt-4o             # Best quality for production
    git:
      autoPush: true            # Auto-push in production

  ci:
    ai:
      model: gpt-3.5-turbo      # Cost-effective for CI
    advanced:
      parallelism: 8            # Use all CI cores
```

## 🎯 Best Practices

### For Development
1. Use `gpt-4o-mini` for fast iterations
2. Enable verbose logging for debugging
3. Use dry-run mode to test configurations

### For Production
1. Use `gpt-4o` or `claude-3.5-sonnet` for best quality
2. Enable auto-push for seamless workflows
3. Set up proper environment variables

### For CI/CD
1. Use cost-effective models like `gpt-3.5-turbo`
2. Maximize parallelism for speed
3. Cache aggressively to reduce API calls

### For Teams
1. Use consistent commit prefixes
2. Set up shared configuration templates
3. Document your model choices and reasoning

## 🚀 Getting Started

1. **Initialize with smart defaults**:
   ```bash
   scribeverse init --smart
   ```

2. **Let ScribeVerse detect your project**:
   ```bash
   scribeverse generate --auto-detect
   ```

3. **Use smart commits for better git workflow**:
   ```bash
   scribeverse smart-commit --add-all --push
   ```

4. **Monitor and optimize usage**:
   ```bash
   scribeverse usage --analyze
   ```

The smart features in ScribeVerse make documentation generation and git workflows more intelligent, efficient, and user-friendly than ever before.