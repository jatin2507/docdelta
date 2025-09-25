# 🔍 Dynamic Model Discovery

Learn how to discover and validate AI models in real-time using ScribeVerse's dynamic model listing feature.

---

## 🎯 What You'll Learn

- How to list available AI providers and their models
- Understanding model capabilities and limitations
- Real-time model availability checking
- Choosing the right model for your use case

---

## 📋 Overview

ScribeVerse v1.1.11 introduces dynamic model discovery that allows you to see real-time availability of AI models from all supported providers. This feature replaces static model lists with live queries to ensure you always have access to the latest models.

### ✨ Key Features

- **🔍 Real-time Discovery** - Query providers directly for current models
- **🤖 Multi-Provider Support** - Works with all 7 supported AI providers
- **📊 Model Capabilities** - See model specifications and limits
- **✅ Live Validation** - Verify models are actually available
- **🔄 Dynamic Updates** - Always shows the latest available models

---

## 🚀 Quick Start

### List All Providers

See all supported AI providers and their status:

```bash
scribeverse list
```

**Example Output:**
```
🔍 ScribeVerse AI Providers
═══════════════════════════════════════════════════════════════

✅ OpenAI
   Status: Available
   Models: 15+ models available
   Setup: Set OPENAI_API_KEY environment variable

✅ Anthropic Claude
   Status: Available
   Models: 8+ models available
   Setup: Set ANTHROPIC_API_KEY environment variable

⚠️  Google Gemini
   Status: Compatibility Mode
   Models: 5+ models available
   Setup: Set GOOGLE_AI_API_KEY environment variable
   Note: API migration in progress

✅ VS Code Language Model
   Status: Available in VS Code
   Models: Auto-detected from extensions
   Setup: No API key required

📋 Available Commands:
  scribeverse list --model <provider>  - List models for provider
  scribeverse generate                 - Auto-install and generate docs
  scribeverse ai-flow                  - AI-optimized documentation
```

### List Models for Specific Provider

Get real-time model availability for any provider:

```bash
# List OpenAI models
scribeverse list --model openai

# List Anthropic models
scribeverse list --model anthropic

# List Google Gemini models
scribeverse list --model google-gemini

# List Ollama models (if running locally)
scribeverse list --model ollama
```

---

## 🤖 Provider-Specific Model Discovery

### OpenAI Models

```bash
scribeverse list --model openai
```

**Example Output:**
```
🤖 Available Models for openai:
═══════════════════════════════════════════════════════════════

• gpt-4o
• gpt-4o-mini
• gpt-4-turbo
• gpt-4
• gpt-3.5-turbo
• gpt-3.5-turbo-16k
• text-embedding-ada-002
• text-embedding-3-small
• text-embedding-3-large

💡 Use: scribeverse generate --model gpt-4o-mini
```

### Anthropic Claude Models

```bash
scribeverse list --model anthropic
```

**Example Output:**
```
🤖 Available Models for anthropic:
═══════════════════════════════════════════════════════════════

• claude-3-5-sonnet-20241022
• claude-3-5-haiku-20241022
• claude-3-opus-20240229
• claude-3-sonnet-20240229
• claude-3-haiku-20240307

💡 Use: scribeverse generate --model claude-3-5-sonnet-20241022
```

### Google Gemini Models

```bash
scribeverse list --model google-gemini
```

**Example Output:**
```
🤖 Available Models for google-gemini:
═══════════════════════════════════════════════════════════════

• gemini-2.0-flash-exp
• gemini-2.0-flash
• gemini-1.5-pro
• gemini-1.5-flash
• gemini-1.5-flash-8b
• gemini-1.0-pro

💡 Use: scribeverse generate --model gemini-2.0-flash
```

**Note:** Google Gemini is currently in compatibility mode due to API changes. Alternative providers are recommended for production use.

### VS Code Language Model

```bash
scribeverse list --model vscode-lm
```

**Example Output:**
```
🤖 Available Models for vscode-lm:
═══════════════════════════════════════════════════════════════

• vscode-default

💡 Use: scribeverse generate --model vscode-default
```

**Note:** VS Code Language Model API auto-detects available models from installed extensions like GitHub Copilot, Continue, Claude, etc.

### Ollama Local Models

```bash
scribeverse list --model ollama
```

