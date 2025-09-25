import { DocDeltaConfig } from '../types';
import { DependencyManager } from './dependency-manager';
import chalk from 'chalk';

export class ProviderDetector {
  static detectRequiredProviders(config: DocDeltaConfig): string[] {
    const providers: Set<string> = new Set();

    // Check primary provider
    if (config.ai?.provider) {
      providers.add(this.normalizeProviderName(config.ai.provider));
    }

    // Check fallback providers if configured
    if (config.ai && 'fallbackProviders' in config.ai && Array.isArray((config.ai as any).fallbackProviders)) {
      const fallbackProviders = (config.ai as any).fallbackProviders as string[];
      fallbackProviders.forEach(provider => {
        providers.add(this.normalizeProviderName(provider));
      });
    }

    // Check multi-provider setup
    if (config.ai && 'providers' in config.ai && Array.isArray((config.ai as any).providers)) {
      const multiProviders = (config.ai as any).providers as any[];
      multiProviders.forEach(providerConfig => {
        if (providerConfig.provider) {
          providers.add(this.normalizeProviderName(providerConfig.provider));
        }
      });
    }

    return Array.from(providers).filter(provider =>
      DependencyManager.getAvailableProviders().includes(provider)
    );
  }

  static normalizeProviderName(provider: string): string {
    // Convert provider names to dependency manager keys
    const providerMap: Record<string, string> = {
      // Standard mappings
      'openai': 'openai',
      'anthropic': 'anthropic',
      'google-gemini': 'google-gemini',
      'ollama': 'ollama',
      'litellm': 'litellm',
      'vscode-lm': 'vscode-lm', // No dependencies needed
      // Grok variants
      'grok': 'xai-grok',
      'xai-grok': 'xai-grok'
    };

    return providerMap[provider] || provider;
  }

  static async detectAndInstallDependencies(config: DocDeltaConfig): Promise<boolean> {
    const requiredProviders = this.detectRequiredProviders(config);

    if (requiredProviders.length === 0) {
      console.log(chalk.yellow('⚠️  No AI providers detected in configuration'));
      return true;
    }

    console.log(chalk.blue(`🔍 Detected required providers: ${requiredProviders.join(', ')}`));

    // Filter out providers that don't need external dependencies
    const providersNeedingDependencies = requiredProviders.filter(provider =>
      provider !== 'vscode-lm' // VS Code LM doesn't need external dependencies
    );

    if (providersNeedingDependencies.length === 0) {
      console.log(chalk.green('✅ All detected providers use built-in dependencies'));
      return true;
    }

    // Check system requirements
    const systemOk = await DependencyManager.validateSystemRequirements();
    if (!systemOk) {
      return false;
    }

    // Auto-install missing dependencies
    const success = await DependencyManager.autoInstallMissingDependencies(providersNeedingDependencies);

    if (success) {
      console.log(chalk.green('🎉 All provider dependencies are ready!'));
    } else {
      console.error(chalk.red('❌ Some dependencies could not be installed automatically'));
      console.error(chalk.yellow('💡 Please install them manually or check your permissions'));

      // Show manual installation commands
      for (const provider of providersNeedingDependencies) {
        const info = DependencyManager.getProviderInfo(provider);
        if (info) {
          console.log(chalk.gray(`Manual install for ${provider}: npm install -g ${info.packages.join(' ')}`));
        }
      }
    }

    return success;
  }

  static async validateProviderAvailability(config: DocDeltaConfig): Promise<{
    valid: boolean;
    missingProviders: string[];
  }> {
    const requiredProviders = this.detectRequiredProviders(config);
    const missingProviders: string[] = [];

    for (const provider of requiredProviders) {
      if (provider === 'vscode-lm') continue; // Skip VS Code LM

      const availability = await DependencyManager.checkProviderAvailability(provider);
      if (!availability.available) {
        missingProviders.push(provider);
      }
    }

    return {
      valid: missingProviders.length === 0,
      missingProviders
    };
  }

  static async showProviderStatus(config: DocDeltaConfig): Promise<void> {
    const requiredProviders = this.detectRequiredProviders(config);

    console.log(chalk.blue('\n📊 Provider Dependency Status:'));
    console.log(chalk.blue('═'.repeat(40)));

    for (const provider of requiredProviders) {
      if (provider === 'vscode-lm') {
        console.log(chalk.green(`✅ ${provider}: Built-in (no dependencies)`));
        continue;
      }

      const availability = await DependencyManager.checkProviderAvailability(provider);
      const info = DependencyManager.getProviderInfo(provider);

      if (availability.available) {
        console.log(chalk.green(`✅ ${provider}: Ready`));
      } else {
        console.log(chalk.red(`❌ ${provider}: Missing dependencies`));
        if (info) {
          console.log(chalk.gray(`   Required: ${info.packages.join(', ')}`));
        }
      }
    }

    if (requiredProviders.length === 0) {
      console.log(chalk.yellow('⚠️  No AI providers configured'));
    }
  }
}