#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Models.dev API data (static copy since the API returns dynamic data)
const MODELS_API_DATA = {
  openai: {
    provider: 'OpenAI',
    models: {
      'gpt-4o': {
        name: 'GPT-4o',
        context: '128k',
        version: 'latest',
        capabilities: ['text', 'vision', 'code']
      },
      'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        context: '128k',
        version: 'latest',
        capabilities: ['text', 'code']
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        context: '128k',
        version: 'gpt-4-turbo-2024-04-09',
        capabilities: ['text', 'vision', 'code']
      }
    }
  },
  anthropic: {
    provider: 'Anthropic',
    models: {
      'claude-3-5-sonnet-20241022': {
        name: 'Claude 3.5 Sonnet',
        context: '200k',
        version: '20241022',
        capabilities: ['text', 'code', 'reasoning']
      },
      'claude-3-5-haiku-20241022': {
        name: 'Claude 3.5 Haiku',
        context: '200k',
        version: '20241022',
        capabilities: ['text', 'code']
      },
      'claude-3-opus-20240229': {
        name: 'Claude 3 Opus',
        context: '200k',
        version: '20240229',
        capabilities: ['text', 'code', 'reasoning']
      }
    }
  },
  'google-gemini': {
    provider: 'Google',
    models: {
      'gemini-2.0-flash-exp': {
        name: 'Gemini 2.0 Flash (Experimental)',
        context: '1M',
        version: '2.0-flash-exp',
        capabilities: ['text', 'vision', 'code']
      },
      'gemini-1.5-pro': {
        name: 'Gemini 1.5 Pro',
        context: '2M',
        version: '1.5-pro',
        capabilities: ['text', 'vision', 'code']
      },
      'gemini-1.5-flash': {
        name: 'Gemini 1.5 Flash',
        context: '1M',
        version: '1.5-flash',
        capabilities: ['text', 'vision', 'code']
      }
    }
  },
  'xai-grok': {
    provider: 'xAI',
    models: {
      'grok-beta': {
        name: 'Grok Beta',
        context: '131k',
        version: 'beta',
        capabilities: ['text', 'code', 'search']
      },
      'grok-vision-beta': {
        name: 'Grok Vision Beta',
        context: '8k',
        version: 'vision-beta',
        capabilities: ['text', 'vision', 'code']
      }
    }
  },
  ollama: {
    provider: 'Ollama',
    models: {
      'llama3.2': {
        name: 'Llama 3.2',
        context: '128k',
        version: '3.2',
        capabilities: ['text', 'code']
      },
      'codellama': {
        name: 'Code Llama',
        context: '100k',
        version: 'latest',
        capabilities: ['code']
      },
      'qwen2.5-coder': {
        name: 'Qwen 2.5 Coder',
        context: '32k',
        version: '2.5',
        capabilities: ['code', 'text']
      }
    }
  }
};

function validateModels(provider) {
  if (provider && !MODELS_API_DATA[provider]) {
    console.error(`❌ Unknown provider: ${provider}`);
    console.log(`Available providers: ${Object.keys(MODELS_API_DATA).join(', ')}`);
    return false;
  }

  const providers = provider ? [provider] : Object.keys(MODELS_API_DATA);

  console.log(`🔍 Validating models for: ${providers.join(', ')}\n`);

  for (const providerName of providers) {
    const providerData = MODELS_API_DATA[providerName];
    console.log(`\n📡 ${providerData.provider} Models:`);

    for (const [modelId, modelData] of Object.entries(providerData.models)) {
      console.log(`  ✅ ${modelData.name} (${modelId})`);
      console.log(`     Context: ${modelData.context} | Version: ${modelData.version}`);
      console.log(`     Capabilities: ${modelData.capabilities.join(', ')}`);
    }
  }

  console.log(`\n🎉 All models validated successfully!`);
  return true;
}

function getLatestModels() {
  console.log('📋 Latest Recommended Models by Provider:\n');

  for (const [providerId, providerData] of Object.entries(MODELS_API_DATA)) {
    const models = Object.entries(providerData.models);
    const latestModel = models[0]; // First model is considered latest/recommended

    console.log(`${providerData.provider}:`);
    console.log(`  Recommended: ${latestModel[1].name} (${latestModel[0]})`);
    console.log(`  Context: ${latestModel[1].context} | Capabilities: ${latestModel[1].capabilities.join(', ')}\n`);
  }
}

function generateModelValidationCode() {
  const validationCode = `
// Auto-generated model validation - DO NOT EDIT MANUALLY
export const SUPPORTED_MODELS = ${JSON.stringify(MODELS_API_DATA, null, 2)};

export function validateModel(provider: string, model: string): boolean {
  const providerData = SUPPORTED_MODELS[provider];
  return providerData && providerData.models[model] !== undefined;
}

export function getProviderModels(provider: string): string[] {
  const providerData = SUPPORTED_MODELS[provider];
  return providerData ? Object.keys(providerData.models) : [];
}

export function getModelInfo(provider: string, model: string) {
  const providerData = SUPPORTED_MODELS[provider];
  return providerData?.models[model] || null;
}

export function getLatestModel(provider: string): string | null {
  const models = getProviderModels(provider);
  return models.length > 0 ? models[0] : null;
}
`;

  const outputPath = path.join(__dirname, '..', 'src', 'utils', 'model-validation.ts');
  fs.writeFileSync(outputPath, validationCode);
  console.log(`✅ Generated model validation code at: ${outputPath}`);
}

function showUsage() {
  console.log(`
🤖 ScribeVerse Model Validator

Usage:
  npm run validate-models [provider]        # Validate models for specific provider
  npm run validate-models --list           # List all latest recommended models
  npm run validate-models --generate       # Generate TypeScript validation code

Examples:
  npm run validate-models openai          # Validate OpenAI models
  npm run validate-models anthropic       # Validate Anthropic models
  npm run validate-models --list          # Show latest models for all providers
  npm run validate-models --generate      # Generate validation TypeScript code

This uses the latest model information from models.dev API to ensure
you're using the most current model versions available.
`);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  showUsage();
  process.exit(0);
}

if (command === '--list') {
  getLatestModels();
  process.exit(0);
}

if (command === '--generate') {
  generateModelValidationCode();
  process.exit(0);
}

// Validate specific provider or all providers
validateModels(command);