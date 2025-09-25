import { execSync, spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

interface ProviderDependency {
  packages: string[];
  description: string;
}

export class DependencyManager {
  private static readonly PROVIDER_DEPENDENCIES: Record<string, ProviderDependency> = {
    'openai': {
      packages: ['openai@^5.23.0'],
      description: 'OpenAI SDK for GPT models'
    },
    'anthropic': {
      packages: ['@anthropic-ai/sdk@^0.63.1'],
      description: 'Anthropic SDK for Claude models'
    },
    'google-gemini': {
      packages: ['@google/genai@^0.3.1'],
      description: 'Google Gemini SDK'
    },
    'xai-grok': {
      packages: ['@ai-sdk/xai@^2.0.22'],
      description: 'xAI SDK for Grok models'
    },
    'ollama': {
      packages: ['ollama@^0.6.0'],
      description: 'Ollama SDK for local models'
    },
    'litellm': {
      packages: ['litellm@^0.12.0'],
      description: 'LiteLLM proxy SDK'
    }
  };

  private static getGlobalNodeModulesPath(): string {
    try {
      // Get npm global root directory
      const npmRoot = execSync('npm root -g', { encoding: 'utf8', stdio: 'pipe' }).trim();
      return npmRoot;
    } catch {
      // Fallback to common global paths
      const platform = os.platform();
      const homeDir = os.homedir();

      switch (platform) {
        case 'win32':
          return path.join(process.env.APPDATA || homeDir, 'npm', 'node_modules');
        case 'darwin':
          return path.join('/usr/local/lib/node_modules');
        default: // linux
          return path.join('/usr/local/lib/node_modules');
      }
    }
  }

  private static async isPackageInstalled(packageName: string): Promise<boolean> {
    try {
      // Check if package is available in current context
      require.resolve(packageName);
      return true;
    } catch {
      // Check global installation
      try {
        const globalPath = this.getGlobalNodeModulesPath();
        const packagePath = path.join(globalPath, packageName);
        return await fs.pathExists(packagePath);
      } catch {
        return false;
      }
    }
  }

  private static async installPackageGlobally(packageSpec: string): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(chalk.yellow(`📦 Installing ${packageSpec} globally...`));

      const npmCommand = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
      const installProcess = spawn(npmCommand, ['install', '-g', packageSpec], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      // Variables to capture process output
      let errorOutput = '';

      installProcess.stdout?.on('data', () => {
        // Output captured but not used for logging
      });

      installProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green(`✅ Successfully installed ${packageSpec}`));
          resolve(true);
        } else {
          console.error(chalk.red(`❌ Failed to install ${packageSpec}`));
          if (errorOutput.includes('EACCES') || errorOutput.includes('permission')) {
            console.error(chalk.yellow('💡 Try running with administrator/sudo privileges or use a Node version manager'));
          }
          console.error(chalk.gray(`Error: ${errorOutput.trim()}`));
          resolve(false);
        }
      });

      installProcess.on('error', (error) => {
        console.error(chalk.red(`❌ Failed to spawn npm install: ${error.message}`));
        resolve(false);
      });
    });
  }

  static async checkAndInstallProviderDependencies(provider: string): Promise<boolean> {
    const providerInfo = this.PROVIDER_DEPENDENCIES[provider];

    if (!providerInfo) {
      console.warn(chalk.yellow(`⚠️  Unknown provider: ${provider}`));
      return true; // Don't block execution for unknown providers
    }

    console.log(chalk.blue(`🔍 Checking dependencies for ${provider} provider...`));

    let allInstalled = true;
    const missingPackages: string[] = [];

    // Check which packages are missing
    for (const packageSpec of providerInfo.packages) {
      const packageName = packageSpec.split('@')[0];
      const isInstalled = await this.isPackageInstalled(packageName);

      if (!isInstalled) {
        missingPackages.push(packageSpec);
        allInstalled = false;
      } else {
        console.log(chalk.green(`✅ ${packageName} is already available`));
      }
    }

    // Install missing packages
    if (missingPackages.length > 0) {
      console.log(chalk.blue(`📦 Installing missing dependencies for ${provider}...`));
      console.log(chalk.gray(`Description: ${providerInfo.description}`));

      for (const packageSpec of missingPackages) {
        const success = await this.installPackageGlobally(packageSpec);
        if (!success) {
          console.error(chalk.red(`❌ Failed to install ${packageSpec}`));
          console.error(chalk.yellow(`💡 You can install it manually: npm install -g ${packageSpec}`));
          return false;
        }
      }
    }

    if (allInstalled || missingPackages.length === 0) {
      console.log(chalk.green(`🎉 All dependencies for ${provider} are ready!`));
    }

    return true;
  }

  static async checkProviderAvailability(provider: string): Promise<{
    available: boolean;
    missingDependencies: string[];
  }> {
    const providerInfo = this.PROVIDER_DEPENDENCIES[provider];

    if (!providerInfo) {
      return { available: false, missingDependencies: [] };
    }

    const missingDependencies: string[] = [];

    for (const packageSpec of providerInfo.packages) {
      const packageName = packageSpec.split('@')[0];
      const isInstalled = await this.isPackageInstalled(packageName);

      if (!isInstalled) {
        missingDependencies.push(packageSpec);
      }
    }

    return {
      available: missingDependencies.length === 0,
      missingDependencies
    };
  }

  static getAvailableProviders(): string[] {
    return Object.keys(this.PROVIDER_DEPENDENCIES);
  }

  static getProviderInfo(provider: string): ProviderDependency | null {
    return this.PROVIDER_DEPENDENCIES[provider] || null;
  }

  static async autoInstallMissingDependencies(providers: string[]): Promise<boolean> {
    console.log(chalk.blue('🔧 Auto-installing missing AI provider dependencies...'));

    let allSuccess = true;

    for (const provider of providers) {
      const success = await this.checkAndInstallProviderDependencies(provider);
      if (!success) {
        allSuccess = false;
      }
    }

    return allSuccess;
  }

  static async validateSystemRequirements(): Promise<boolean> {
    try {
      // Check if npm is available
      execSync('npm --version', { stdio: 'pipe' });
      return true;
    } catch {
      console.error(chalk.red('❌ npm is not available. Please install Node.js and npm'));
      return false;
    }
  }
}