import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { ChunkMetadata, ProjectMetadata, DocDeltaConfig, CodeChunk } from '../../types';
import { ConfigManager } from '../../config';

export class MetadataManager {
  private metadataDir: string;
  private cacheDir: string;
  private projectMetadata: ProjectMetadata | null = null;
  private config: DocDeltaConfig;

  constructor(config?: DocDeltaConfig) {
    this.config = config || ConfigManager.getInstance().getConfig();
    this.metadataDir = path.join(
      process.cwd(),
      this.config.metadata?.dir || '.metadata'
    );
    this.cacheDir = path.join(
      process.cwd(),
      this.config.metadata?.cacheDir || '.docdelta-cache'
    );
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.metadataDir);
    await fs.ensureDir(this.cacheDir);
    await this.loadProjectMetadata();
  }

  async loadProjectMetadata(): Promise<ProjectMetadata> {
    const metadataFile = path.join(this.metadataDir, 'project.json');

    if (await fs.pathExists(metadataFile)) {
      try {
        const data = await fs.readJson(metadataFile);
        this.projectMetadata = {
          ...data,
          lastGenerated: new Date(data.lastGenerated),
          chunks: new Map(Object.entries(data.chunks).map(([k, v]: [string, any]) => [
            k,
            {
              ...v,
              lastModified: new Date(v.lastModified),
            },
          ])),
        };
      } catch (error) {
        console.error('Failed to load project metadata:', error);
        this.projectMetadata = this.createDefaultMetadata();
      }
    } else {
      this.projectMetadata = this.createDefaultMetadata();
    }

    return this.projectMetadata!;
  }

  private createDefaultMetadata(): ProjectMetadata {
    return {
      version: '1.0.0',
      lastGenerated: new Date(),
      chunks: new Map(),
      configuration: this.config,
    };
  }

  async saveProjectMetadata(): Promise<void> {
    if (!this.projectMetadata) return;

    const metadataFile = path.join(this.metadataDir, 'project.json');
    const data = {
      ...this.projectMetadata,
      chunks: Object.fromEntries(this.projectMetadata.chunks),
    };

    await fs.writeJson(metadataFile, data, { spaces: 2 });
  }

  async getChunkMetadata(chunkId: string): Promise<ChunkMetadata | undefined> {
    if (!this.projectMetadata) {
      await this.loadProjectMetadata();
    }
    return this.projectMetadata?.chunks.get(chunkId);
  }

  async updateChunkMetadata(chunk: CodeChunk, aiSummary?: string): Promise<void> {
    if (!this.projectMetadata) {
      await this.loadProjectMetadata();
    }

    const metadata: ChunkMetadata = {
      hash: chunk.hash,
      lastModified: new Date(),
      aiSummary,
      docReferences: [],
    };

    this.projectMetadata!.chunks.set(chunk.id, metadata);
    await this.saveProjectMetadata();
  }

  async updateChunksMetadata(chunks: CodeChunk[], summaries?: Map<string, string>): Promise<void> {
    if (!this.projectMetadata) {
      await this.loadProjectMetadata();
    }

    chunks.forEach((chunk) => {
      const aiSummary = summaries?.get(chunk.id);
      const metadata: ChunkMetadata = {
        hash: chunk.hash,
        lastModified: new Date(),
        aiSummary,
        docReferences: [],
      };
      this.projectMetadata!.chunks.set(chunk.id, metadata);
    });

    await this.saveProjectMetadata();
  }

  async hasChunkChanged(chunk: CodeChunk): Promise<boolean> {
    const metadata = await this.getChunkMetadata(chunk.id);
    if (!metadata) return true;
    return metadata.hash !== chunk.hash;
  }

  async getChangedChunks(chunks: CodeChunk[]): Promise<CodeChunk[]> {
    const changed: CodeChunk[] = [];

    for (const chunk of chunks) {
      if (await this.hasChunkChanged(chunk)) {
        changed.push(chunk);
      }
    }

    return changed;
  }

  async cacheFile(key: string, content: string): Promise<void> {
    if (!this.config.metadata?.enableCache) return;

    const hash = this.generateHash(key);
    const cacheFile = path.join(this.cacheDir, `${hash}.cache`);

    await fs.writeJson(cacheFile, {
      key,
      content,
      timestamp: Date.now(),
    });
  }

  async getCachedFile(key: string): Promise<string | null> {
    if (!this.config.metadata?.enableCache) return null;

    const hash = this.generateHash(key);
    const cacheFile = path.join(this.cacheDir, `${hash}.cache`);

    if (await fs.pathExists(cacheFile)) {
      try {
        const data = await fs.readJson(cacheFile);
        const age = Date.now() - data.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (age < maxAge) {
          return data.content;
        } else {
          await fs.remove(cacheFile);
        }
      } catch (error) {
        console.error('Failed to read cache:', error);
      }
    }

    return null;
  }

  async clearCache(): Promise<void> {
    await fs.emptyDir(this.cacheDir);
  }

  async getFileMetadata(filePath: string): Promise<{
    hash: string;
    lastModified: Date;
    size: number;
  }> {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const hash = this.generateHash(content);

    return {
      hash,
      lastModified: stats.mtime,
      size: stats.size,
    };
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async addDocReference(chunkId: string, docPath: string): Promise<void> {
    const metadata = await this.getChunkMetadata(chunkId);
    if (metadata) {
      if (!metadata.docReferences) {
        metadata.docReferences = [];
      }
      if (!metadata.docReferences.includes(docPath)) {
        metadata.docReferences.push(docPath);
        this.projectMetadata!.chunks.set(chunkId, metadata);
        await this.saveProjectMetadata();
      }
    }
  }

  async getStatistics(): Promise<{
    totalChunks: number;
    documentedChunks: number;
    lastGenerated: Date | null;
    cacheSize: number;
  }> {
    if (!this.projectMetadata) {
      await this.loadProjectMetadata();
    }

    const totalChunks = this.projectMetadata!.chunks.size;
    const documentedChunks = Array.from(this.projectMetadata!.chunks.values()).filter(
      (m) => m.aiSummary
    ).length;

    let cacheSize = 0;
    if (await fs.pathExists(this.cacheDir)) {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        const stats = await fs.stat(path.join(this.cacheDir, file));
        cacheSize += stats.size;
      }
    }

    return {
      totalChunks,
      documentedChunks,
      lastGenerated: this.projectMetadata!.lastGenerated,
      cacheSize,
    };
  }

  async exportMetadata(outputPath: string): Promise<void> {
    if (!this.projectMetadata) {
      await this.loadProjectMetadata();
    }

    const exportData = {
      ...this.projectMetadata,
      chunks: Object.fromEntries(this.projectMetadata!.chunks),
      exportDate: new Date(),
    };

    await fs.writeJson(outputPath, exportData, { spaces: 2 });
  }

  async importMetadata(inputPath: string): Promise<void> {
    const data = await fs.readJson(inputPath);

    this.projectMetadata = {
      ...data,
      lastGenerated: new Date(data.lastGenerated),
      chunks: new Map(Object.entries(data.chunks).map(([k, v]: [string, any]) => [
        k,
        {
          ...v,
          lastModified: new Date(v.lastModified),
        },
      ])),
    };

    await this.saveProjectMetadata();
  }

  async reset(): Promise<void> {
    await fs.emptyDir(this.metadataDir);
    await fs.emptyDir(this.cacheDir);
    this.projectMetadata = this.createDefaultMetadata();
    await this.saveProjectMetadata();
  }
}