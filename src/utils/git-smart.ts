import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitStatus {
  branch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface CodeDiff {
  file: string;
  additions: number;
  deletions: number;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  language?: string;
  content?: string;
}

export interface SmartCommitInfo {
  changeType: string;
  commitPrefix: string;
  commitMessage: string;
  files: CodeDiff[];
  summary: string;
}

export class SmartGit {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Get current git status including branch information
   */
  async getStatus(): Promise<GitStatus> {
    try {
      const [branchResult, statusResult, aheadBehindResult] = await Promise.all([
        this.getCurrentBranch(),
        execAsync('git status --porcelain', { cwd: this.cwd }),
        this.getAheadBehind()
      ]);

      const branch = branchResult;
      const statusLines = statusResult.stdout.split('\n').filter(line => line.trim());

      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];

      statusLines.forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(file);
        }
        if (status[1] !== ' ' && status[1] !== '?') {
          modified.push(file);
        }
        if (status.startsWith('??')) {
          untracked.push(file);
        }
      });

      return {
        branch,
        isClean: statusLines.length === 0,
        ahead: aheadBehindResult.ahead,
        behind: aheadBehindResult.behind,
        staged,
        modified,
        untracked
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const result = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: this.cwd });
      return result.stdout.trim();
    } catch {
      // Fallback to checking git config or refs
      try {
        const result = await execAsync('git branch --show-current', { cwd: this.cwd });
        return result.stdout.trim() || 'main';
      } catch {
        return 'main'; // Default fallback
      }
    }
  }

  /**
   * Get ahead/behind count for current branch
   */
  private async getAheadBehind(): Promise<{ ahead: number; behind: number }> {
    try {
      const result = await execAsync('git rev-list --count --left-right @{upstream}...HEAD', { cwd: this.cwd });
      const [behind, ahead] = result.stdout.trim().split('\t').map(Number);
      return { ahead: ahead || 0, behind: behind || 0 };
    } catch {
      return { ahead: 0, behind: 0 };
    }
  }

  /**
   * Analyze code changes to determine commit type
   */
  async analyzeChanges(): Promise<SmartCommitInfo> {
    try {
      const status = await this.getStatus();
      const allFiles = [...status.staged, ...status.modified, ...status.untracked];

      if (allFiles.length === 0) {
        throw new Error('No changes detected');
      }

      const diffs = await this.getDetailedDiffs(allFiles);
      const changeType = this.determineChangeType(diffs);
      const commitPrefix = this.getCommitPrefix(changeType);

      const summary = this.generateChangeSummary(diffs);
      const commitMessage = this.generateCommitMessage(changeType, summary, diffs);

      return {
        changeType,
        commitPrefix,
        commitMessage,
        files: diffs,
        summary
      };
    } catch (error) {
      throw new Error(`Failed to analyze changes: ${error}`);
    }
  }

  /**
   * Get detailed diff information for files
   */
  private async getDetailedDiffs(files: string[]): Promise<CodeDiff[]> {
    const diffs: CodeDiff[] = [];

    for (const file of files) {
      try {
        let changeType: CodeDiff['changeType'] = 'modified';
        let additions = 0;
        let deletions = 0;
        let content = '';

        // Check if file exists (to determine if it's new or deleted)
        const fileExists = await fs.pathExists(path.join(this.cwd, file));

        if (!fileExists) {
          changeType = 'deleted';
        } else {
          // Check if file is tracked
          try {
            await execAsync(`git ls-files --error-unmatch "${file}"`, { cwd: this.cwd });
            changeType = 'modified';
          } catch {
            changeType = 'added';
          }
        }

        // Get diff stats if possible
        if (changeType !== 'added') {
          try {
            const diffResult = await execAsync(`git diff --numstat "${file}"`, { cwd: this.cwd });
            if (diffResult.stdout.trim()) {
              const [add, del] = diffResult.stdout.trim().split('\t').map(Number);
              additions = add || 0;
              deletions = del || 0;
            }
          } catch {
            // Ignore diff errors for untracked files
          }
        }

        // Get file content for analysis (first 1000 chars)
        if (fileExists) {
          try {
            const fullContent = await fs.readFile(path.join(this.cwd, file), 'utf8');
            content = fullContent.substring(0, 1000);
          } catch {
            // Ignore read errors
          }
        }

        diffs.push({
          file,
          additions,
          deletions,
          changeType,
          language: this.detectLanguage(file),
          content
        });
      } catch (error) {
        console.warn(`Warning: Could not analyze ${file}: ${error}`);
      }
    }

    return diffs;
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(file: string): string {
    const ext = path.extname(file).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sql': 'sql',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less'
    };
    return langMap[ext] || 'text';
  }

  /**
   * Determine the type of changes (feat, fix, docs, etc.)
   */
  private determineChangeType(diffs: CodeDiff[]): string {
    const files = diffs.map(d => d.file.toLowerCase());
    const content = diffs.map(d => d.content?.toLowerCase() || '').join(' ');

    // Documentation changes
    if (files.some(f => f.includes('readme') || f.includes('docs/') || f.includes('.md'))) {
      return 'docs';
    }

    // Test changes
    if (files.some(f => f.includes('test') || f.includes('spec') || f.includes('__tests__'))) {
      return 'test';
    }

    // Configuration changes
    if (files.some(f => f.includes('config') || f.includes('.json') || f.includes('.yml') || f.includes('.yaml'))) {
      return 'chore';
    }

    // Style changes (CSS, formatting, etc.)
    if (files.some(f => f.includes('.css') || f.includes('.scss') || f.includes('.less'))) {
      return 'style';
    }

    // Build/CI changes
    if (files.some(f => f.includes('package.json') || f.includes('.github/') || f.includes('webpack') || f.includes('babel'))) {
      return 'chore';
    }

    // Bug fixes (look for fix-related keywords)
    if (content.includes('fix') || content.includes('bug') || content.includes('error') || content.includes('issue')) {
      return 'fix';
    }

    // Refactoring (look for refactor keywords)
    if (content.includes('refactor') || content.includes('restructur') || content.includes('reorganiz')) {
      return 'refactor';
    }

    // New files or significant additions suggest features
    const newFiles = diffs.filter(d => d.changeType === 'added').length;
    const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0);
    const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0);

    if (newFiles > 0 || totalAdditions > totalDeletions * 2) {
      return 'feat';
    }

    // Default to feat for ambiguous changes
    return 'feat';
  }

  /**
   * Get commit prefix based on change type
   */
  private getCommitPrefix(changeType: string): string {
    const prefixMap: Record<string, string> = {
      feat: 'feat:',
      fix: 'fix:',
      docs: 'docs:',
      style: 'style:',
      refactor: 'refactor:',
      test: 'test:',
      chore: 'chore:'
    };
    return prefixMap[changeType] || 'feat:';
  }

  /**
   * Generate a summary of changes
   */
  private generateChangeSummary(diffs: CodeDiff[]): string {
    const totalFiles = diffs.length;
    const additions = diffs.reduce((sum, d) => sum + d.additions, 0);
    const deletions = diffs.reduce((sum, d) => sum + d.deletions, 0);
    const languages = [...new Set(diffs.map(d => d.language).filter(Boolean))];

    const newFiles = diffs.filter(d => d.changeType === 'added').length;
    const modifiedFiles = diffs.filter(d => d.changeType === 'modified').length;
    const deletedFiles = diffs.filter(d => d.changeType === 'deleted').length;

    let summary = `${totalFiles} file${totalFiles !== 1 ? 's' : ''} changed`;

    if (newFiles > 0) summary += `, ${newFiles} added`;
    if (modifiedFiles > 0) summary += `, ${modifiedFiles} modified`;
    if (deletedFiles > 0) summary += `, ${deletedFiles} deleted`;

    if (additions > 0) summary += `, +${additions} lines`;
    if (deletions > 0) summary += `, -${deletions} lines`;

    if (languages.length > 0) {
      summary += ` (${languages.join(', ')})`;
    }

    return summary;
  }

  /**
   * Generate smart commit message
   */
  private generateCommitMessage(changeType: string, _summary: string, diffs: CodeDiff[]): string {
    const files = diffs.map(d => path.basename(d.file));
    const mainFiles = files.slice(0, 3); // Show first 3 files
    const moreCount = files.length - 3;

    let description = '';

    switch (changeType) {
      case 'feat':
        description = this.generateFeatureDescription(diffs);
        break;
      case 'fix':
        description = this.generateFixDescription(diffs);
        break;
      case 'docs':
        description = `update documentation for ${mainFiles.join(', ')}`;
        break;
      case 'refactor':
        description = `restructure ${mainFiles.join(', ')}`;
        break;
      case 'style':
        description = `improve styling in ${mainFiles.join(', ')}`;
        break;
      case 'test':
        description = `add/update tests for ${mainFiles.join(', ')}`;
        break;
      default:
        description = `update ${mainFiles.join(', ')}`;
    }

    if (moreCount > 0) {
      description += ` and ${moreCount} more file${moreCount !== 1 ? 's' : ''}`;
    }

    const prefix = this.getCommitPrefix(changeType);
    return `${prefix} ${description}`;
  }

  /**
   * Generate feature description based on file changes
   */
  private generateFeatureDescription(diffs: CodeDiff[]): string {
    const newFiles = diffs.filter(d => d.changeType === 'added');
    const modifiedFiles = diffs.filter(d => d.changeType === 'modified');

    if (newFiles.length > 0) {
      const fileNames = newFiles.map(f => path.basename(f.file, path.extname(f.file)));
      return `add ${fileNames.join(', ')} feature${fileNames.length !== 1 ? 's' : ''}`;
    }

    if (modifiedFiles.length > 0) {
      const fileNames = modifiedFiles.map(f => path.basename(f.file, path.extname(f.file)));
      return `enhance ${fileNames.join(', ')} functionality`;
    }

    return 'add new functionality';
  }

  /**
   * Generate fix description based on file changes
   */
  private generateFixDescription(diffs: CodeDiff[]): string {
    const fileNames = diffs.map(f => path.basename(f.file, path.extname(f.file)));

    if (fileNames.some(name => name.includes('test'))) {
      return `fix test issues in ${fileNames.join(', ')}`;
    }

    if (fileNames.some(name => name.includes('config'))) {
      return `fix configuration in ${fileNames.join(', ')}`;
    }

    return `fix issues in ${fileNames.slice(0, 2).join(', ')}`;
  }

  /**
   * Create a smart commit with analysis
   */
  async createSmartCommit(options: {
    addAll?: boolean;
    push?: boolean;
    customMessage?: string;
  } = {}): Promise<{ message: string; analysis: SmartCommitInfo }> {
    try {
      // Add files if requested
      if (options.addAll) {
        await execAsync('git add .', { cwd: this.cwd });
      }

      // Analyze changes
      const analysis = await this.analyzeChanges();

      // Use custom message or generated one
      const message = options.customMessage || analysis.commitMessage;

      // Create commit
      await execAsync(`git commit -m "${message}"`, { cwd: this.cwd });

      // Push if requested and we're ahead
      if (options.push) {
        const status = await this.getStatus();
        try {
          await execAsync(`git push origin ${status.branch}`, { cwd: this.cwd });
        } catch (error) {
          console.warn(`Warning: Could not push to ${status.branch}: ${error}`);
        }
      }

      return { message, analysis };
    } catch (error) {
      throw new Error(`Failed to create commit: ${error}`);
    }
  }

  /**
   * Check if we're in a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.cwd });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the default branch name
   */
  async getDefaultBranch(): Promise<string> {
    try {
      const result = await execAsync('git symbolic-ref refs/remotes/origin/HEAD', { cwd: this.cwd });
      return result.stdout.trim().replace('refs/remotes/origin/', '');
    } catch {
      // Fallback attempts
      try {
        const result = await execAsync('git remote show origin', { cwd: this.cwd });
        const match = result.stdout.match(/HEAD branch: (.+)/);
        return match ? match[1].trim() : 'main';
      } catch {
        return 'main';
      }
    }
  }
}