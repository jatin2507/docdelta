# ScribeVerse Releases

## 🚀 Version 1.2.3 - Latest Release

**Release Date:** September 24, 2025
**Status:** Stable

### 🎉 What's New

#### 🔧 **Fixed Init Command - JSON Configuration**
- **Fixed**: `scribeverse init` now generates `scribeverse.config.json` instead of YAML
- **Added**: Automatic migration from legacy `.scribeverse.yml` to JSON format
- **Enhanced**: Modern AI provider configuration structure
- **Improved**: Better default values for AI models and settings

#### ⚡ **Streaming Progress for Documentation Generation**
- **Added**: Real-time progress indicators during documentation generation
- **Enhanced**: Step-by-step progress with percentages `[3/6] Creating API reference... (50%)`
- **Improved**: Users can now see exactly what's happening during generation
- **Better UX**: No more waiting without feedback during long operations

#### 🧠 **Enhanced AI Integration & Configuration**
- **Fixed**: AI model integration now works correctly with proper validation
- **Enhanced**: Better error messages for missing API keys per provider
- **Added**: Support for multiple AI provider environment variables
- **Updated**: Default model changed to `gpt-4o-mini` for better performance/cost ratio
- **Improved**: More realistic API key validation (15+ characters minimum)

#### 📚 **Documentation Updates**
- **Added**: Reference to Smart Features Guide (`docs/SMART-FEATURES.md`)
- **Enhanced**: Better visibility of intelligent automation features
- **Updated**: Configuration examples match actual JSON output
- **Improved**: Clear setup instructions for all AI providers

#### 🛠️ **Technical Improvements**
- **Enhanced**: Comprehensive input validation with better error messages
- **Added**: Progress callback system in DocumentationGenerator
- **Improved**: Cross-platform file path handling
- **Fixed**: Console output cleanup during tests (no more spam in publish logs)

#### ✨ **Function Flow Diagrams**
- Auto-generated Mermaid.js flowcharts showing function call relationships
- Visual representation of code dependencies and execution flow
- Support for multiple programming languages
- Interactive diagrams in HTML output

#### 🧠 **AI Provider Support**
- **7 AI Providers**: OpenAI, Anthropic, Google Gemini, GitHub Copilot, xAI Grok, Ollama, LiteLLM
- **50+ AI Models**: Support for latest GPT-4o, Claude 3.5, Gemini 2.0, and more
- **Smart Error Recovery**: Graceful handling of AI provider failures
- **Token Optimization**: Efficient prompt engineering for cost reduction

### 🐛 **Bug Fixes**

#### **Configuration Issues**
- **Fixed**: Init command generating YAML instead of JSON configuration
- **Fixed**: Environment variable loading for AI provider API keys
- **Fixed**: Config validation not recognizing valid API keys from environment
- **Fixed**: Legacy config migration causing startup errors

#### **Documentation Generation**
- **Fixed**: AI service initialization errors with proper API keys
- **Fixed**: Streaming progress not showing during long operations
- **Fixed**: Parser not extracting chunks from valid JavaScript/TypeScript files
- **Fixed**: Error handling showing cryptic messages instead of helpful guidance

#### **Development Experience**
- **Fixed**: Console spam during test runs cluttering npm publish output
- **Fixed**: TypeScript compilation warnings in validation utilities
- **Fixed**: ESLint warnings in error handling modules
- **Fixed**: Cross-platform path resolution issues on Windows

### 🔄 **Breaking Changes**

**None** - This release maintains full backward compatibility while fixing critical issues.

**Migration Notes:**
- Legacy `.scribeverse.yml` files are automatically migrated to `scribeverse.config.json`
- All existing workflows continue to work without changes
- Environment variable names remain the same

### 🛠️ **Technical Enhancements**

#### **Multi-Language Support**
- **TypeScript/JavaScript**: Full AST parsing with dependency analysis
- **Python**: Functions, classes, modules with type hint support
- **SQL**: Database schemas, tables, and relationships
- **More Languages**: Go, Rust, Java support in development