**Example Output (if Ollama is running):**
```
🤖 Available Models for ollama:
═══════════════════════════════════════════════════════════════

• llama3.2:latest
• codellama:13b
• mistral:7b
• qwen2.5:7b

💡 Use: scribeverse generate --model llama3.2:latest
```

**Example Output (if Ollama is not running):**
```
❌ Provider 'ollama' not available or not configured.

Available providers: openai, anthropic, google-gemini, vscode-lm, litellm, xai-grok

To use Ollama:
1. Install Ollama from https://ollama.ai
2. Start the service: ollama serve
3. Pull a model: ollama pull llama3.2
```

---

## 🔧 Advanced Usage

### Error Handling

When a provider is not available or configured:

```bash
$ scribeverse list --model invalid-provider

❌ Provider 'invalid-provider' not available or not configured.

Available providers: openai, anthropic, google-gemini, ollama, vscode-lm, litellm, xai-grok
```

### Integration with Generate Command

Use discovered models directly:

```bash
# Discover available models
scribeverse list --model openai

# Use a specific model from the list
scribeverse generate --model gpt-4o-mini --provider openai

# Or let ScribeVerse choose the best model
scribeverse generate --provider openai
```

### Scripting and Automation

Use model discovery in scripts:

```bash
#!/bin/bash

# Get available OpenAI models
models=$(scribeverse list --model openai --format json)

# Use in CI/CD or automation scripts
if [[ $models == *"gpt-4o-mini"* ]]; then
    echo "Using GPT-4o Mini for documentation"
    scribeverse generate --model gpt-4o-mini
else
    echo "Falling back to default model"
    scribeverse generate --provider openai
fi
```

---

## 📊 Model Selection Guide

### Choosing the Right Model

Based on the dynamic model discovery, here's how to choose:

#### **For Speed and Cost Efficiency**
```bash
# Best options discovered
scribeverse list --model openai     # Look for: gpt-4o-mini
scribeverse list --model anthropic  # Look for: claude-3-5-haiku
scribeverse list --model google-gemini # Look for: gemini-1.5-flash
```

#### **For Quality and Detail**
```bash
# Premium options discovered
scribeverse list --model openai     # Look for: gpt-4o, gpt-4-turbo
scribeverse list --model anthropic  # Look for: claude-3-5-sonnet, claude-3-opus
scribeverse list --model google-gemini # Look for: gemini-1.5-pro
```

#### **For Privacy and Local Use**
```bash
# Local options
scribeverse list --model ollama     # Any available local models
scribeverse list --model vscode-lm  # VS Code extensions
```

### Model Capability Matrix

| Provider | Speed | Quality | Context | Cost | Privacy |
|----------|-------|---------|---------|------|---------|
| OpenAI gpt-4o-mini | ⚡⚡⚡ | ⭐⭐⭐ | 128K | 💰 | ❌ |
| Anthropic Claude Haiku | ⚡⚡ | ⭐⭐⭐ | 200K | 💰💰 | ❌ |
| Google Gemini Flash | ⚡⚡⚡ | ⭐⭐ | 1M | Free* | ❌ |
| Ollama Local | ⚡ | ⭐⭐ | Variable | Free | ✅ |
| VS Code LM | ⚡⚡ | ⭐⭐ | Variable | Free* | ⭐ |

*Limited free usage or requires subscription

---

## 🔄 Real-time Validation

### Model Availability Changes

Models can become available or unavailable over time. Dynamic discovery helps you stay current:

**New Model Available:**
```bash
$ scribeverse list --model openai

🤖 Available Models for openai:
• gpt-4o-2024-11-20  # ← New model!
• gpt-4o-mini
• gpt-4-turbo
...
```

**Model Deprecated:**
```bash
$ scribeverse list --model openai

🤖 Available Models for openai:
• gpt-4o-mini
• gpt-4-turbo
# gpt-3.5-turbo no longer listed
```

**Provider Status Changes:**
```bash
$ scribeverse list --model google-gemini

⚠️ Google Gemini provider temporarily unavailable
🔄 Using compatibility mode
✅ Basic functionality available
```

---

## 🛠️ Configuration Integration

### Using Discovery with Configuration

Update your `scribeverse.config.json` based on discoveries:

