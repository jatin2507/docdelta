#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read package.json to get provider dependencies mapping
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const PROVIDER_DEPENDENCIES = packageJson.providerDependencies || {
  "openai": ["openai"],
  "anthropic": ["@anthropic-ai/sdk"],
  "google-gemini": ["@google/genai"],
  "xai-grok": ["@ai-sdk/xai"],
  "ollama": ["ollama"],
  "litellm": ["litellm"]
};

function getLatestVersion(packageName) {
  try {
    const result = execSync(`npm view ${packageName} version`, { encoding: 'utf8' });
    return result.trim();
  } catch (error) {
    console.warn(`Warning: Could not get latest version for ${packageName}`);
    return 'latest';
  }
}

function installProvider(provider) {
  console.log(`🔧 Installing dependencies for provider: ${provider}`);

  if (!PROVIDER_DEPENDENCIES[provider]) {
    console.error(`❌ Unknown provider: ${provider}`);
    console.log(`Available providers: ${Object.keys(PROVIDER_DEPENDENCIES).join(', ')}`);
    process.exit(1);
  }

  const dependencies = PROVIDER_DEPENDENCIES[provider];

  for (const dep of dependencies) {
    try {
      console.log(`📦 Installing ${dep}...`);
      const version = getLatestVersion(dep);
      execSync(`npm install ${dep}@${version}`, { stdio: 'inherit' });
      console.log(`✅ Successfully installed ${dep}@${version}`);
    } catch (error) {
      console.error(`❌ Failed to install ${dep}:`, error.message);
      process.exit(1);
    }
  }

  console.log(`🎉 Provider ${provider} is now ready to use!`);
}

function showUsage() {
  console.log(`
📚 ScribeVerse Provider Installer

Usage: npm run install-provider <provider>

Available providers:
${Object.keys(PROVIDER_DEPENDENCIES).map(p => `  • ${p}: ${PROVIDER_DEPENDENCIES[p].join(', ')}`).join('\n')}

Examples:
  npm run install-provider openai
  npm run install-provider anthropic
  npm run install-provider google-gemini

This will install only the dependencies needed for the selected provider,
keeping your bundle size small and avoiding unnecessary API dependencies.
`);
}

// Main execution
const provider = process.argv[2];

if (!provider || provider === '--help' || provider === '-h') {
  showUsage();
  process.exit(0);
}

installProvider(provider);