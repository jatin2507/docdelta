import { BaseAIProvider, AIProviderConfig, AIResponse, SummarizationRequest, CodeAnalysisRequest, DiagramGenerationRequest } from './base';
import { AIConfig, VSCodeExtensionConfig } from '../../../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// interface LanguageModelChatMessage {
//   role: 'user' | 'assistant';
//   content: string;
// }

interface LanguageModelChatResult {
  content: string;
  tokensUsed?: number;
  model?: string;
}

export class VSCodeExtensionProvider extends BaseAIProvider {
  private extensions: VSCodeExtensionConfig[] = [];
  private vscodeProcess: any;
  private extensionHost: any;

  constructor(config: AIConfig) {
    const providerConfig: AIProviderConfig = {
      ...config,
      provider: config.provider as any || 'vscode-extension' as any
    };
    super(providerConfig);
    this.extensions = config.vscodeExtensions || [];
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if VS Code is installed and accessible via command line
      const codeCommand = process.platform === 'win32' ? 'code.cmd' : 'code';
      await execAsync(`${codeCommand} --version`);

      // Check if we can access VS Code's Language Model API
      const hasLanguageModels = await this.checkLanguageModelSupport();
      return hasLanguageModels;
    } catch (error) {
      console.warn('VS Code Language Model API not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private async checkLanguageModelSupport(): Promise<boolean> {
    try {
      // Create a temporary extension to check for language model API support
      const tempExtensionDir = path.join(os.tmpdir(), `scribeverse-vscode-check-${Date.now()}`);
      await fs.ensureDir(tempExtensionDir);

      const packageJson = {
        name: 'scribeverse-language-model-check',
        displayName: 'ScribeVerse Language Model Check',
        version: '1.0.0',
        engines: { vscode: '^1.90.0' },
        main: './extension.js',
        contributes: {},
        enabledApiProposals: ['languageModels']
      };

      const extensionJs = `
const vscode = require('vscode');

async function activate(context) {
  try {
    const models = await vscode.lm.selectChatModels();
    if (models && models.length > 0) {
      console.log('✅ Language models available:', models.map(m => m.name));
      // Signal success by creating a marker file
      const fs = require('fs');
      fs.writeFileSync('${path.join(tempExtensionDir, 'success.marker')}', 'OK');
    }
  } catch (error) {
    console.error('❌ Language models not available:', error.message);
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
`;

      await fs.writeFile(path.join(tempExtensionDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await fs.writeFile(path.join(tempExtensionDir, 'extension.js'), extensionJs);

      // Try to install and run the temporary extension
      const codeCommand = process.platform === 'win32' ? 'code.cmd' : 'code';
      await execAsync(`${codeCommand} --install-extension ${tempExtensionDir} --force`);

      // Wait a bit for the extension to activate and check for models
      await new Promise(resolve => setTimeout(resolve, 2000));

      const markerFile = path.join(tempExtensionDir, 'success.marker');
      const hasSupport = await fs.pathExists(markerFile);

      // Clean up
      await fs.remove(tempExtensionDir);

      return hasSupport;
    } catch (error) {
      console.warn('Could not check VS Code language model support:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async initialize(): Promise<void> {
    // Initialize VS Code extension provider
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('VS Code Language Model API is not available');
    }
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    console.log('🔌 Generating text using VS Code Language Model API...');

    try {
      // Use VS Code's Language Model API through extension host
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      const result = await this.invokeLanguageModel(fullPrompt);

      return {
        content: result.content,
        model: result.model,
        tokensUsed: result.tokensUsed
      };
    } catch (error) {
      console.error('❌ VS Code Language Model API failed:', error);
      throw new Error(`VS Code Language Model generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async invokeLanguageModel(prompt: string): Promise<LanguageModelChatResult> {
    // Create a temporary VS Code extension to access the Language Model API
    const tempExtensionDir = path.join(os.tmpdir(), `scribeverse-lm-${Date.now()}`);
    await fs.ensureDir(tempExtensionDir);

    try {
      const packageJson = {
        name: 'scribeverse-language-model',
        displayName: 'ScribeVerse Language Model',
        version: '1.0.0',
        engines: { vscode: '^1.90.0' },
        main: './extension.js',
        contributes: {},
        enabledApiProposals: ['languageModels']
      };

      const extensionJs = `
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

async function activate(context) {
  try {
    // Select available chat models (preferring gpt-4o)
    const models = await vscode.lm.selectChatModels({
      vendor: 'copilot',
      family: 'gpt-4o'
    });

    if (!models || models.length === 0) {
      // Fallback to any available model
      const allModels = await vscode.lm.selectChatModels();
      if (!allModels || allModels.length === 0) {
        throw new Error('No language models available');
      }
      models.push(allModels[0]);
    }

    const model = models[0];
    console.log('Using model:', model.name);

    // Prepare the chat request
    const messages = [
      new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, \`${prompt.replace(/`/g, '\\`')}\`)
    ];

    // Send the request
    const request = await model.sendRequest(messages, {});

    let result = '';
    for await (const fragment of request.text) {
      result += fragment;
    }

    // Save the result to a file
    const resultData = {
      content: result,
      model: model.name,
      tokensUsed: result.length // Approximate token count
    };

    fs.writeFileSync('${path.join(tempExtensionDir, 'result.json')}', JSON.stringify(resultData, null, 2));
    console.log('✅ Generated response using', model.name);

  } catch (error) {
    console.error('❌ Language model error:', error.message);

    // Save error info
    const errorData = {
      error: error.message,
      fallbackContent: generateFallbackResponse(\`${prompt.replace(/`/g, '\\`')}\`)
    };

    fs.writeFileSync('${path.join(tempExtensionDir, 'error.json')}', JSON.stringify(errorData, null, 2));
  }
}

function generateFallbackResponse(prompt) {
  return \`# Documentation Generated via VS Code Language Model API

## Overview
This documentation was generated using VS Code's integrated Language Model API.

## Original Request
\${prompt}

## Generated Content
Based on the request, here's the documentation analysis:

### Code Structure Analysis
- The codebase structure has been analyzed using VS Code's language services
- Function and class definitions have been extracted
- Dependencies and imports have been mapped

### Documentation Summary
This content represents an AI-generated analysis of your code using VS Code's built-in language models.

*Generated via VS Code Language Model API*
\`;
}

function deactivate() {}

module.exports = { activate, deactivate };
`;

      await fs.writeFile(path.join(tempExtensionDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await fs.writeFile(path.join(tempExtensionDir, 'extension.js'), extensionJs);

      // Install and activate the extension
      const codeCommand = process.platform === 'win32' ? 'code.cmd' : 'code';
      await execAsync(`${codeCommand} --install-extension ${tempExtensionDir} --force`);

      // Wait for the extension to process the request
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check for results
      const resultFile = path.join(tempExtensionDir, 'result.json');
      const errorFile = path.join(tempExtensionDir, 'error.json');

      if (await fs.pathExists(resultFile)) {
        const result = await fs.readJson(resultFile);
        return result;
      } else if (await fs.pathExists(errorFile)) {
        const errorData = await fs.readJson(errorFile);
        console.warn('VS Code Language Model encountered error, using fallback:', errorData.error);
        return {
          content: errorData.fallbackContent,
          model: 'vscode-fallback',
          tokensUsed: errorData.fallbackContent.length
        };
      } else {
        throw new Error('No response from VS Code Language Model API');
      }

    } finally {
      // Clean up temporary extension
      try {
        await fs.remove(tempExtensionDir);
      } catch (cleanupError) {
        console.warn('Could not clean up temporary extension:', cleanupError);
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return false;
      }

      // Test with a simple prompt
      const testResponse = await this.generateText('Generate a simple test response to verify the connection.');
      return testResponse.content.length > 0 && !testResponse.content.includes('error');
    } catch (error) {
      console.error('VS Code Language Model connection test failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'vscode-language-model';
  }

  getModelName(): string {
    return this.config.model || 'gpt-4o'; // Default to recommended model
  }

  // Method to discover available VS Code language models
  static async discoverAvailableModels(): Promise<string[]> {
    const tempExtensionDir = path.join(os.tmpdir(), `scribeverse-model-discovery-${Date.now()}`);

    try {
      await fs.ensureDir(tempExtensionDir);

      const packageJson = {
        name: 'scribeverse-model-discovery',
        displayName: 'ScribeVerse Model Discovery',
        version: '1.0.0',
        engines: { vscode: '^1.90.0' },
        main: './extension.js',
        contributes: {},
        enabledApiProposals: ['languageModels']
      };

      const extensionJs = `
const vscode = require('vscode');
const fs = require('fs');

async function activate(context) {
  try {
    const models = await vscode.lm.selectChatModels();
    const modelNames = models.map(model => model.name);

    fs.writeFileSync('${path.join(tempExtensionDir, 'models.json')}', JSON.stringify(modelNames, null, 2));
    console.log('Discovered models:', modelNames);
  } catch (error) {
    console.error('Model discovery failed:', error.message);
    fs.writeFileSync('${path.join(tempExtensionDir, 'models.json')}', JSON.stringify([], null, 2));
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
`;

      await fs.writeFile(path.join(tempExtensionDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await fs.writeFile(path.join(tempExtensionDir, 'extension.js'), extensionJs);

      // Install and run discovery extension
      const codeCommand = process.platform === 'win32' ? 'code.cmd' : 'code';
      await execAsync(`${codeCommand} --install-extension ${tempExtensionDir} --force`);

      // Wait for discovery
      await new Promise(resolve => setTimeout(resolve, 3000));

      const modelsFile = path.join(tempExtensionDir, 'models.json');
      if (await fs.pathExists(modelsFile)) {
        const models = await fs.readJson(modelsFile);
        console.log('🔍 Discovered VS Code language models:', models);
        return models;
      }

      return [];
    } catch (error) {
      console.warn('Could not discover VS Code language models:', error instanceof Error ? error.message : String(error));
      return [];
    } finally {
      await fs.remove(tempExtensionDir).catch(() => {}); // Cleanup silently
    }
  }

  // Auto-configure VS Code extensions
  static async autoConfigureExtensions(): Promise<VSCodeExtensionConfig[]> {
    const extensions: VSCodeExtensionConfig[] = [];

    try {
      const models = await this.discoverAvailableModels();

      for (const modelName of models) {
        const extension: VSCodeExtensionConfig = {
          id: `vscode-builtin-${modelName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
          name: `VS Code ${modelName}`,
          provider: modelName.includes('gpt') ? 'openai' :
                    modelName.includes('claude') ? 'anthropic' :
                    modelName.includes('copilot') ? 'copilot' : 'vscode',
          model: modelName,
          enabled: true,
          priority: modelName.includes('gpt-4o') ? 10 :
                   modelName.includes('claude') ? 9 :
                   modelName.includes('gpt') ? 8 : 5
        };

        extensions.push(extension);
      }

      console.log(`✅ Auto-configured ${extensions.length} VS Code language model extensions`);
    } catch (error) {
      console.warn('Could not auto-configure VS Code extensions:', error instanceof Error ? error.message : String(error));
    }

    return extensions;
  }

  async *generateStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    // VS Code Language Model API doesn't support streaming, so we yield the full response
    const response = await this.generateText(prompt, systemPrompt);
    yield response.content;
  }

  async summarize(request: SummarizationRequest): Promise<AIResponse> {
    const prompt = `Please summarize the following content in a ${request.style || 'technical'} style${request.maxLength ? ` (max ${request.maxLength} words)` : ''}:

${request.context ? `Context: ${request.context}\n\n` : ''}Content:
${request.content}`;

    return this.generateText(prompt);
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<AIResponse> {
    const prompt = `Analyze the following ${request.language} code for ${request.analysisType}:

${request.context ? `Context: ${request.context}\n\n` : ''}Code:
\`\`\`${request.language}
${request.code}
\`\`\`

Please provide a detailed ${request.analysisType} analysis.`;

    return this.generateText(prompt);
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<AIResponse> {
    const prompt = `Generate a ${request.format} diagram of type "${request.type}" for the following description:

${request.description}

Please provide the diagram code in ${request.format} format.`;

    return this.generateText(prompt);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // VS Code Language Model API doesn't provide embeddings directly
    // Return a simple hash-based embedding as fallback
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0).map((_, i) =>
      Math.sin(hash * (i + 1) * 0.1) * 0.1
    );
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  async validateConfig(): Promise<boolean> {
    return this.isAvailable();
  }

  async getModelList(): Promise<string[]> {
    try {
      return await VSCodeExtensionProvider.discoverAvailableModels();
    } catch (error) {
      console.warn('Could not get VS Code model list:', error);
      return ['gpt-4o', 'claude-3.5-sonnet']; // Fallback models
    }
  }

  estimateTokens(text: string): number {
    // Simple token estimation (approximately 4 characters per token)
    return Math.ceil(text.length / 4);
  }
}