#### **Output Formats**
- **Markdown**: GitHub-flavored markdown with enhanced formatting
- **HTML**: Interactive documentation with search and navigation
- **JSON**: Structured data for programmatic usage
- **Custom Templates**: Flexible template system for customization

#### **Git Integration**
- **Smart Commits**: Auto-generated commit messages
- **Version Control**: Track documentation changes
- **Branch Support**: Work with multiple branches
- **Remote Push**: Automated deployment to repositories

### 📦 **Installation & Usage**

```bash
# Install globally
npm install -g scribeverse@1.2.3

# Quick start
scribeverse init
scribeverse generate

# Watch mode for development
scribeverse generate --watch
```

### 🔧 **Configuration**

```json
{
  "sourceDir": "./src",
  "outputDir": "./docs",
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "your-api-key"
  },
  "include": ["**/*.{ts,js,py,sql}"],
  "exclude": ["node_modules/**", "dist/**"]
}
```

### 📊 **Supported AI Providers**

| Provider | Models | Best For |
|----------|--------|----------|
| **OpenAI** | GPT-4o, GPT-4-turbo, GPT-3.5-turbo | Fast, reliable documentation |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus | Large codebases, detailed analysis |
| **Google Gemini** | Gemini 2.0/1.5 Pro/Flash | Multimodal content, free tier |
| **GitHub Copilot** | GPT-4, Code models | VS Code integration |
| **xAI Grok** | Grok-3, Grok-4 | Real-time search, reasoning |
| **Ollama** | Llama, Mistral, CodeLlama | Local/offline, privacy-focused |
| **LiteLLM** | 100+ unified models | Multi-provider proxy |

### 🎯 **Use Cases**

- **API Documentation**: Generate comprehensive API references
- **Code Documentation**: Document functions, classes, and modules
- **Architecture Diagrams**: Visualize system relationships
- **Team Onboarding**: Create developer guides and tutorials
- **Compliance**: Maintain up-to-date technical documentation

### 📈 **Migration from Previous Versions**

No breaking changes - simply update your installation:

```bash
npm update -g scribeverse
```

All existing configurations remain compatible.

### 🐛 **Bug Fixes**

- Fixed TypeScript compilation issues
- Improved error handling for network failures
- Better handling of special characters in file names
- Enhanced cross-platform compatibility
- Resolved memory leaks in watch mode

### 📝 **Documentation**

- **[Getting Started](README.md#quick-start)** - Quick setup guide
- **[Configuration](docs/README.md)** - Detailed configuration options
- **[API Reference](docs/API.md)** - Programmatic usage
- **[Examples](docs/EXAMPLES.md)** - Practical usage examples
- **[Providers](docs/PROVIDERS.md)** - AI provider setup guides

### 🔮 **What's Next?**

#### **Upcoming in v1.3.0**
- Enhanced diagram types (sequence, class, component)
- PDF output format support
- Advanced template customization
- Team collaboration features

#### **Roadmap**
- IDE extensions (VS Code, JetBrains)
- Real-time collaboration
- Advanced analytics and insights
- Enterprise SSO integration

### 🤝 **Contributing**

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

### 📄 **License**

MIT License - see [LICENSE](LICENSE) for details.

### 🔗 **Links**

- **Repository**: [GitHub](https://github.com/jatin2507/scribeverse)
- **Documentation**: [docs/README.md](docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/jatin2507/scribeverse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jatin2507/scribeverse/discussions)

---

## 📋 **Previous Releases**

### Version 1.1.1
- Initial multi-provider AI support
- Basic function flow diagrams
- Git integration improvements

### Version 1.0.0
- Initial release
- TypeScript/JavaScript support
- OpenAI integration
- Markdown output

---

**Download the latest version:**
```bash
npm install -g scribeverse@1.2.3
```

*ScribeVerse - AI-Powered Documentation Generation for Modern Development*