import { CodeChunk, Language, ParsedModule } from '../../types';
import * as crypto from 'crypto';

export abstract class BaseParser {
  protected language: Language;

  constructor(language: Language) {
    this.language = language;
  }

  abstract parse(filePath: string, content: string): Promise<ParsedModule>;

  abstract extractChunks(content: string, filePath: string): CodeChunk[];

  abstract extractDependencies(content: string): string[];

  protected generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  protected extractComments(content: string): string[] {
    const comments: string[] = [];
    const singleLineRegex = /\/\/.*$/gm;
    const multiLineRegex = /\/\*[\s\S]*?\*\//g;
    const pythonRegex = /#.*$/gm;
    const pythonDocstringRegex = /"""[\s\S]*?"""|'''[\s\S]*?'''/g;

    switch (this.language) {
      case Language.PYTHON:
        comments.push(...(content.match(pythonRegex) || []));
        comments.push(...(content.match(pythonDocstringRegex) || []));
        break;
      case Language.JAVASCRIPT:
      case Language.TYPESCRIPT:
      case Language.GO:
      case Language.RUST:
      case Language.JAVA:
      case Language.CPP:
        comments.push(...(content.match(singleLineRegex) || []));
        comments.push(...(content.match(multiLineRegex) || []));
        break;
    }

    return comments;
  }

  protected getLineNumbers(content: string, chunk: string): { start: number; end: number } {
    const lines = content.split('\n');
    const chunkLines = chunk.split('\n');
    let startLine = -1;

    for (let i = 0; i <= lines.length - chunkLines.length; i++) {
      let match = true;
      for (let j = 0; j < chunkLines.length; j++) {
        if (lines[i + j].trim() !== chunkLines[j].trim()) {
          match = false;
          break;
        }
      }
      if (match) {
        startLine = i + 1;
        break;
      }
    }

    return {
      start: startLine,
      end: startLine + chunkLines.length - 1,
    };
  }
}