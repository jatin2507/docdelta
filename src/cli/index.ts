#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../config';
import { ParserFactory } from '../core/parser';
import { DocumentationGenerator } from '../core/generator';
import { GitService } from '../core/git';
import { MetadataManager } from '../core/metadata';
import { FlowAnalyzer } from '../core/analyzer/flow-analyzer';
import { AIOptimizedDocGenerator } from '../core/generator/ai-optimized-generator';
import { CrossPlatform } from '../utils/cross-platform';

const packageJson = require('../../package.json');
const version = packageJson.version;

const program = new Command();

program
  .name('scribeverse')
  .description('Multi-language documentation tool with incremental updates and AI-powered summaries')
  .version(version);

program
  .command('generate')
  .description('Generate complete documentation for the codebase')
  .option('-s, --source <path>', 'Source directory path', process.cwd())
  .option('-o, --output <path>', 'Output directory for documentation', './docs')
  .option('-i, --include <patterns...>', 'File patterns to include')
  .option('-e, --exclude <patterns...>', 'File patterns to exclude')
  .option('--no-git', 'Disable git integration')
  .option('--no-cache', 'Disable caching')
  .action(async (options) => {
    const spinner = ora('Initializing ScribeVerse...').start();

    try {
      const config = ConfigManager.getInstance();
      config.updateConfig({
        sourceDir: options.source,
        outputDir: options.output,
        include: options.include,
        exclude: options.exclude,
      });

      const configErrors = config.validateConfig();
      if (configErrors.length > 0) {
        spinner.fail('Configuration errors:');
        configErrors.forEach((error) => console.error(chalk.red(`  - ${error}`)));
        process.exit(1);
      }

      spinner.text = 'Parsing source files...';
      const modules = await ParserFactory.parseDirectory(options.source, options.include);
      spinner.succeed(`Parsed ${modules.length} modules`);

      spinner.start('Initializing metadata manager...');
      const metadataManager = new MetadataManager();
      await metadataManager.initialize();
      spinner.succeed('Metadata manager initialized');

      spinner.start('Generating documentation...');
      const generator = new DocumentationGenerator();
      const result = await generator.generate(modules);
      spinner.succeed(`Generated documentation: ${result.files.length} files created`);

      if (options.git !== false) {
        spinner.start('Committing documentation changes...');
        const gitService = new GitService(options.source);

        if (await gitService.isGitRepository()) {
          const changedFiles = result.files.map((f) => f.path);
          const commitHash = await gitService.generateAndCommit(changedFiles);
          spinner.succeed(`Committed documentation (${commitHash})`);

          if (gitService.shouldAutoPush()) {
            spinner.start('Pushing to remote repository...');
            await gitService.push();
            spinner.succeed('Pushed to remote repository');
          }
        } else {
          spinner.info('Not a git repository, skipping git operations');
        }
      }

      console.log(chalk.green('\n✨ Documentation generation complete!'));
      console.log(chalk.cyan(`  Files processed: ${result.stats.filesProcessed}`));
      console.log(chalk.cyan(`  Chunks analyzed: ${result.stats.chunksAnalyzed}`));
      console.log(chalk.cyan(`  Tokens used: ${result.stats.tokensUsed}`));
      console.log(chalk.cyan(`  Time elapsed: ${(result.stats.timeElapsed / 1000).toFixed(2)}s`));

      if (result.stats.errors.length > 0) {
        console.log(chalk.yellow('\n⚠ Warnings:'));
        result.stats.errors.forEach((error) => console.log(chalk.yellow(`  - ${error}`)));
      }
    } catch (error) {
      spinner.fail('Documentation generation failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Incrementally update documentation based on code changes')
  .option('-s, --source <path>', 'Source directory path', process.cwd())
  .option('-o, --output <path>', 'Output directory for documentation', './docs')
  .option('--force', 'Force update all documentation')
  .action(async (options) => {
    const spinner = ora('Checking for changes...').start();

    try {
      const config = ConfigManager.getInstance();
      config.updateConfig({
        sourceDir: options.source,
        outputDir: options.output,
      });

      const metadataManager = new MetadataManager();
      await metadataManager.initialize();

      spinner.text = 'Parsing source files...';
      const modules = await ParserFactory.parseDirectory(options.source);
      const allChunks = modules.flatMap((m) => m.chunks);

      spinner.text = 'Detecting changes...';

      await metadataManager.loadProjectMetadata();

      if (options.force) {
        spinner.info('Force update: regenerating all documentation');
        const generator = new DocumentationGenerator();
        const result = await generator.generate(modules);
        spinner.succeed(`Updated ${result.files.length} documentation files`);
      } else {
        const changedChunks = await metadataManager.getChangedChunks(allChunks);

        if (changedChunks.length === 0) {
          spinner.succeed('No changes detected, documentation is up to date');
          return;
        }

        spinner.text = `Updating documentation for ${changedChunks.length} changed chunks...`;
        const generator = new DocumentationGenerator();
        const changedModules = modules.filter((m) =>
          m.chunks.some((c) => changedChunks.find((cc) => cc.id === c.id))
        );

        const result = await generator.generate(changedModules);
        await metadataManager.updateChunksMetadata(changedChunks);

        spinner.succeed(`Updated documentation: ${result.files.length} files modified`);

        const gitService = new GitService(options.source);
        if (await gitService.isGitRepository()) {
          const changedFiles = result.files.map((f) => f.path);
          const commitHash = await gitService.generateAndCommit(changedFiles);
          spinner.succeed(`Committed changes (${commitHash})`);
        }
      }

      console.log(chalk.green('\n✨ Documentation update complete!'));
    } catch (error) {
      spinner.fail('Documentation update failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('commit')
  .description('Generate commit message and commit documentation changes')
  .option('-m, --message <message>', 'Custom commit message')
  .option('-p, --push', 'Push changes after commit')
  .action(async (options) => {
    const spinner = ora('Checking git status...').start();

    try {
      const gitService = new GitService();

      if (!(await gitService.isGitRepository())) {
        spinner.fail('Not a git repository');
        process.exit(1);
      }

      const modifiedFiles = await gitService.getModifiedFiles();
      const docFiles = modifiedFiles.filter(
        (f) => f.includes('docs/') || f.includes('README')
      );

      if (docFiles.length === 0) {
        spinner.succeed('No documentation changes to commit');
        return;
      }

      spinner.text = 'Staging documentation files...';
      await gitService.stageFiles(docFiles);

      if (options.message) {
        await gitService.commit(options.message);
      } else {
        spinner.text = 'Generating commit message...';
        const commitHash = await gitService.generateAndCommit(docFiles);
        spinner.succeed(`Committed documentation changes (${commitHash})`);
      }

      if (options.push) {
        spinner.start('Pushing to remote repository...');
        await gitService.push();
        spinner.succeed('Pushed to remote repository');
      }

      console.log(chalk.green('\n✨ Documentation committed successfully!'));
    } catch (error) {
      spinner.fail('Commit failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show documentation status and pending changes')
  .action(async () => {
    const spinner = ora('Checking documentation status...').start();

    try {
      const metadataManager = new MetadataManager();
      await metadataManager.initialize();
      const stats = await metadataManager.getStatistics();

      spinner.stop();

      console.log(chalk.bold('\n📊 Documentation Status\n'));
      console.log(`  Total chunks tracked: ${chalk.cyan(stats.totalChunks)}`);
      console.log(`  Documented chunks: ${chalk.green(stats.documentedChunks)}`);
      console.log(
        `  Coverage: ${chalk.yellow(
          ((stats.documentedChunks / stats.totalChunks) * 100).toFixed(1) + '%'
        )}`
      );
      console.log(
        `  Last generated: ${chalk.blue(
          stats.lastGenerated ? stats.lastGenerated.toLocaleString() : 'Never'
        )}`
      );
      console.log(`  Cache size: ${chalk.magenta((stats.cacheSize / 1024).toFixed(2) + ' KB')}`);

      const gitService = new GitService();
      if (await gitService.isGitRepository()) {
        console.log(chalk.bold('\n🔀 Git Status\n'));
        const status = await gitService.getStatus();
        const docChanges = [
          ...status.modified.filter((f) => f.includes('docs/')),
          ...status.not_added.filter((f) => f.includes('docs/')),
        ];

        if (docChanges.length > 0) {
          console.log(chalk.yellow(`  ${docChanges.length} documentation files with changes:`));
          docChanges.forEach((file) => console.log(`    - ${file}`));
        } else {
          console.log(chalk.green('  No pending documentation changes'));
        }
      }
    } catch (error) {
      spinner.fail('Failed to get status');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('diff-docs')
  .description('Show differences between current docs and pending updates')
  .option('-f, --file <path>', 'Show diff for specific file')
  .action(async (options) => {
    const spinner = ora('Computing documentation differences...').start();

    try {
      const gitService = new GitService();

      if (!(await gitService.isGitRepository())) {
        spinner.fail('Not a git repository');
        process.exit(1);
      }

      spinner.stop();

      if (options.file) {
        const diff = await gitService.getDiff(options.file);
        if (diff) {
          console.log(chalk.bold(`\n📝 Diff for ${options.file}:\n`));
          console.log(diff);
        } else {
          console.log(chalk.yellow(`No changes in ${options.file}`));
        }
      } else {
        const modifiedFiles = await gitService.getModifiedFiles();
        const docFiles = modifiedFiles.filter(
          (f) => f.includes('docs/') || f.includes('README')
        );

        if (docFiles.length === 0) {
          console.log(chalk.green('No documentation changes detected'));
          return;
        }

        console.log(chalk.bold('\n📝 Documentation Changes:\n'));
        for (const file of docFiles) {
          console.log(chalk.cyan(`\n--- ${file} ---`));
          const diff = await gitService.getDiff(file);
          if (diff) {
            const lines = diff.split('\n').slice(0, 20);
            console.log(lines.join('\n'));
            if (diff.split('\n').length > 20) {
              console.log(chalk.gray('... (truncated, use --file option to see full diff)'));
            }
          }
        }
      }
    } catch (error) {
      spinner.fail('Failed to compute diff');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize ScribeVerse in the current directory')
  .action(async () => {
    const spinner = ora('Initializing ScribeVerse...').start();

    try {
      const config = ConfigManager.getInstance();
      config.saveConfig();
      spinner.succeed('Created .scribeverse.yml configuration file');

      const metadataManager = new MetadataManager();
      await metadataManager.initialize();
      spinner.succeed('Initialized metadata directory');

      const gitService = new GitService();
      if (!(await gitService.isGitRepository())) {
        await gitService.initRepository();
        spinner.succeed('Initialized git repository');
      }

      console.log(chalk.green('\n✨ ScribeVerse initialized successfully!'));
      console.log(chalk.cyan('\nNext steps:'));
      console.log('  1. Set your OpenAI API key: export OPENAI_API_KEY=your-key');
      console.log('  2. Configure .scribeverse.yml as needed');
      console.log('  3. Run: scribeverse generate');
    } catch (error) {
      spinner.fail('Initialization failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('ai-flow')
  .description('Generate AI-optimized documentation with code flow analysis')
  .option('-s, --source <path>', 'Source directory path', process.cwd())
  .option('-o, --output <path>', 'Output directory for AI docs', './docs-ai')
  .option('-i, --include <patterns...>', 'File patterns to include')
  .option('-e, --exclude <patterns...>', 'File patterns to exclude')
  .option('--entry <files...>', 'Specify entry point files')
  .option('--no-git', 'Disable git integration')
  .action(async (options) => {
    const spinner = ora('Starting AI-optimized flow analysis...').start();

    try {
      // Normalize paths for cross-platform
      const sourceDir = CrossPlatform.resolvePath(options.source);
      const outputDir = CrossPlatform.resolvePath(options.output);

      spinner.text = 'Analyzing project structure and entry points...';
      const flowAnalyzer = new FlowAnalyzer(sourceDir);
      const projectFlow = await flowAnalyzer.analyzeProject(options.include);

      spinner.succeed(`Found ${projectFlow.entryPoints.length} entry points and ${projectFlow.modules.size} modules`);

      spinner.start('Parsing all modules...');
      const modules = await ParserFactory.parseDirectory(sourceDir, options.include);
      const moduleMap = new Map(modules.map(m => [m.path, m]));
      spinner.succeed(`Parsed ${modules.length} modules`);

      spinner.start('Generating AI-optimized documentation...');
      const aiGenerator = new AIOptimizedDocGenerator(outputDir);
      await aiGenerator.generateStructuredDocs(projectFlow, moduleMap);
      spinner.succeed('Generated AI-optimized documentation');

      console.log(chalk.green('\n✨ AI-optimized documentation generated successfully!'));
      console.log(chalk.cyan('\n📊 Summary:'));
      console.log(chalk.cyan(`  Entry Points: ${projectFlow.entryPoints.length}`));
      console.log(chalk.cyan(`  Modules Analyzed: ${projectFlow.modules.size}`));
      console.log(chalk.cyan(`  Dependencies Mapped: ${projectFlow.dependencyGraph.size}`));
      console.log(chalk.cyan(`  Execution Flow Steps: ${projectFlow.executionFlow.length}`));
      console.log(chalk.cyan(`  Output Directory: ${outputDir}`));

      console.log(chalk.yellow('\n📚 Generated Files:'));
      console.log(chalk.yellow(`  - AI_PROJECT_DOCS.md: Main documentation for AI understanding`));
      console.log(chalk.yellow(`  - project-structure.json: Structured data for AI consumption`));
      console.log(chalk.yellow(`  - EXECUTION_FLOW.md: Code execution flow from entry points`));
      console.log(chalk.yellow(`  - DEPENDENCIES.md: Dependency graph and relationships`));
      console.log(chalk.yellow(`  - files/: Individual file documentation`));

      if (options.git !== false) {
        const gitService = new GitService(sourceDir);
        if (await gitService.isGitRepository()) {
          spinner.start('Committing AI documentation...');
          const files = [
            CrossPlatform.joinPath(outputDir, 'AI_PROJECT_DOCS.md'),
            CrossPlatform.joinPath(outputDir, 'project-structure.json'),
            CrossPlatform.joinPath(outputDir, 'EXECUTION_FLOW.md'),
            CrossPlatform.joinPath(outputDir, 'DEPENDENCIES.md'),
          ];
          await gitService.stageFiles(files);
          await gitService.commit('docs: Generate AI-optimized documentation with flow analysis');
          spinner.succeed('Committed AI documentation');
        }
      }
    } catch (error) {
      spinner.fail('AI flow documentation generation failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('usage')
  .description('Show AI token usage statistics and history')
  .option('--days <number>', 'Show usage for last N days', '30')
  .option('--provider <name>', 'Filter by specific provider')
  .option('--export', 'Export usage data to JSON file')
  .option('--clear [days]', 'Clear usage history (optional: older than N days)')
  .action(async (options) => {
    const spinner = ora('Loading token usage statistics...').start();

    try {
      const { DatabaseManager } = await import('../core/database');
      const db = new DatabaseManager();
      await db.initialize();

      if (options.clear !== undefined) {
        const days = options.clear || undefined;
        const cleared = await db.clearUsageHistory(days);
        spinner.succeed(`Cleared ${cleared} usage records${days ? ` older than ${days} days` : ''}`);
        return;
      }

      if (options.export) {
        const data = await db.exportUsageData();
        const filename = `scribeverse-usage-${new Date().toISOString().split('T')[0]}.json`;
        const fs = await import('fs-extra');
        await fs.writeJson(filename, data, { spaces: 2 });
        spinner.succeed(`Usage data exported to ${filename}`);
        return;
      }

      const days = parseInt(options.days) || 30;
      const stats = await db.getUsageStatistics(days);
      const history = await db.getUsageHistory(10, options.provider);
      const dbInfo = await db.getDatabaseInfo();

      spinner.stop();

      console.log(chalk.bold(`\n📊 Token Usage Statistics (Last ${days} days)\n`));

      // Overview
      console.log(chalk.cyan('📈 Overview:'));
      console.log(`  Total Tokens: ${chalk.yellow(stats.totalTokens.toLocaleString())}`);
      console.log(`  Estimated Cost: ${chalk.green(`$${stats.totalCost.toFixed(4)}`)}`);
      console.log(`  Sessions: ${chalk.blue(stats.sessionsCount)}`);
      console.log(`  Last Usage: ${chalk.gray(stats.lastUsage ? stats.lastUsage.toLocaleString() : 'Never')}`);

      // Provider breakdown
      if (Object.keys(stats.providerCounts).length > 0) {
        console.log(chalk.cyan('\n🤖 By Provider:'));
        Object.entries(stats.providerCounts).forEach(([provider, count]) => {
          console.log(`  ${provider}: ${chalk.yellow(count.toLocaleString())} tokens`);
        });
      }

      // Model breakdown
      if (Object.keys(stats.modelCounts).length > 0) {
        console.log(chalk.cyan('\n🎯 By Model:'));
        Object.entries(stats.modelCounts).forEach(([model, count]) => {
          console.log(`  ${model}: ${chalk.yellow(count.toLocaleString())} tokens`);
        });
      }

      // Operation breakdown
      if (Object.keys(stats.operationCounts).length > 0) {
        console.log(chalk.cyan('\n⚡ By Operation:'));
        Object.entries(stats.operationCounts).forEach(([operation, count]) => {
          console.log(`  ${operation}: ${chalk.blue(count)} calls`);
        });
      }

      // Recent history
      if (history.length > 0) {
        console.log(chalk.cyan('\n📝 Recent Usage:'));
        history.slice(0, 5).forEach((record) => {
          const cost = record.cost ? ` ($${record.cost.toFixed(4)})` : '';
          console.log(`  ${chalk.gray(record.timestamp.toLocaleString())} - ${record.provider}/${record.model}: ${record.tokensUsed} tokens${cost}`);
        });
      }

      // Database info
      console.log(chalk.cyan('\n💾 Database Info:'));
      console.log(`  Path: ${chalk.gray(dbInfo.path)}`);
      console.log(`  Size: ${chalk.yellow((dbInfo.size / 1024).toFixed(2))} KB`);
      console.log(`  Records: ${chalk.blue(dbInfo.totalRecords)}`);
      console.log(`  Current Session: ${chalk.magenta(dbInfo.sessionId)}`);

      console.log(chalk.gray('\n💡 Tip: Use --export to save detailed usage data or --clear to reset statistics'));

    } catch (error) {
      spinner.fail('Failed to load usage statistics');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program.parse(process.argv);