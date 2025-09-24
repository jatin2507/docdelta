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
    this.configPath = path.join(process.cwd(), '.docdelta.yml');
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
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      languages: [
        Language.JAVASCRIPT,
        Language.TYPESCRIPT,
        Language.PYTHON,
        Language.GO,
        Language.RUST,
      ],
      ai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
        maxTokens: parseInt(process.env.MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      },
      git: {
        enabled: process.env.ENABLE_GIT !== 'false',
        autoPush: process.env.AUTO_PUSH === 'true',
        remote: process.env.GIT_REMOTE || 'origin',
        branch: process.env.GIT_BRANCH || 'main',
        commitPrefix: process.env.COMMIT_PREFIX || 'docs:',
      },
      metadata: {
        dir: process.env.METADATA_DIR || '.metadata',
        cacheDir: process.env.CACHE_DIR || '.docdelta-cache',
        enableCache: process.env.ENABLE_CACHE !== 'false',
      },
    };

    if (fs.existsSync(this.configPath)) {
      try {
        const fileConfig = yaml.parse(fs.readFileSync(this.configPath, 'utf8'));
        return this.mergeConfigs(defaultConfig, fileConfig);
      } catch (error) {
        console.warn(`Failed to parse config file: ${error}`);
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
        ...defaultConfig.git!,
        ...fileConfig.git,
      },
      metadata: {
        ...defaultConfig.metadata!,
        ...fileConfig.metadata,
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
    fs.writeFileSync(this.configPath, yaml.stringify(this.config), 'utf8');
  }

  validateConfig(): string[] {
    const errors: string[] = [];

    if (!this.config.ai.apiKey) {
      errors.push('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    if (!fs.existsSync(this.config.sourceDir)) {
      errors.push(`Source directory does not exist: ${this.config.sourceDir}`);
    }

    return errors;
  }
}

export const config = ConfigManager.getInstance();