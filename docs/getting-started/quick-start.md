# ⚡ Quick Start Guide

<div align="center">

![Quick Start](https://img.shields.io/badge/Time%20Required-5%20minutes-green?style=for-the-badge)
![Difficulty](https://img.shields.io/badge/Difficulty-Beginner-brightgreen?style=for-the-badge)

**Get ScribeVerse up and running in 5 minutes**

</div>

---

## 🎯 What You'll Learn

By the end of this guide, you'll have:
- ✅ ScribeVerse installed and configured
- ✅ Your first AI provider set up
- ✅ Generated your first documentation
- ✅ Understanding of basic workflow

## 📋 Prerequisites

- **Node.js 18.0.0+** - [Download here](https://nodejs.org/)
- **A codebase** - Any TypeScript, JavaScript, or Python project
- **AI API key** - Or use VS Code integration (no key needed)

---

## 🚀 Step 1: Install ScribeVerse

Choose your preferred installation method:

### Global Installation (Recommended)
```bash
npm install -g scribeverse
```

### Project-Specific Installation
```bash
npm install --save-dev scribeverse
```

### Verify Installation
```bash
scribeverse --version
# Should output: 1.1.8
```

---

## ⚙️ Step 2: Initialize Your Project

Navigate to your project directory and initialize ScribeVerse:

```bash
cd your-project
scribeverse init
```

This creates a `scribeverse.config.json` file with intelligent defaults:

```json
{
  "sourceDir": "./src",
  "outputDir": "./docs",
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "${OPENAI_API_KEY}"
  },
  "include": ["**/*.{ts,js,py,sql}"],
  "exclude": ["node_modules/**", "dist/**"]
}
```

---

## 🔑 Step 3: Configure AI Provider

Choose one of these options:

### Option A: VS Code Integration (No API Key) ⭐ Recommended
If you have VS Code with AI extensions like GitHub Copilot:

```bash
scribeverse generate --use-vscode
```

### Option B: OpenAI (Most Popular)
1. Get your API key from [OpenAI](https://platform.openai.com/api-keys)
2. Set your environment variable:

```bash
# Windows
set OPENAI_API_KEY=sk-your-key-here

# macOS/Linux
export OPENAI_API_KEY=sk-your-key-here
```

### Option C: Anthropic Claude
1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Update your config:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "${ANTHROPIC_API_KEY}"
  }
}
```

3. Set environment variable:
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

## 📚 Step 4: Generate Documentation

Now generate your first documentation:

```bash
scribeverse generate
```

You'll see real-time progress:
```
🚀 ScribeVerse v1.1.8 - AI Documentation Generator

📊 Analyzing project structure...
✅ Found 12 TypeScript files
✅ Found 3 Python files

🤖 Generating documentation...
✅ README.md generated successfully
✅ docs/architecture.md generated successfully
✅ docs/api/user-service.md generated successfully
...

🎉 Documentation generation completed!
📁 Generated 8 files in ./docs
```

---

## 📖 Step 5: View Your Documentation

Open the generated files:

```bash
# View main documentation
cat README.md

# View generated docs folder
ls docs/
```

You should see:
```
docs/
├── 📄 overview.md              # Project overview
├── 📁 groups/                  # Module groups
│   ├── api-routes.md
│   ├── core-system.md
│   └── utilities.md
├── 📄 modules/                 # Individual modules
│   ├── user-service.md
│   └── auth-controller.md
├── 📊 diagrams/                # Visual diagrams
│   └── project-structure.png
└── 📋 cross-references.md      # Navigation index
```

---

## 🎨 Bonus: Visual Diagrams

Generate beautiful visual diagrams:

```bash
scribeverse generate --diagrams
```

This creates:
- 🏗️ Project structure diagrams
- 🔗 Dependency graphs
- 📊 Class relationships
- 🗄️ Database ER diagrams

---

## ✅ Verify Everything Works

Check that everything is working correctly:

```bash
# Validate your configuration
scribeverse validate

# Check AI provider connection
scribeverse validate --check-models

# Review usage statistics
scribeverse usage
```

---

## 🚀 Next Steps

Congratulations! 🎉 You've successfully set up ScribeVerse. Here's what to explore next:

### 📚 Learn More
- **[Configuration Guide](./configuration.md)** - Customize ScribeVerse for your needs
- **[Provider Setup](../guides/providers.md)** - Explore other AI providers
- **[Visual Diagrams](../guides/diagrams.md)** - Create stunning visual documentation

### ⚡ Power User Features
- **[VS Code Integration](../guides/vscode-integration.md)** - Use without API keys
- **[CI/CD Integration](../guides/cicd.md)** - Automate documentation
- **[Multi-Language](../guides/multi-language.md)** - Document multiple languages

### 🏢 Team & Enterprise
- **[Multi-Provider Setup](../guides/providers.md#multi-provider)** - Fallback systems
- **[Enterprise Features](../examples/enterprise.md)** - Large-scale deployments
- **[Monitoring](../guides/monitoring.md)** - Track usage and performance

---

## 🆘 Troubleshooting

### Common Issues

**❌ "No API key found"**
```bash
# Make sure your environment variable is set
echo $OPENAI_API_KEY  # Should show your key
```

**❌ "Provider validation failed"**
```bash
# Check your provider configuration
scribeverse validate --provider openai
```

**❌ "No files found to process"**
```bash
# Check your include patterns
scribeverse generate --verbose
```

### Get Help
- **[FAQ](../troubleshooting/faq.md)** - Frequently asked questions
- **[Common Issues](../troubleshooting/common-issues.md)** - Known problems and solutions
- **[GitHub Issues](https://github.com/jatin2507/scribeverse/issues)** - Report bugs

---

## 💡 Tips for Success

### 🎯 Best Practices
- **Start small** - Try with a few files first
- **Use VS Code integration** - No API keys needed
- **Enable diagrams** - Visual docs are more engaging
- **Set up watch mode** - `scribeverse generate --watch` for development

### 🚀 Pro Tips
- Use `--verbose` flag to see detailed progress
- Try multiple AI providers with fallback configuration
- Generate docs in CI/CD for always up-to-date documentation
- Use custom output directories for different documentation types

---

<div align="center">

**🎉 You're ready to create amazing documentation!**

[![View Examples](https://img.shields.io/badge/View%20Examples-Real%20Projects-blue?style=for-the-badge)](../examples/basic.md)
[![Advanced Features](https://img.shields.io/badge/Advanced%20Features-Power%20User-purple?style=for-the-badge)](../advanced/)

*Next: [Configuration Guide](./configuration.md) - Customize ScribeVerse for your workflow*

</div>