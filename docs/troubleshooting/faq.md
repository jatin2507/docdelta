# ❓ Frequently Asked Questions

<div align="center">

![FAQ](https://img.shields.io/badge/FAQ-Comprehensive-blue?style=for-the-badge)
![Updated](https://img.shields.io/badge/Last%20Updated-September%202025-green?style=for-the-badge)

**Quick answers to common ScribeVerse questions**

</div>

---

## 📋 Table of Contents

- [🚀 Getting Started](#-getting-started)
- [⚙️ Configuration](#️-configuration)
- [🤖 AI Providers](#-ai-providers)
- [📊 Documentation Generation](#-documentation-generation)
- [🎨 Visual Diagrams](#-visual-diagrams)
- [🔧 Technical Issues](#-technical-issues)
- [💰 Pricing & Billing](#-pricing--billing)
- [🏢 Enterprise & Teams](#-enterprise--teams)

---

## 🚀 Getting Started

### Q: What is ScribeVerse?
**A:** ScribeVerse is an AI-powered documentation generator that analyzes your codebase and creates comprehensive documentation using advanced AI models. It supports multiple programming languages, generates visual diagrams, and integrates with various AI providers.

### Q: Do I need an AI API key to use ScribeVerse?
**A:** Not necessarily! You can use ScribeVerse without any API keys by using the VS Code integration feature:
```bash
scribeverse generate --use-vscode
```
This works with GitHub Copilot, Claude, Continue, and other VS Code AI extensions.

### Q: What programming languages does ScribeVerse support?
**A:** Currently supported languages:
- **TypeScript/JavaScript** - Full AST parsing and dependency analysis
- **Python** - Functions, classes, type hints, docstrings
- **SQL** - Tables, schemas, relationships, triggers
- **Go, Rust, Java** - Coming soon in future releases

### Q: How long does it take to generate documentation?
**A:** Generation time varies by project size:
- **Small projects (< 50 files)**: 1-3 minutes
- **Medium projects (50-200 files)**: 3-10 minutes
- **Large projects (200+ files)**: 10-30 minutes

---

## ⚙️ Configuration

### Q: Where should I put my configuration file?
**A:** ScribeVerse looks for configuration files in this order:
1. `scribeverse.config.json` (recommended)
2. `scribeverse.config.js`
3. `.scribeverse.yml` (legacy, automatically migrated)

Place it in your project root directory.

### Q: Can I use environment variables in my config?
**A:** Yes! Use the `${VARIABLE_NAME}` syntax:
```json
{
  "ai": {
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

### Q: How do I exclude certain files or folders?
**A:** Use the `exclude` pattern in your config:
```json
{
  "exclude": [
    "node_modules/**",
    "dist/**",
    "*.test.ts",
    "**/*.spec.js"
  ]
}
```

### Q: Can I customize the output directory?
**A:** Yes, in several ways:
```bash
# Command line
scribeverse generate --output ./my-docs

# Configuration
{
  "outputDir": "./documentation"
}

# Custom docs folder name
scribeverse generate --docs-folder technical-docs
```

---

## 🤖 AI Providers

### Q: Which AI provider should I choose?
**A:** Depends on your needs:
- **Beginners**: VS Code integration (no API key needed)
- **General use**: OpenAI gpt-4o-mini (cost-effective)
- **Large codebases**: Anthropic Claude 3.5 Sonnet
- **Privacy-focused**: Ollama (local, free)
- **Budget-conscious**: Google Gemini (generous free tier)

### Q: Can I use multiple AI providers?
**A:** Absolutely! Set up automatic fallbacks:
```json
{
  "ai": {
    "primaryProvider": "openai",
    "fallbackProviders": ["anthropic", "vscode-extension"],
    "enableFallback": true
  }
}
```

### Q: What happens if my AI provider is down?
**A:** ScribeVerse has multiple fallback layers:
1. Try alternative models from the same provider
2. Switch to fallback providers
3. Use VS Code extensions if available
4. Generate documentation using static code analysis
5. Create emergency documentation with basic project info

### Q: How do I check if my AI provider is working?
**A:** Use the validation commands:
```bash
# Check provider configuration
scribeverse validate --provider openai

# Test specific model
scribeverse validate --model gpt-4o-mini --provider openai

# Check all providers
scribeverse validate
```

---

## 📊 Documentation Generation

### Q: Why is my documentation generation failing?
**A:** Common causes and solutions:
1. **API key issues**: Check environment variables with `echo $OPENAI_API_KEY`
2. **No files found**: Verify `include` patterns and `sourceDir`
3. **Provider errors**: Try a different provider or model
4. **Rate limits**: Wait and retry, or use a different provider

### Q: Can I regenerate documentation incrementally?
**A:** Yes! ScribeVerse supports incremental updates:
```bash
# Only process changed files
scribeverse generate --incremental

# Watch for changes
scribeverse generate --watch
```

### Q: How do I generate documentation for specific files only?
**A:** Use include patterns:
```bash
# Specific files
scribeverse generate --include "src/api/**/*.ts"

# Multiple patterns
scribeverse generate --include "src/**/*.{ts,py}" --exclude "**/*.test.*"
```

### Q: Can I customize the documentation format?
**A:** Yes, through configuration:
```json
{
  "output": {
    "format": "markdown",
    "structure": "modular",
    "includeMetadata": true,
    "generateIndex": true
  }
}
```

---

## 🎨 Visual Diagrams

### Q: How do I enable visual diagram generation?
**A:** Use the `--diagrams` flag or configure it:
```bash
# Command line
scribeverse generate --diagrams

# Configuration
{
  "diagrams": {
    "enabled": true,
    "format": "png",
    "interactive": true
  }
}
```

### Q: What types of diagrams can ScribeVerse generate?
**A:** Several types:
- 🏗️ Project structure diagrams
- 🔗 Module dependency graphs
- 📊 Class and interface relationships
- 🗄️ Database ER diagrams
- 🔄 Function flow charts

### Q: Why aren't my diagrams generating?
**A:** Diagram generation requires additional tools:
```bash
# Install Mermaid CLI globally
npm install -g @mermaid-js/mermaid-cli

# Or locally
npm install --save-dev @mermaid-js/mermaid-cli

# Alternative: Install Puppeteer
npm install --save-dev puppeteer
```

### Q: Can I customize diagram appearance?
**A:** Yes, through configuration:
```json
{
  "diagrams": {
    "theme": "default",
    "backgroundColor": "#ffffff",
    "format": "png",
    "width": 1200,
    "height": 800
  }
}
```

---

## 🔧 Technical Issues

### Q: ScribeVerse is running slowly. How can I speed it up?
**A:** Several optimization strategies:
1. **Use faster models**: gpt-4o-mini instead of gpt-4o
2. **Enable chunking**: Process files in smaller batches
3. **Exclude unnecessary files**: Update your exclude patterns
4. **Use local providers**: Ollama for offline processing
5. **Increase concurrency**: Process multiple files in parallel

### Q: I'm getting "context length exceeded" errors. What should I do?
**A:** Try these solutions:
1. **Use models with larger context**: Claude 3.5 Sonnet has 200K context
2. **Enable chunking**: Break large files into smaller pieces
3. **Exclude large files**: Skip generated or bundled files
4. **Use selective processing**: Generate docs for specific modules

### Q: How do I fix "Permission denied" errors?
**A:** Check file permissions:
```bash
# Make sure you have read access to source files
chmod -R 755 src/

# Ensure write access to output directory
chmod -R 755 docs/

# On Windows, run as administrator if needed
```

### Q: Can I run ScribeVerse in CI/CD pipelines?
**A:** Absolutely! Example GitHub Actions workflow:
```yaml
- name: Generate Documentation
  run: scribeverse generate --no-git
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## 💰 Pricing & Billing

### Q: How much does it cost to use ScribeVerse?
**A:** ScribeVerse itself is free and open-source. Costs come from AI provider usage:

| Provider | Typical Cost (Small Project) | Typical Cost (Large Project) |
|----------|------------------------------|-------------------------------|
| VS Code Extensions | Free | Free |
| Ollama (Local) | Free | Free |
| Google Gemini | Free (up to limits) | $5-20/month |
| OpenAI gpt-4o-mini | $2-10/month | $20-100/month |
| Anthropic Claude | $10-30/month | $50-300/month |

### Q: How can I estimate costs before running?
**A:** Use the cost estimation feature:
```bash
# Estimate for your project
scribeverse usage --estimate

# Estimate for specific token count
scribeverse usage --estimate --tokens 50000 --model gpt-4o-mini
```

### Q: How can I reduce AI costs?
**A:** Cost-saving strategies:
1. **Use free options**: VS Code integration or Ollama
2. **Choose cost-effective models**: gpt-4o-mini over gpt-4o
3. **Optimize exclude patterns**: Skip unnecessary files
4. **Use incremental updates**: Only process changed files
5. **Batch processing**: Generate docs less frequently

---

## 🏢 Enterprise & Teams

### Q: Can multiple team members use the same configuration?
**A:** Yes! Share the configuration file and use environment variables:
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "${TEAM_OPENAI_KEY}"
  }
}
```

### Q: How do I set up ScribeVerse for a large organization?
**A:** Consider:
1. **Multi-provider setup** with fallbacks for reliability
2. **Shared configuration** repository for consistency
3. **CI/CD integration** for automated documentation
4. **Usage monitoring** to track costs across teams
5. **Private model hosting** for sensitive codebases

### Q: Can I use ScribeVerse with private/self-hosted AI models?
**A:** Yes, through several options:
1. **Ollama**: Self-hosted open-source models
2. **LiteLLM**: Proxy to private model endpoints
3. **Custom providers**: Extend ScribeVerse with custom integrations

### Q: How do I ensure consistent documentation across projects?
**A:** Use shared configuration:
1. Create a template `scribeverse.config.json`
2. Share via npm package or git submodule
3. Use organization-wide coding standards
4. Set up automated validation in CI/CD

---

## 🆘 Still Need Help?

### 🔍 Search Documentation
- Use Ctrl+F to search this page
- Check the [Complete Documentation](../README.md)
- Browse [Examples](../examples/) for similar use cases

### 📞 Get Support
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/jatin2507/scribeverse/issues)
- **💬 Questions**: [GitHub Discussions](https://github.com/jatin2507/scribeverse/discussions)
- **📧 Enterprise Support**: Contact for team/enterprise assistance
- **📖 Community**: Join our growing community of developers

### 🚀 Contributing
Found an issue or want to improve ScribeVerse?
- [Contributing Guide](../../CONTRIBUTING.md)
- [Development Setup](../../CONTRIBUTING.md#development-setup)
- [Report Documentation Issues](https://github.com/jatin2507/scribeverse/issues/new)

---

<div align="center">

**🎉 Question not answered here?**

[![Ask Question](https://img.shields.io/badge/Ask%20Question-GitHub%20Discussions-blue?style=for-the-badge)](https://github.com/jatin2507/scribeverse/discussions)
[![Report Issue](https://img.shields.io/badge/Report%20Issue-GitHub%20Issues-red?style=for-the-badge)](https://github.com/jatin2507/scribeverse/issues)

*We're here to help you succeed with ScribeVerse!*

</div>