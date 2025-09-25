# 🤖 AI Providers Guide

<div align="center">

![AI Providers](https://img.shields.io/badge/AI%20Providers-8%20Supported-blue?style=for-the-badge)
![Models](https://img.shields.io/badge/Models-60+-green?style=for-the-badge)
![Fallback](https://img.shields.io/badge/Fallback-Bulletproof-orange?style=for-the-badge)

**Complete guide to configuring and using AI providers with ScribeVerse**

</div>

---

## 📋 Table of Contents

- [🎯 Quick Provider Comparison](#-quick-provider-comparison)
- [🔧 Setup Guides](#-setup-guides)
- [⚙️ Multi-Provider Configuration](#️-multi-provider-configuration)
- [📊 Model Recommendations](#-model-recommendations)
- [🛡️ Fallback Systems](#️-fallback-systems)
- [🆘 Troubleshooting](#-troubleshooting)

---

## 🎯 Quick Provider Comparison

| Provider | Best For | Cost | API Key | Setup Difficulty |
|----------|----------|------|---------|------------------|
| **VS Code LM API** | No API keys, instant setup | Free | ❌ | ⭐ Easy |
| **OpenAI** | Fast, reliable documentation | $$ | ✅ | ⭐⭐ Medium |
| **Google Gemini** | Free tier, good quality | $ | ✅ | ⭐⭐ Medium |
| **Anthropic Claude** | Large codebases, detailed analysis | $$$ | ✅ | ⭐⭐ Medium |
| **Ollama** | Local, privacy-focused | Free | ❌ | ⭐⭐⭐ Hard |
| **xAI Grok** | Real-time features | $$ | ✅ | ⭐⭐ Medium |
| **LiteLLM** | Multi-provider proxy | Variable | ✅ | ⭐⭐⭐ Hard |

---

## 🔧 Setup Guides

### 🔌 VS Code Language Model API (Recommended for Beginners)

**No API key required! Uses your existing VS Code AI extensions through the Language Model API.**

```bash
# Auto-detect VS Code LM capabilities
scribeverse generate --provider vscode-lm

# Or configure permanently
scribeverse init --provider vscode-lm
```

**Requirements:**
- VS Code with Language Model API support
- Compatible AI extension installed
- No additional API keys needed

**Configuration:**
```json
{
  "ai": {
    "provider": "vscode-lm",
    "model": "auto",
    "maxTokens": 4000
  }
}
```

### 🤖 OpenAI (Most Popular)

**Best for: General documentation, fast generation**

#### Setup Steps
1. **Get API Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Set Environment Variable**:
   ```bash
   # Windows
   set OPENAI_API_KEY=sk-your-key-here

   # macOS/Linux
   export OPENAI_API_KEY=sk-your-key-here
   ```
3. **Configure ScribeVerse**:
   ```json
   {
     "ai": {
       "provider": "openai",
       "model": "gpt-4o-mini",
       "apiKey": "${OPENAI_API_KEY}",
       "maxTokens": 4000
     }
   }
   ```

#### Recommended Models
- **gpt-4o-mini** - Fast, cost-effective, great for most projects
- **gpt-4o** - Higher quality, best for complex codebases
- **gpt-3.5-turbo** - Budget option, good for simple docs

#### Pricing (as of 2025)
- **GPT-4o Mini**: $0.15 per 1K input tokens, $0.60 per 1K output tokens
- **GPT-4o**: $3.00 per 1K input tokens, $15.00 per 1K output tokens

### 🧠 Anthropic Claude

**Best for: Large codebases, detailed analysis, complex reasoning**

#### Setup Steps
1. **Get API Key**: Visit [Anthropic Console](https://console.anthropic.com/)
2. **Set Environment Variable**:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. **Configure ScribeVerse**:
   ```json
   {
     "ai": {
       "provider": "anthropic",
       "model": "claude-3-5-sonnet-20241022",
       "apiKey": "${ANTHROPIC_API_KEY}",
       "maxTokens": 4000
     }
   }
   ```

#### Recommended Models
- **claude-3-5-sonnet-20241022** - Best balance of speed and quality
- **claude-3-opus-20240229** - Highest quality for complex analysis
- **claude-3-5-haiku-20241022** - Fastest, good for simple docs

### 🔍 Google Gemini

**Best for: Free tier usage, multimodal content**

#### Setup Steps
1. **Get API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Set Environment Variable**:
   ```bash
   export GOOGLE_GEMINI_API_KEY=your-key-here
   ```
3. **Configure ScribeVerse**:
   ```json
   {
     "ai": {
       "provider": "google-gemini",
       "model": "gemini-2.0-flash",
       "apiKey": "${GOOGLE_GEMINI_API_KEY}"
     }
   }
   ```

#### Recommended Models
- **gemini-2.0-flash** - Latest, fastest model
- **gemini-1.5-pro** - Higher quality for complex docs
- **gemini-1.5-flash** - Good balance of speed and cost

### 🧪 xAI Grok

**Best for: Advanced reasoning, real-time capabilities**

#### Setup Steps
1. **Get API Key**: Visit [x.ai/api](https://x.ai/api)
2. **Set Environment Variable**: `XAI_API_KEY=xai-...`
3. **Configure ScribeVerse**:
   ```json
   {
     "ai": {
       "provider": "xai-grok",
       "apiKey": "${XAI_API_KEY}",
       "model": "latest"
     }
   }
   ```

### 🏠 Ollama (Local/Offline)

**Best for: Privacy-focused, no internet required, cost-free**

#### Setup Steps
1. **Install Ollama**: Download from [ollama.com](https://ollama.com)
2. **Pull a Model**:
   ```bash
   ollama pull llama3.1:8b
   # or
   ollama pull codellama:7b
   ```
3. **Configure ScribeVerse**:
   ```json
   {
     "ai": {
       "provider": "ollama",
       "model": "llama3.1:8b",
       "baseURL": "http://localhost:11434"
     }
   }
   ```

#### Model Selection
- **Latest Llama models** - State-of-the-art open-source performance
- **Code-specialized models** - CodeLlama, DeepSeek Coder for software projects
- **Efficient variants** - Smaller models for resource-constrained environments

Run `ollama list` to see installed models or `npm run validate-models ollama` for recommendations.

### 🧪 xAI Grok

**Best for: Real-time search capabilities, reasoning tasks**

#### Setup Steps
1. **Get API Key**: Visit [x.AI Console](https://console.x.ai/)
2. **Set Environment Variable**:
   ```bash
   export XAI_API_KEY=your-key-here
   ```
3. **Configure ScribeVerse**:
   ```json
   {
     "ai": {
       "provider": "xai-grok",
       "model": "grok-3",
       "apiKey": "${XAI_API_KEY}"
     }
   }
   ```

### 🔄 LiteLLM (Multi-Provider Proxy)

**Best for: Advanced users, cost optimization, provider switching**

#### Setup Steps
1. **Install LiteLLM**:
   ```bash
   pip install litellm
   ```
2. **Start Proxy**:
   ```bash
   litellm --config litellm_config.yaml
   ```
3. **Configure ScribeVerse**:
   ```json
   {
     "ai": {
       "provider": "litellm",
       "baseURL": "http://localhost:4000",
       "model": "openai/gpt-4o-mini"
     }
   }
   ```

---

## ⚙️ Multi-Provider Configuration

**Set up multiple providers with automatic fallback:**

```json
{
  "ai": {
    "providers": [
      {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "apiKey": "${OPENAI_API_KEY}"
      },
      {
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "apiKey": "${ANTHROPIC_API_KEY}"
      },
      {
        "provider": "vscode-extension",
        "enabled": true
      }
    ],
    "primaryProvider": "openai",
    "fallbackProviders": ["anthropic", "vscode-extension"],
    "enableFallback": true,
    "maxRetries": 3
  }
}
```

### Fallback Strategy
1. **Primary Provider** - Your main AI provider
2. **Fallback Providers** - Used when primary fails
3. **VS Code Fallback** - Always works if extensions are available
4. **Static Analysis** - Final fallback using code parsing only

---

## 📊 Model Recommendations

### By Project Size

| Project Size | Recommended Provider | Model | Reasoning |
|--------------|---------------------|-------|-----------|
| **Small (< 50 files)** | OpenAI | gpt-4o-mini | Fast, cost-effective |
| **Medium (50-200 files)** | Anthropic | claude-3-5-sonnet | Better context handling |
| **Large (200+ files)** | Anthropic | claude-3-opus | Best for complex analysis |
| **Enterprise** | Multi-provider | gpt-4o + claude-3-5-sonnet | Reliability through fallbacks |

### By Documentation Type

| Documentation Type | Best Provider | Why |
|--------------------|---------------|-----|
| **API Documentation** | OpenAI | Excellent at structured output |
| **Architecture Docs** | Anthropic | Better at high-level reasoning |
| **Code Comments** | VS Code LM | IDE-integrated |
| **Database Docs** | Google Gemini | Good at structured data |
| **Tutorial Content** | Anthropic | Excellent explanations |

### By Budget

| Budget | Strategy | Configuration |
|--------|----------|---------------|
| **Free** | VS Code LM + Ollama | Use IDE integration + local models |
| **Low ($10/month)** | OpenAI latest mini | Cost-effective cloud option |
| **Medium ($50/month)** | OpenAI + Anthropic | Higher quality multi-provider |
| **High ($100+/month)** | Multi-provider setup | Best reliability and quality |

---

## 🛡️ Fallback Systems

ScribeVerse includes comprehensive fallback mechanisms:

### 1. AI Provider Fallback
```json
{
  "ai": {
    "primaryProvider": "openai",
    "fallbackProviders": ["anthropic", "google-gemini"],
    "enableFallback": true
  }
}
```

### 2. Model Fallback
If a model is unavailable, ScribeVerse automatically tries:
- Alternative models from the same provider
- Different providers
- Simpler models with lower requirements

### 3. Static Analysis Fallback
When all AI providers fail:
- Generates documentation using code parsing
- Creates basic project structure
- Provides file listings and statistics

### 4. Emergency Fallback
As a last resort:
- Creates minimal README with project info
- Lists discovered files
- Provides troubleshooting steps

---

## 🆘 Troubleshooting

### Common Issues

#### ❌ "API key not found"
```bash
# Check environment variables
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Set the key properly
export OPENAI_API_KEY=sk-your-key-here
```

#### ❌ "Provider validation failed"
```bash
# Test provider configuration
scribeverse validate --provider openai

# Check model availability
scribeverse validate --model gpt-4o-mini --provider openai
```

#### ❌ "Rate limit exceeded"
```bash
# Use a different model or provider
scribeverse generate --provider anthropic

# Or configure delays
{
  "ai": {
    "rateLimitDelay": 1000,
    "maxRetries": 5
  }
}
```

#### ❌ "Context length exceeded"
```bash
# Use a model with larger context
scribeverse generate --model claude-3-5-sonnet-20241022

# Or enable chunking
scribeverse generate --chunk-size 2000
```

### Provider-Specific Issues

#### OpenAI
- **Billing Issues**: Check your OpenAI account balance
- **Model Access**: Some models require tier upgrades
- **Rate Limits**: Consider paid tier for higher limits

#### Anthropic
- **Beta Access**: Some models may require beta access
- **Regional Availability**: Check if Claude is available in your region
- **Usage Limits**: Monitor your monthly usage

#### Google Gemini
- **Quota Exceeded**: Free tier has daily limits
- **Regional Restrictions**: Some regions have limited access
- **Model Availability**: Check model status in AI Studio

#### VS Code Extensions
- **Extension Not Found**: Install supported AI extensions
- **Permission Denied**: Check VS Code extension permissions
- **Model Unavailable**: Ensure extensions are properly authenticated

---

## 💡 Best Practices

### 🎯 Provider Selection
1. **Start with VS Code** if you have AI extensions
2. **Use OpenAI gpt-4o-mini** for cost-effective quality
3. **Choose Anthropic Claude** for large or complex codebases
4. **Set up fallbacks** for production use

### ⚡ Performance Optimization
1. **Use appropriate models** for your project size
2. **Enable chunking** for large codebases
3. **Configure timeouts** to avoid hanging
4. **Monitor token usage** to control costs

### 🔐 Security
1. **Use environment variables** for API keys
2. **Never commit API keys** to repositories
3. **Consider local models** for sensitive projects
4. **Use IAM roles** in cloud environments

### 💰 Cost Management
1. **Start with free options** (VS Code, Ollama)
2. **Use mini/small models** for testing
3. **Set up usage monitoring** and alerts
4. **Consider batch processing** for large projects

---

<div align="center">

**🎉 Ready to configure your AI provider?**

[![VS Code Setup](https://img.shields.io/badge/VS%20Code%20Setup-No%20API%20Key-green?style=for-the-badge)](../guides/vscode-integration.md)
[![OpenAI Setup](https://img.shields.io/badge/OpenAI%20Setup-Most%20Popular-blue?style=for-the-badge)](#-openai-most-popular)

*Next: [Visual Diagrams Guide](./diagrams.md) - Generate beautiful visual documentation*

</div>