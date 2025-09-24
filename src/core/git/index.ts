import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import * as path from 'path';
import { GitConfig } from '../../types';
import { AIService } from '../../core/ai';
import { ConfigManager } from '../../config';

export class GitService {
  private git: SimpleGit;
  private config: GitConfig;
  private aiService: AIService;
  private workingDir: string;

  constructor(workingDir?: string, config?: GitConfig) {
    this.workingDir = workingDir || process.cwd();
    this.git = simpleGit(this.workingDir);
    this.config = config || ConfigManager.getInstance().getConfig().git || {
      enabled: true,
      autoPush: false,
      remote: 'origin',
      branch: 'main',
      commitPrefix: 'docs:',
    };
    this.aiService = new AIService();
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  async initRepository(): Promise<void> {
    if (!(await this.isGitRepository())) {
      await this.git.init();
      console.log('Initialized git repository');
    }
  }

  async getStatus(): Promise<StatusResult> {
    return await this.git.status();
  }

  async getModifiedFiles(): Promise<string[]> {
    const status = await this.getStatus();
    return [...status.modified, ...status.not_added];
  }

  async getStagedFiles(): Promise<string[]> {
    const status = await this.getStatus();
    return [...status.staged];
  }

  async stageFiles(files: string[]): Promise<void> {
    if (files.length === 0) return;
    await this.git.add(files);
  }

  async stageAll(): Promise<void> {
    await this.git.add('.');
  }

  async unstageFiles(files: string[]): Promise<void> {
    if (files.length === 0) return;
    await this.git.reset(['HEAD', ...files]);
  }

  async commit(message: string): Promise<string> {
    const commitMessage = this.config.commitPrefix ?
      `${this.config.commitPrefix} ${message}` :
      message;

    const result = await this.git.commit(commitMessage);
    return result.commit;
  }

  async generateAndCommit(changedFiles: string[]): Promise<string> {
    if (changedFiles.length === 0) {
      throw new Error('No files to commit');
    }

    const changes = changedFiles.map((file) => {
      const basename = path.basename(file);
      if (file.includes('api/')) return `Updated API documentation for ${basename}`;
      if (file.includes('modules/')) return `Updated module documentation for ${basename}`;
      if (file.includes('architecture')) return 'Updated architecture documentation';
      if (file.includes('database')) return 'Updated database documentation';
      if (file.includes('README')) return 'Updated project overview';
      return `Updated documentation for ${basename}`;
    });

    const aiGeneratedMessage = await this.aiService.generateCommitMessage(changes);
    const commitMessage = `${aiGeneratedMessage}\n\nFiles updated:\n${changedFiles.map((f) => `- ${f}`).join('\n')}`;

    await this.stageFiles(changedFiles);
    return await this.commit(commitMessage);
  }

  async push(force: boolean = false): Promise<void> {
    const branch = await this.getCurrentBranch();
    const remote = this.config.remote || 'origin';

    if (force) {
      await this.git.push(remote, branch, ['--force']);
    } else {
      await this.git.push(remote, branch);
    }
  }

  async pull(): Promise<void> {
    const branch = await this.getCurrentBranch();
    const remote = this.config.remote || 'origin';
    await this.git.pull(remote, branch);
  }

  async getCurrentBranch(): Promise<string> {
    const result = await this.git.branch();
    return result.current;
  }

  async checkout(branch: string, createNew: boolean = false): Promise<void> {
    if (createNew) {
      await this.git.checkoutLocalBranch(branch);
    } else {
      await this.git.checkout(branch);
    }
  }

  async getDiff(file?: string): Promise<string> {
    if (file) {
      return await this.git.diff([file]);
    }
    return await this.git.diff();
  }

  async getStagedDiff(file?: string): Promise<string> {
    if (file) {
      return await this.git.diff(['--cached', file]);
    }
    return await this.git.diff(['--cached']);
  }

  async getLastCommit(): Promise<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }> {
    const log = await this.git.log(['-1']);
    const latest = log.latest;

    if (!latest) {
      throw new Error('No commits found');
    }

    return {
      hash: latest.hash,
      message: latest.message,
      author: `${latest.author_name} <${latest.author_email}>`,
      date: latest.date,
    };
  }

  async getFileHistory(file: string, limit: number = 10): Promise<any[]> {
    const log = await this.git.log({
      file,
      maxCount: limit,
    });

    return log.all.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: `${commit.author_name} <${commit.author_email}>`,
      date: commit.date,
    }));
  }

  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.getStatus();
    return !status.isClean();
  }

  async ensureCleanWorkingDirectory(): Promise<void> {
    if (await this.hasUncommittedChanges()) {
      throw new Error('Working directory has uncommitted changes. Please commit or stash them first.');
    }
  }

  async stash(message?: string): Promise<void> {
    if (message) {
      await this.git.stash(['save', message]);
    } else {
      await this.git.stash();
    }
  }

  async stashPop(): Promise<void> {
    await this.git.stash(['pop']);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  shouldAutoPush(): boolean {
    return this.config.autoPush || false;
  }
}