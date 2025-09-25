import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import { config as dotenvConfig } from 'dotenv';
import { DocDeltaConfig, Language } from '../types';
import { ModelValidator, EXAMPLE_CONFIGS, MODEL_VALIDATION_ERRORS } from '../core/ai/model-registry';

dotenvConfig();

export class ConfigManager {
  private static instance: ConfigManager;
  private config: DocDeltaConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'scribeverse.config.json');
    this.config = this.loadConfig();
  }

  private determineOutputDir(): string {
    const cwd = process.cwd();
    const docsDir = path.join(cwd, 'docs');

    // Check if docs directory already exists
    if (fs.existsSync(docsDir)) {
      console.log('Found existing docs directory, using it for output');
      return this.normalizePath(docsDir);
    }

    // Check if there's a docs directory specified in environment
    if (process.env.DOCDELTA_OUTPUT_DIR) {
      const envOutputDir = path.resolve(cwd, process.env.DOCDELTA_OUTPUT_DIR);
      console.log(`Using output directory from environment: ${envOutputDir}`);
      return this.normalizePath(envOutputDir);
    }

    // Default to creating docs in current directory
    console.log(`Will create docs directory at: ${docsDir}`);
    return this.normalizePath(docsDir);
  }

  private normalizePath(filePath: string): string {
    // Convert backslashes to forward slashes for cross-platform compatibility
    // and consistency in config files
    return filePath.replace(/\\/g, '/');
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): DocDeltaConfig {
    const defaultConfig: DocDeltaConfig = {
      sourceDir: this.normalizePath(process.cwd()),
      outputDir: this.determineOutputDir(),
      include: ['**/*.{js,ts,jsx,tsx,py,go,rs,java,cpp,sql}'],
      exclude: [
        // Node.js
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.nyc_output/**',

        // Python
        '**/venv/**',
        '**/env/**',
        '**/__pycache__/**',
        '**/.pytest_cache/**',
        '**/site-packages/**',
        '**/.venv/**',
        '**/virtualenv/**',
        '**/*.pyc',
        '**/*.pyo',
        '**/*.pyd',
        '**/.Python',

        // Version Control
        '**/.git/**',
        '**/.svn/**',
        '**/.hg/**',
        '**/.bzr/**',

        // IDEs and Editors
        '**/.vscode/**',
        '**/.idea/**',
        '**/.vs/**',
        '**/*.swp',
        '**/*.swo',
        '**/*~',

        // OS Generated
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/desktop.ini',

        // Cache and temporary files
        '**/.cache/**',
        '**/tmp/**',
        '**/temp/**',
        '**/.tmp/**',
        '**/.sass-cache/**',

        // Dependencies and packages
        '**/vendor/**',
        '**/packages/**',
        '**/libs/**',
        '**/third_party/**',

        // Language specific
        // Java
        '**/target/**',
        '**/*.class',
        '**/*.jar',

        // C#
        '**/bin/**',
        '**/obj/**',

        // Rust
        '**/target/**',

        // Go
        '**/vendor/**',

        // Ruby
        '**/gems/**',

        // PHP
        '**/vendor/**',

        // Logs and databases
        '**/*.log',
        '**/*.sqlite',
        '**/*.db',

        // Configuration and secrets
        '**/.env',
        '**/.env.local',
        '**/.env.*.local',
        '**/config/secrets.yml',
        '**/config/database.yml',
      ],
      languages: [
        Language.JAVASCRIPT,
        Language.TYPESCRIPT,
        Language.PYTHON,
        Language.GO,
        Language.RUST,
      ],
      ai: {
        provider: process.env.AI_PROVIDER || 'openai',
        apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_AI_API_KEY || '',
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        maxTokens: parseInt(process.env.MAX_TOKENS || '4000', 10),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.2'),
        useVSCodeExtensions: process.env.USE_VSCODE_EXTENSIONS === 'true',
        preferVSCodeExtensions: process.env.PREFER_VSCODE_EXTENSIONS === 'true',
        vscodeExtensions: [],
      },
      git: {
        enabled: process.env.ENABLE_GIT !== 'false',
        autoPush: process.env.AUTO_PUSH === 'true',
        remote: process.env.GIT_REMOTE || 'origin',
        branch: process.env.GIT_BRANCH || 'auto',
        commitPrefix: process.env.COMMIT_PREFIX || 'auto',
      },
      metadata: {
        dir: process.env.METADATA_DIR || '.metadata',
        cacheDir: process.env.CACHE_DIR || '.scribeverse-cache',
        enableCache: process.env.ENABLE_CACHE !== 'false',
      },
    };

    if (fs.existsSync(this.configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return this.mergeConfigs(defaultConfig, fileConfig);
      } catch (error) {
        console.warn(`Failed to parse config file: ${error}`);
      }
    }

    // Also check for legacy YAML config and migrate it
    const legacyConfigPath = path.join(process.cwd(), '.scribeverse.yml');
    if (fs.existsSync(legacyConfigPath)) {
      try {
        const fileConfig = yaml.parse(fs.readFileSync(legacyConfigPath, 'utf8'));
        console.log('Migrating legacy YAML config to JSON...');
        const mergedConfig = this.mergeConfigs(defaultConfig, fileConfig);
        // Save as JSON and remove YAML
        fs.writeFileSync(this.configPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
        fs.unlinkSync(legacyConfigPath);
        return mergedConfig;
      } catch (error) {
        console.warn(`Failed to migrate legacy config file: ${error}`);
      }
    }

    return defaultConfig;
  }

  private mergeConfigs(
    defaultConfig: DocDeltaConfig,
    fileConfig: Partial<DocDeltaConfig>
  ): DocDeltaConfig {
    return {
      ...defaultConfig,
      ...fileConfig,
      ai: {
        ...defaultConfig.ai,
        ...fileConfig.ai,
      },
      git: {
        enabled: defaultConfig.git?.enabled ?? true,
        autoPush: fileConfig.git?.autoPush ?? defaultConfig.git?.autoPush,
        remote: fileConfig.git?.remote ?? defaultConfig.git?.remote,
        branch: fileConfig.git?.branch ?? defaultConfig.git?.branch,
        commitPrefix: fileConfig.git?.commitPrefix ?? defaultConfig.git?.commitPrefix,
      },
      metadata: {
        dir: fileConfig.metadata?.dir ?? defaultConfig.metadata?.dir ?? '.metadata',
        cacheDir: fileConfig.metadata?.cacheDir ?? defaultConfig.metadata?.cacheDir,
        enableCache: fileConfig.metadata?.enableCache ?? defaultConfig.metadata?.enableCache,
      },
    };
  }

  getConfig(): DocDeltaConfig {
    return this.config;
  }

  updateConfig(updates: Partial<DocDeltaConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
    // Normalize paths after updates
    if (this.config.sourceDir) {
      this.config.sourceDir = this.normalizePath(this.config.sourceDir);
    }
    if (this.config.outputDir) {
      this.config.outputDir = this.normalizePath(this.config.outputDir);
    }
  }

  saveConfig(): void {
    // Ensure paths are normalized before saving
    const normalizedConfig = {
      ...this.config,
      sourceDir: this.normalizePath(this.config.sourceDir),
      outputDir: this.normalizePath(this.config.outputDir)
    };
    fs.writeFileSync(this.configPath, JSON.stringify(normalizedConfig, null, 2), 'utf8');
  }

  validateConfig(): string[] {
    const errors: string[] = [];

    // Validate AI provider and model
    const provider = this.config.ai.provider || 'openai';
    const model = this.config.ai.model || 'gpt-4o-mini';

    // Validate model exists and matches provider
    if (!ModelValidator.isValidModel(model, provider)) {
      if (!ModelValidator.getModelInfo(model)) {
        errors.push(`${MODEL_VALIDATION_ERRORS.INVALID_MODEL} Model ID: '${model}'`);
        const suggestions = ModelValidator.getModelsForProvider(provider).slice(0, 3).map(m => m.id);
        if (suggestions.length > 0) {
          errors.push(`Suggested models for ${provider}: ${suggestions.join(', ')}`);
        }
      } else {
        errors.push(`${MODEL_VALIDATION_ERRORS.PROVIDER_MISMATCH} Model '${model}' does not belong to provider '${provider}'`);
      }
    }

    // Check if model is deprecated
    if (ModelValidator.isModelDeprecated(model)) {
      errors.push(`${MODEL_VALIDATION_ERRORS.DEPRECATED_MODEL} Model: '${model}'`);
      const similar = ModelValidator.findSimilarModels(model);
      if (similar.length > 0) {
        errors.push(`Consider using: ${similar[0].id} instead`);
      }
    }

    // Validate API key based on provider
    if (!this.config.ai.apiKey) {
      switch (provider.toLowerCase()) {
        case 'openai':
          errors.push('OpenAI API key is required. Set OPENAI_API_KEY environment variable or add it to your config file.');
          errors.push(`Example config: ${JSON.stringify(EXAMPLE_CONFIGS.openai, null, 2)}`);
          break;
        case 'anthropic':
          errors.push('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or add it to your config file.');
          errors.push(`Example config: ${JSON.stringify(EXAMPLE_CONFIGS.anthropic, null, 2)}`);
          break;
        case 'google-gemini':
          errors.push('Google Gemini API key is required. Set GOOGLE_AI_API_KEY environment variable or add it to your config file.');
          errors.push(`Example config: ${JSON.stringify(EXAMPLE_CONFIGS.google, null, 2)}`);
          break;
        case 'github-copilot':
          errors.push('GitHub token is required. Set GITHUB_TOKEN environment variable or add it to your config file.');
          break;
        case 'grok':
          errors.push('xAI API key is required. Set XAI_API_KEY environment variable or add it to your config file.');
          errors.push(`Example config: ${JSON.stringify(EXAMPLE_CONFIGS.grok, null, 2)}`);
          break;
        case 'ollama':
          // Ollama usually doesn't require API key for local usage
          if (!this.config.ai.baseURL) {
            errors.push('Ollama base URL is recommended. Set it to http://localhost:11434 or your Ollama server URL.');
            errors.push(`Example config: ${JSON.stringify(EXAMPLE_CONFIGS.ollama, null, 2)}`);
          }
          break;
        case 'vscode-extension':
          // VS Code extension provider doesn't require API key but needs VS Code
          try {
            // This will be checked asynchronously during provider creation
            require('../core/ai/providers/vscode-extension');
          } catch {
            errors.push('VS Code extension provider requires VS Code to be installed and accessible.');
          }
          break;
        case 'vscode-lm':
          // VSCode Language Model doesn't require an API key
          // It uses the built-in VS Code Language Model API when running within VS Code
          break;
        default:
          errors.push(`AI API key is required for provider: ${provider}. Please add it to your config file.`);
      }
    }

    // Validate model capabilities for documentation tasks
    const requiredCapabilities = ['text', 'code'];
    if (!ModelValidator.validateModelForTask(model, requiredCapabilities)) {
      errors.push(`${MODEL_VALIDATION_ERRORS.INSUFFICIENT_CAPABILITIES} Model '${model}' may not be suitable for documentation generation.`);
      const suitableModels = ModelValidator.getModelsByCapability('code').slice(0, 3);
      errors.push(`Code-specialized models: ${suitableModels.map(m => m.id).join(', ')}`);
    }

    if (!fs.existsSync(this.config.sourceDir)) {
      errors.push(`Source directory does not exist: ${this.config.sourceDir}`);
    }

    return errors;
  }
}

export const config = ConfigManager.getInstance();