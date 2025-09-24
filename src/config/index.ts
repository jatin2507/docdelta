import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import { config as dotenvConfig } from 'dotenv';
import { DocDeltaConfig, Language } from '../types';

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
      return docsDir;
    }

    // Check if there's a docs directory specified in environment
    if (process.env.DOCDELTA_OUTPUT_DIR) {
      const envOutputDir = path.resolve(cwd, process.env.DOCDELTA_OUTPUT_DIR);
      console.log(`Using output directory from environment: ${envOutputDir}`);
      return envOutputDir;
    }

    // Default to creating docs in current directory
    console.log(`Will create docs directory at: ${docsDir}`);
    return docsDir;
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): DocDeltaConfig {
    const defaultConfig: DocDeltaConfig = {
      sourceDir: process.cwd(),
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
  }

  saveConfig(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }

  validateConfig(): string[] {
    const errors: string[] = [];

    if (!this.config.ai.apiKey) {
      const provider = this.config.ai.provider || 'openai';
      switch (provider.toLowerCase()) {
        case 'openai':
          errors.push('OpenAI API key is required. Set OPENAI_API_KEY environment variable or add it to your config file.');
          break;
        case 'anthropic':
          errors.push('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or add it to your config file.');
          break;
        case 'google-gemini':
          errors.push('Google Gemini API key is required. Set GOOGLE_AI_API_KEY environment variable or add it to your config file.');
          break;
        case 'github-copilot':
          errors.push('GitHub token is required. Set GITHUB_TOKEN environment variable or add it to your config file.');
          break;
        case 'grok':
          errors.push('xAI API key is required. Set XAI_API_KEY environment variable or add it to your config file.');
          break;
        case 'ollama':
          // Ollama usually doesn't require API key for local usage
          break;
        default:
          errors.push(`AI API key is required for provider: ${provider}. Please add it to your config file.`);
      }
    }

    if (!fs.existsSync(this.config.sourceDir)) {
      errors.push(`Source directory does not exist: ${this.config.sourceDir}`);
    }

    return errors;
  }
}

export const config = ConfigManager.getInstance();