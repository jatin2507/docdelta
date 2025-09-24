import { CodeChunk, DiffResult, ChunkMetadata } from '../../types';
import { diffLines, Change } from 'diff';
import * as crypto from 'crypto';

export class DiffEngine {
  private previousChunks: Map<string, CodeChunk>;
  private currentChunks: Map<string, CodeChunk>;
  private metadata: Map<string, ChunkMetadata>;

  constructor(metadata?: Map<string, ChunkMetadata>) {
    this.previousChunks = new Map();
    this.currentChunks = new Map();
    this.metadata = metadata || new Map();
  }

  setPreviousChunks(chunks: CodeChunk[]): void {
    this.previousChunks.clear();
    chunks.forEach((chunk) => {
      this.previousChunks.set(chunk.id, chunk);
    });
  }

  setCurrentChunks(chunks: CodeChunk[]): void {
    this.currentChunks.clear();
    chunks.forEach((chunk) => {
      this.currentChunks.set(chunk.id, chunk);
    });
  }

  computeDiff(): DiffResult {
    const added: CodeChunk[] = [];
    const modified: CodeChunk[] = [];
    const deleted: CodeChunk[] = [];
    const unchanged: CodeChunk[] = [];

    this.currentChunks.forEach((currentChunk, id) => {
      const previousChunk = this.previousChunks.get(id);

      if (!previousChunk) {
        added.push(currentChunk);
      } else if (this.hasChunkChanged(previousChunk, currentChunk)) {
        modified.push(currentChunk);
      } else {
        unchanged.push(currentChunk);
      }
    });

    this.previousChunks.forEach((previousChunk, id) => {
      if (!this.currentChunks.has(id)) {
        deleted.push(previousChunk);
      }
    });

    return { added, modified, deleted, unchanged };
  }

  private hasChunkChanged(previous: CodeChunk, current: CodeChunk): boolean {
    return previous.hash !== current.hash;
  }

  computeTextDiff(oldText: string, newText: string): Change[] {
    return diffLines(oldText, newText, { ignoreWhitespace: false });
  }

  generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  getChunkDiff(chunkId: string): { old?: CodeChunk; new?: CodeChunk; diff?: Change[] } {
    const oldChunk = this.previousChunks.get(chunkId);
    const newChunk = this.currentChunks.get(chunkId);

    if (!oldChunk && !newChunk) {
      return {};
    }

    if (oldChunk && newChunk) {
      const diff = this.computeTextDiff(oldChunk.content, newChunk.content);
      return { old: oldChunk, new: newChunk, diff };
    }

    return { old: oldChunk, new: newChunk };
  }

  getModifiedChunksWithContext(contextLines: number = 3): Map<string, string> {
    const result = new Map<string, string>();
    const diffResult = this.computeDiff();

    diffResult.modified.forEach((chunk) => {
      const chunkDiff = this.getChunkDiff(chunk.id);
      if (chunkDiff.diff) {
        const context = this.formatDiffWithContext(chunkDiff.diff, contextLines);
        result.set(chunk.id, context);
      }
    });

    return result;
  }

  private formatDiffWithContext(changes: Change[], contextLines: number): string {
    let result = '';
    let lineNumber = 0;

    changes.forEach((change) => {
      const lines = change.value.split('\n').filter((line) => line !== '');

      if (change.added) {
        lines.forEach((line) => {
          result += `+ ${line}\n`;
        });
      } else if (change.removed) {
        lines.forEach((line) => {
          result += `- ${line}\n`;
        });
      } else {
        const startIdx = Math.max(0, lines.length - contextLines);

        if (lineNumber === 0 && lines.length > contextLines) {
          lines.slice(0, contextLines).forEach((line) => {
            result += `  ${line}\n`;
          });
        } else if (lines.length > contextLines * 2) {
          lines.slice(startIdx, startIdx + contextLines).forEach((line) => {
            result += `  ${line}\n`;
          });
          result += '...\n';
          lines.slice(-contextLines).forEach((line) => {
            result += `  ${line}\n`;
          });
        } else {
          lines.forEach((line) => {
            result += `  ${line}\n`;
          });
        }
      }
      lineNumber++;
    });

    return result;
  }

  updateMetadata(chunk: CodeChunk, aiSummary?: string): void {
    const metadata: ChunkMetadata = {
      hash: chunk.hash,
      lastModified: new Date(),
      aiSummary,
      docReferences: [],
    };

    this.metadata.set(chunk.id, metadata);
  }

  getMetadata(chunkId: string): ChunkMetadata | undefined {
    return this.metadata.get(chunkId);
  }

  getAllMetadata(): Map<string, ChunkMetadata> {
    return this.metadata;
  }

  getChangedFiles(diffResult: DiffResult): Set<string> {
    const files = new Set<string>();

    [...diffResult.added, ...diffResult.modified, ...diffResult.deleted].forEach((chunk) => {
      files.add(chunk.filePath);
    });

    return files;
  }

  getChangeStatistics(diffResult: DiffResult): {
    added: number;
    modified: number;
    deleted: number;
    unchanged: number;
    total: number;
    filesChanged: number;
  } {
    const filesChanged = this.getChangedFiles(diffResult).size;

    return {
      added: diffResult.added.length,
      modified: diffResult.modified.length,
      deleted: diffResult.deleted.length,
      unchanged: diffResult.unchanged.length,
      total:
        diffResult.added.length +
        diffResult.modified.length +
        diffResult.deleted.length +
        diffResult.unchanged.length,
      filesChanged,
    };
  }
}