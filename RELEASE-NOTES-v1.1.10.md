# 🚀 ScribeVerse v1.1.10 Release Notes

**Release Date:** January 2025

## 🎯 Major Features

### ⚡ Automatic Dependency Management
- **Smart Provider Detection**: Automatically detects AI providers from configuration
- **On-Demand Installation**: Installs missing dependencies globally without user interaction
- **Cross-Platform Support**: Works seamlessly on Windows, macOS, and Linux
- **Zero Configuration**: No manual dependency installation required

### 🔧 Enhanced Provider System
- **Streamlined VS Code Integration**: Simplified VS Code Language Model API support
- **Updated Provider Dependencies**: Latest SDK versions for all AI providers
- **Optimized Bundle Size**: Conditional loading reduces package size significantly
- **Google Gemini Update**: Migrated to new `@google/genai` SDK

### 🛠️ Improved Configuration Management
- **Comprehensive Exclude Patterns**: All file exclusion patterns now use configuration
- **Better Python Support**: Fixed virtual environment exclusion issues
- **Dynamic Model Validation**: Latest model information from models.dev API
- **Provider Status Checking**: New command to check dependency status

## 🆕 New Commands

```bash
# Check provider dependencies status
scribeverse check-providers
scribeverse providers

# Enhanced generation with auto-install
scribeverse generate    # Auto-installs missing dependencies
scribeverse ai-generate # AI-optimized docs with auto-install
```

## 📦 Package Optimizations

### Dependency Structure
- **Peer Dependencies**: AI SDKs moved to peer dependencies for optional installation
- **Latest Versions**: Updated to latest compatible versions:
  - OpenAI SDK: `^5.23.0`
  - Anthropic SDK: `^0.63.1`
  - Google Gemini: `@google/genai@^0.3.1`
  - xAI SDK: `^2.0.22`
  - Ollama SDK: `^0.6.0`
  - Puppeteer: `^24.22.3`

### Size Reduction
- **Before v1.1.10**: ~450MB with all AI SDKs bundled
- **After v1.1.10**: ~85MB base + on-demand provider installation
- **Savings**: ~80% reduction in initial package size

## 🔄 Breaking Changes

### VS Code Integration
- Removed complex VS Code extension system
- Simplified to VS Code Language Model API only
- Configuration changes:
  ```json
  // Old (removed)
  "provider": "vscode-extension"

  // New
  "provider": "vscode-lm"
  ```

### GitHub Copilot
- Removed standalone GitHub Copilot provider
- Now accessed through VS Code LM API
- No separate configuration needed

## 🐛 Bug Fixes

### File Discovery
- Fixed hardcoded exclusion patterns in FlowAnalyzer
- All file discovery now respects configuration exclude patterns
- Python virtual environments properly excluded from documentation
- Resolved path normalization issues across platforms

### Configuration
- Fixed configuration validation for new provider structure
- Improved error handling for missing dependencies
- Better fallback mechanisms for provider failures

## 🚀 How to Upgrade

### From Previous Versions
1. Update ScribeVerse:
   ```bash
   npm install -g scribeverse@latest
   ```

2. Update configuration (if using VS Code):
   ```json
   {
     "ai": {
       "provider": "vscode-lm",  // Changed from "vscode-extension"
       "model": "auto"
     }
   }
   ```

3. Dependencies will auto-install on first use:
   ```bash
   scribeverse generate
   ```

### Clean Installation
```bash
# Remove old version (optional)
npm uninstall -g scribeverse

# Install latest
npm install -g scribeverse@1.1.10

# Generate docs (dependencies auto-install)
scribeverse generate
```

## 💡 Usage Examples

### Automatic Dependency Installation
```bash
# Configure OpenAI provider
echo '{"ai":{"provider":"openai","apiKey":"sk-..."}}' > scribeverse.config.json

# Run generation - OpenAI SDK installs automatically
scribeverse generate
```

### Multi-Provider Setup
```json
{
  "ai": {
    "providers": [
      {"provider": "openai", "apiKey": "sk-..."},
      {"provider": "anthropic", "apiKey": "sk-ant-..."}
    ],
    "primaryProvider": "openai",
    "fallbackProviders": ["anthropic"]
  }
}
```

### Provider Status Check
```bash
scribeverse check-providers
```

Output:
```
🔍 ScribeVerse Provider Status
═══════════════════════════════════════════════════

✅ openai: Ready
✅ anthropic: Ready
❌ google-gemini: Missing dependencies
   Required: @google/genai
```

## 🔧 Developer Notes

### New Utility Classes
- `DependencyManager`: Handles automatic dependency installation
- `ProviderDetector`: Detects required providers from configuration
- Enhanced cross-platform path handling

### API Changes
- `FlowAnalyzer` constructor now accepts configuration
- `ParserFactory.parseDirectory()` supports exclude patterns
- All file discovery methods use configuration patterns

## 🎯 Performance Improvements

- **Faster Installation**: Only installs needed dependencies
- **Reduced Memory Usage**: Smaller base package
- **Better Caching**: Improved dependency resolution
- **Optimized File Discovery**: Respects exclude patterns efficiently

## 🆘 Troubleshooting

### Common Issues

**Permission denied during dependency installation**
- Use Node Version Manager (nvm/fnm)
- Run with elevated privileges if needed

**Provider not detected**
- Check configuration file syntax
- Ensure AI provider is properly specified

**Dependencies not installing**
- Verify internet connection
- Check npm configuration

### Getting Help
- Check provider status: `scribeverse check-providers`
- Enable verbose logging: `scribeverse generate --verbose`
- Report issues: [GitHub Issues](https://github.com/jatin2507/scribeverse/issues)

---

## 📈 What's Next

### Planned for v1.1.11
- Enhanced error reporting
- Additional model validation features
- Improved documentation templates

### Future Releases
- Plugin system for custom providers
- Enhanced visual diagram generation
- Advanced configuration management