# ScribeVerse Documentation

Welcome to the comprehensive documentation for ScribeVerse - the AI-powered documentation generation tool.

## Documentation Structure

### 📖 Core Documentation

- **[README.md](../README.md)** - Main project overview, features, and quick start guide
- **[API.md](./API.md)** - Complete API reference for programmatic usage
- **[PROVIDERS.md](./PROVIDERS.md)** - Detailed AI provider configuration guide
- **[EXAMPLES.md](./EXAMPLES.md)** - Practical usage examples and integration patterns
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contributing guidelines and development setup

### 🚀 Getting Started

1. **[Installation & Setup](../README.md#installation)** - Get ScribeVerse running quickly
2. **[Provider Configuration](./PROVIDERS.md#quick-setup)** - Configure your AI provider
3. **[Basic Usage Examples](./EXAMPLES.md#basic-usage)** - Start generating documentation

### 🎯 AI Providers

ScribeVerse supports 7 major AI providers with 50+ models:

| Provider | Documentation | Best For |
|----------|---------------|----------|
| **OpenAI** | [Setup Guide](./PROVIDERS.md#openai) | General documentation, fast generation |
| **Anthropic** | [Setup Guide](./PROVIDERS.md#anthropic-claude) | Large codebases, detailed analysis |
| **Google Gemini** | [Setup Guide](./PROVIDERS.md#google-gemini) | Multimodal docs, free tier usage |
| **GitHub Copilot** | [Setup Guide](./PROVIDERS.md#github-copilot) | Code-focused, VS Code integration |
| **xAI Grok** | [Setup Guide](./PROVIDERS.md#xai-grok) | Real-time search, reasoning |
| **Ollama** | [Setup Guide](./PROVIDERS.md#ollama-local) | Local/offline, privacy-focused |
| **LiteLLM** | [Setup Guide](./PROVIDERS.md#litellm-proxy) | Multi-provider proxy, cost optimization |

### 🔧 API Reference

- **[Core Classes](./API.md#core-classes)** - ScribeVerse, ScribeVerseManager
- **[Parser API](./API.md#parser-api)** - Language parsers and factory
- **[AI Provider API](./API.md#ai-provider-api)** - Provider interfaces and manager
- **[Generator API](./API.md#generator-api)** - Documentation generation
- **[Utilities](./API.md#utilities)** - File, Git, and metadata utilities

### 📝 Usage Examples

- **[Basic Usage](./EXAMPLES.md#basic-usage)** - Simple setup and generation
- **[CLI Examples](./EXAMPLES.md#cli-usage)** - Command-line usage patterns
- **[Programmatic Usage](./EXAMPLES.md#programmatic-usage)** - API integration
- **[Advanced Scenarios](./EXAMPLES.md#advanced-scenarios)** - Complex use cases
- **[CI/CD Integration](./EXAMPLES.md#integration-examples)** - Automated workflows

### 🛠️ Development

- **[Development Setup](../CONTRIBUTING.md#development-setup)** - Local development environment
- **[Project Structure](../CONTRIBUTING.md#project-structure)** - Codebase organization
- **[Testing](../CONTRIBUTING.md#testing)** - Test structure and guidelines
- **[Contributing](../CONTRIBUTING.md)** - How to contribute to ScribeVerse

## Quick Navigation

### By Use Case

**🏃‍♂️ I want to get started quickly**
→ [Quick Start](../README.md#quick-start)

**⚙️ I need to configure an AI provider**
→ [Provider Configuration](./PROVIDERS.md#provider-specific-configuration)

**💻 I want to use ScribeVerse programmatically**
→ [API Reference](./API.md#core-classes) + [Programmatic Examples](./EXAMPLES.md#programmatic-usage)

**🔧 I want to extend ScribeVerse**
→ [Contributing Guide](../CONTRIBUTING.md#adding-new-features)

**❓ I need help troubleshooting**
→ [Provider Troubleshooting](./PROVIDERS.md#troubleshooting)

**🏢 I need enterprise/team setup**
→ [Multi-Provider Setup](./PROVIDERS.md#multi-provider-setup) + [Advanced Examples](./EXAMPLES.md#advanced-scenarios)

### By Provider

- [OpenAI Setup](./PROVIDERS.md#openai) - Most popular, fast, reliable
- [Anthropic Setup](./PROVIDERS.md#anthropic-claude) - Best for detailed analysis
- [Local Setup (Ollama)](./PROVIDERS.md#ollama-local) - Privacy-focused, offline
- [Multi-Provider](./PROVIDERS.md#multi-provider-setup) - Enterprise configuration

### By Language

ScribeVerse supports parsing and documentation for:

- **TypeScript/JavaScript** - Full AST parsing, dependency analysis
- **Python** - Functions, classes, modules, type hints
- **SQL** - Tables, schemas, relationships
- **Go** - Packages, functions, structs (roadmap)
- **Rust** - Modules, functions, traits (roadmap)
- **Java** - Classes, methods, packages (roadmap)

## Key Features

### 🧠 AI-Powered Analysis
- **Smart Code Understanding** - Contextual analysis of code structure
- **Natural Language Generation** - Human-readable documentation
- **Multi-Model Support** - Choose the best AI model for your needs

### 📊 Intelligent Parsing
- **Multi-Language Support** - TypeScript, Python, SQL, and more
- **Dependency Mapping** - Understand code relationships
- **Incremental Updates** - Only process changed code

### 🔄 Workflow Integration
- **Git Integration** - Automatic commits and versioning
- **CI/CD Ready** - Seamless pipeline integration
- **Watch Mode** - Real-time documentation updates

### 🎨 Customizable Output
- **Multiple Formats** - Markdown, HTML, JSON
- **Custom Templates** - Tailor documentation to your needs
- **Flexible Structure** - Organize docs your way

## Common Workflows

### Development Workflow
```bash
# 1. Set up ScribeVerse in your project
scribeverse init --provider openai

# 2. Generate initial documentation
scribeverse generate

# 3. Set up watch mode for development
scribeverse generate --watch

# 4. Commit documentation changes
git add docs/
git commit -m "docs: update API documentation"
```

### CI/CD Workflow
```yaml
- name: Generate Documentation
  run: |
    scribeverse generate --no-git

- name: Deploy Documentation
  uses: peaceiris/actions-gh-pages@v3
  with:
    publish_dir: ./docs
```

### Team Workflow
```json
{
  "ai": {
    "providers": [
      { "provider": "openai", "model": "gpt-4o-mini" },
      { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" }
    ],
    "primaryProvider": "openai",
    "fallbackProviders": ["anthropic"]
  }
}
```

## Support Resources

### 📚 Learning Resources
- [README.md](../README.md) - Start here for overview and setup
- [Examples](./EXAMPLES.md) - Practical usage patterns
- [API Reference](./API.md) - Complete programming interface

### 🆘 Getting Help
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and community support
- **Documentation** - Comprehensive guides and references

### 🤝 Community
- **Contributing** - [Contributing Guidelines](../CONTRIBUTING.md)
- **Code of Conduct** - Respectful and inclusive community
- **Recognition** - Contributors acknowledged in releases

## What's Next?

### Immediate Actions
1. **[Install ScribeVerse](../README.md#installation)** and try the quick start
2. **[Configure your AI provider](./PROVIDERS.md)** of choice
3. **[Generate your first documentation](../README.md#quick-start)**

### Explore Further
- **[Advanced Examples](./EXAMPLES.md#advanced-scenarios)** for complex use cases
- **[API Documentation](./API.md)** for programmatic usage
- **[Provider Guide](./PROVIDERS.md)** for optimization tips

### Get Involved
- **[Contribute](../CONTRIBUTING.md)** to the project
- **Share feedback** through GitHub issues
- **Join discussions** in the community

---

**Happy Documenting! 🎉**

*ScribeVerse makes documentation generation intelligent, efficient, and enjoyable.*