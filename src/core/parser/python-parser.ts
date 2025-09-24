import { BaseParser } from './base';
import { CodeChunk, ChunkType, Language, ParsedModule, DependencyInfo } from '../../types';
import * as path from 'path';

export class PythonParser extends BaseParser {
  constructor() {
    super(Language.PYTHON);
  }

  async parse(filePath: string, content: string): Promise<ParsedModule> {
    const chunks = this.extractChunks(content, filePath);
    const imports = this.extractImports(content);
    const exports = this.extractExports(content);

    return {
      path: filePath,
      name: path.basename(filePath, path.extname(filePath)),
      language: this.language,
      chunks,
      imports,
      exports,
      dependencies: this.analyzeDependencies(content, filePath),
    };
  }

  extractChunks(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');

    const classRegex = /^class\s+(\w+)(?:\([^)]*\))?:/gm;
    const functionRegex = /^(?:async\s+)?def\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/gm;
    const variableRegex = /^(\w+)\s*=\s*(.+)$/gm;

    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const classChunk = this.extractClassChunk(content, match.index, className, filePath);
      if (classChunk) {
        chunks.push(classChunk);

        const classContent = classChunk.content;
        const methodRegex = /(\s+)(?:async\s+)?def\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/gm;
        let methodMatch;

        while ((methodMatch = methodRegex.exec(classContent)) !== null) {
          const indentation = methodMatch[1];
          const methodName = methodMatch[2];
          // Only process methods that are indented (part of the class)
          if (indentation.length >= 4) {
            const methodChunk = this.extractMethodChunk(
              classContent,
              methodMatch.index,
              methodName,
              className,
              filePath,
              classChunk.startLine - 1
            );
            if (methodChunk) {
              chunks.push(methodChunk);
            }
          }
        }
      }
    }

    functionRegex.lastIndex = 0;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1];
      const lineIndex = content.substring(0, match.index).split('\n').length - 1;

      if (!this.isMethodInClass(lines, lineIndex)) {
        const funcChunk = this.extractFunctionChunk(content, match.index, funcName, filePath);
        if (funcChunk) {
          chunks.push(funcChunk);
        }
      }
    }

    variableRegex.lastIndex = 0;
    while ((match = variableRegex.exec(content)) !== null) {
      const varName = match[1];
      if (varName === varName.toUpperCase() && varName.match(/^[A-Z_]+$/)) {
        const lineNumbers = this.getLineNumbers(content, match[0]);
        chunks.push({
          id: `${filePath}:${varName}`,
          filePath,
          content: match[0],
          type: ChunkType.VARIABLE,
          language: this.language,
          startLine: lineNumbers.start,
          endLine: lineNumbers.end,
          hash: this.generateHash(match[0]),
          metadata: { name: varName },
        });
      }
    }

    return chunks;
  }

  private isMethodInClass(lines: string[], lineIndex: number): boolean {
    if (lineIndex === 0) return false;
    const line = lines[lineIndex];
    return line.match(/^\s{4,}/) !== null;
  }

  private extractClassChunk(
    content: string,
    startIndex: number,
    className: string,
    filePath: string
  ): CodeChunk | null {
    const lines = content.split('\n');
    const startLine = content.substring(0, startIndex).split('\n').length;
    let endLine = startLine;
    let indentLevel = 0;

    // Find the indent level of the class definition (should be 0 or consistent)
    const classLine = lines[startLine - 1];
    indentLevel = classLine.search(/\S/);

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const currentIndent = line.search(/\S/);

      // Break if we find a non-empty line that's at the same or less indentation than the class
      if (line.trim() !== '' && currentIndent !== -1 && currentIndent <= indentLevel) {
        break;
      }
      endLine = i;
    }

    const chunkContent = lines.slice(startLine - 1, endLine + 1).join('\n');

    return {
      id: `${filePath}:${className}`,
      filePath,
      content: chunkContent,
      type: ChunkType.CLASS,
      language: this.language,
      startLine,
      endLine: endLine + 1,
      hash: this.generateHash(chunkContent),
      metadata: { name: className },
    };
  }

  private extractMethodChunk(
    classContent: string,
    startIndex: number,
    methodName: string,
    className: string,
    filePath: string,
    classStartLine: number
  ): CodeChunk | null {
    const lines = classContent.split('\n');
    const methodStartLine = classContent.substring(0, startIndex).split('\n').length;
    let endLine = methodStartLine;
    const methodIndent = lines[methodStartLine - 1].search(/\S/);

    for (let i = methodStartLine; i < lines.length; i++) {
      const line = lines[i];
      const currentIndent = line.search(/\S/);

      if (currentIndent !== -1 && currentIndent <= methodIndent && line.trim() !== '') {
        break;
      }
      endLine = i;
    }

    const chunkContent = lines.slice(methodStartLine - 1, endLine + 1).join('\n');

    return {
      id: `${filePath}:${className}.${methodName}`,
      filePath,
      content: chunkContent,
      type: ChunkType.METHOD,
      language: this.language,
      startLine: classStartLine + methodStartLine,
      endLine: classStartLine + endLine + 1,
      hash: this.generateHash(chunkContent),
      metadata: { name: `${className}.${methodName}`, className, methodName },
    };
  }

  private extractFunctionChunk(
    content: string,
    startIndex: number,
    funcName: string,
    filePath: string
  ): CodeChunk | null {
    const lines = content.split('\n');
    const startLine = content.substring(0, startIndex).split('\n').length;
    let endLine = startLine;
    const funcIndent = lines[startLine - 1].search(/\S/);

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const currentIndent = line.search(/\S/);

      if (currentIndent !== -1 && currentIndent <= funcIndent && line.trim() !== '') {
        break;
      }
      endLine = i;
    }

    const chunkContent = lines.slice(startLine - 1, endLine + 1).join('\n');

    return {
      id: `${filePath}:${funcName}`,
      filePath,
      content: chunkContent,
      type: ChunkType.FUNCTION,
      language: this.language,
      startLine,
      endLine: endLine + 1,
      hash: this.generateHash(chunkContent),
      metadata: { name: funcName },
    };
  }

  extractDependencies(content: string): string[] {
    const dependencies: string[] = [];

    // Handle "import module" statements
    const importRegex = /^import\s+([\w.]+)(?:\s+as\s+\w+)?$/gm;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const modules = match[1].split(',');
      modules.forEach(module => {
        const trimmed = module.trim();
        if (trimmed) {
          dependencies.push(trimmed.split(' as ')[0].trim());
        }
      });
    }

    // Handle "from module import ..." statements
    const fromImportRegex = /^from\s+([\w.]+)\s+import/gm;
    while ((match = fromImportRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  private extractImports(content: string): string[] {
    return this.extractDependencies(content);
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    const allRegex = /^__all__\s*=\s*\[(.*)\]/;
    const allMatch = content.match(allRegex);
    if (allMatch) {
      const exportList = allMatch[1];
      const items = exportList.match(/['"](\w+)['"]/g);
      if (items) {
        items.forEach((item) => {
          exports.push(item.replace(/['"]/g, ''));
        });
      }
    }

    const publicFuncRegex = /^def\s+([a-z]\w*)\s*\(/gm;
    let match;
    while ((match = publicFuncRegex.exec(content)) !== null) {
      if (!match[1].startsWith('_')) {
        exports.push(match[1]);
      }
    }

    const publicClassRegex = /^class\s+([A-Z]\w*)/gm;
    while ((match = publicClassRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return [...new Set(exports)];
  }

  private analyzeDependencies(content: string, filePath: string): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    const imports = this.extractImports(content);

    imports.forEach((imp) => {
      dependencies.push({
        source: filePath,
        target: imp,
        type: 'import',
      });
    });

    return dependencies;
  }
}