```json
{
  "ai": {
    "provider": "openai",
    "model": "gpt-4o-mini",  // ← From discovery
    "fallbackProviders": ["anthropic", "vscode-lm"]
  }
}
```

### Dynamic Model Selection

Let ScribeVerse choose automatically:

```json
{
  "ai": {
    "provider": "openai",
    "model": "auto",  // ← Auto-select best available
    "preferences": {
      "prioritize": "cost",  // or "quality", "speed"
      "maxTokens": 4000,
      "excludeModels": ["gpt-4o"]  // Skip expensive models
    }
  }
}
```

---

## 🔍 API Reference

### Command Syntax

```bash
scribeverse list [options]

Options:
  -m, --model <provider>    List models for specific provider
  --format <format>         Output format: table (default), json, yaml
  --verbose                 Show detailed model information
  --check                   Validate model availability
```

### Supported Providers

- `openai` - OpenAI GPT models
- `anthropic` - Anthropic Claude models
- `google-gemini` - Google Gemini models
- `vscode-lm` - VS Code Language Model API
- `ollama` - Local Ollama models
- `litellm` - LiteLLM proxy models
- `xai-grok` - xAI Grok models

### Exit Codes

- `0` - Success
- `1` - Provider not found or not configured
- `2` - Network error or API unavailable
- `3` - Configuration error

---

## 🚀 Examples and Use Cases

### Example 1: Daily Model Check

```bash
#!/bin/bash
# daily-model-check.sh

echo "🔍 Checking available AI models..."

providers=("openai" "anthropic" "google-gemini" "ollama")

for provider in "${providers[@]}"; do
    echo "Checking $provider..."
    scribeverse list --model "$provider" --format json > "models-$provider.json"
done

echo "✅ Model discovery complete!"
```

### Example 2: Smart Model Selection

```bash
#!/bin/bash
# smart-generate.sh

# Try premium models first, fallback to cost-effective options
if scribeverse list --model anthropic | grep -q "claude-3-5-sonnet"; then
    echo "Using Claude 3.5 Sonnet for high-quality documentation"
    scribeverse generate --model claude-3-5-sonnet-20241022
elif scribeverse list --model openai | grep -q "gpt-4o-mini"; then
    echo "Using GPT-4o Mini for cost-effective documentation"
    scribeverse generate --model gpt-4o-mini
else
    echo "Using VS Code Language Model as fallback"
    scribeverse generate --provider vscode-lm
fi
```

### Example 3: Model Monitoring

```bash
#!/bin/bash
# model-monitor.sh

# Check if preferred model is available
preferred_model="gpt-4o-mini"

if scribeverse list --model openai | grep -q "$preferred_model"; then
    echo "✅ Preferred model $preferred_model is available"
    scribeverse generate --model "$preferred_model"
else
    echo "⚠️ Preferred model $preferred_model not available"
    echo "Available models:"
    scribeverse list --model openai

    # Use fallback
    scribeverse generate --provider anthropic
fi
```

---

## 🛠️ Troubleshooting

### Common Issues

**Issue**: "Provider not available" error
```bash
❌ Provider 'openai' not available or not configured.
```
**Solution**: Check API key configuration and network connectivity

**Issue**: Empty model list
```bash
🤖 Available Models for provider: (none)
```
**Solution**: Verify API key permissions and provider service status

**Issue**: VS Code models not detected
```bash
🤖 Available Models for vscode-lm:
• vscode-default
```
**Solution**: Install VS Code AI extensions (GitHub Copilot, Continue, etc.)

**Issue**: Ollama models not listed
```bash
❌ Provider 'ollama' not available
```
**Solution**: Start Ollama service (`ollama serve`) and pull models

### Debug Commands

```bash
# Verbose output for debugging
scribeverse list --model openai --verbose

# Check all providers at once
scribeverse list --check

# Test specific model
scribeverse generate --model gpt-4o-mini --dry-run
```

---

## 📚 Related Documentation

- **[Provider Configuration](../guides/providers.md)** - Set up AI providers
- **[CLI Reference](./cli.md)** - Complete command documentation
- **[Configuration Guide](../getting-started/configuration.md)** - Configure ScribeVerse
- **[Troubleshooting](../troubleshooting/provider-issues.md)** - Solve provider problems

---

**🔍 Stay Current!** Use dynamic model discovery to always have access to the latest AI models and ensure your documentation generation uses the best available technology.