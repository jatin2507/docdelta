import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { BaseParser } from './base';
import { CodeChunk, ChunkType, Language, ParsedModule, DependencyInfo } from '../../types';
import * as path from 'path';

export class TypeScriptParser extends BaseParser {
  constructor() {
    super(Language.TYPESCRIPT);
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

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
      });

      traverse(ast, {
        FunctionDeclaration: (nodePath) => {
          const node = nodePath.node;
          if (node.id) {
            const chunk = this.createChunk(
              node,
              content,
              filePath,
              ChunkType.FUNCTION,
              node.id.name
            );
            if (chunk) chunks.push(chunk);
          }
        },
        ClassDeclaration: (nodePath) => {
          const node = nodePath.node;
          if (node.id) {
            const chunk = this.createChunk(
              node,
              content,
              filePath,
              ChunkType.CLASS,
              node.id.name
            );
            if (chunk) chunks.push(chunk);

            node.body.body.forEach((member) => {
              if (t.isClassMethod(member) && t.isIdentifier(member.key) && member.key.name !== 'constructor') {
                const methodChunk = this.createChunk(
                  member,
                  content,
                  filePath,
                  ChunkType.METHOD,
                  `${node.id!.name}.${member.key.name}`
                );
                if (methodChunk) chunks.push(methodChunk);
              }
            });
          }
        },
        TSInterfaceDeclaration: (nodePath) => {
          const node = nodePath.node;
          const chunk = this.createChunk(
            node,
            content,
            filePath,
            ChunkType.INTERFACE,
            node.id.name
          );
          if (chunk) chunks.push(chunk);
        },
        TSTypeAliasDeclaration: (nodePath) => {
          const node = nodePath.node;
          const chunk = this.createChunk(
            node,
            content,
            filePath,
            ChunkType.TYPE,
            node.id.name
          );
          if (chunk) chunks.push(chunk);
        },
        TSEnumDeclaration: (nodePath) => {
          const node = nodePath.node;
          const chunk = this.createChunk(
            node,
            content,
            filePath,
            ChunkType.ENUM,
            node.id.name
          );
          if (chunk) chunks.push(chunk);
        },
        VariableDeclaration: (nodePath) => {
          const node = nodePath.node;
          if (nodePath.parent.type === 'Program') {
            node.declarations.forEach((decl) => {
              if (t.isIdentifier(decl.id)) {
                const chunk = this.createChunk(
                  decl,
                  content,
                  filePath,
                  ChunkType.VARIABLE,
                  decl.id.name
                );
                if (chunk) chunks.push(chunk);
              }
            });
          }
        },
      });
    } catch (error) {
      console.error(`Failed to parse TypeScript file ${filePath}:`, error);
    }

    return chunks;
  }

  private createChunk(
    node: any,
    content: string,
    filePath: string,
    type: ChunkType,
    name: string
  ): CodeChunk | null {
    if (!node.loc) return null;

    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const lines = content.split('\n');
    const chunkContent = lines.slice(startLine - 1, endLine).join('\n');

    return {
      id: `${filePath}:${name}`,
      filePath,
      content: chunkContent,
      type,
      language: this.language,
      startLine,
      endLine,
      hash: this.generateHash(chunkContent),
      metadata: {
        name,
      },
    };
  }

  extractDependencies(content: string): string[] {
    const dependencies: string[] = [];

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      traverse(ast, {
        ImportDeclaration: (nodePath) => {
          dependencies.push(nodePath.node.source.value);
        },
        CallExpression: (nodePath) => {
          const node = nodePath.node;
          if (
            t.isIdentifier(node.callee, { name: 'require' }) &&
            node.arguments.length > 0 &&
            t.isStringLiteral(node.arguments[0])
          ) {
            dependencies.push(node.arguments[0].value);
          }
        },
      });
    } catch (error) {
      console.error('Failed to extract dependencies:', error);
    }

    return [...new Set(dependencies)];
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:(?:\{[^}]*\})|(?:\*\s+as\s+\w+)|(?:\w+))?\s*(?:,\s*(?:\{[^}]*\}|\w+))?\s*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      traverse(ast, {
        ExportNamedDeclaration: (nodePath) => {
          if (nodePath.node.declaration) {
            if (t.isFunctionDeclaration(nodePath.node.declaration) && nodePath.node.declaration.id) {
              exports.push(nodePath.node.declaration.id.name);
            } else if (t.isClassDeclaration(nodePath.node.declaration) && nodePath.node.declaration.id) {
              exports.push(nodePath.node.declaration.id.name);
            } else if (t.isVariableDeclaration(nodePath.node.declaration)) {
              nodePath.node.declaration.declarations.forEach((decl) => {
                if (t.isIdentifier(decl.id)) {
                  exports.push(decl.id.name);
                }
              });
            }
          }
          nodePath.node.specifiers.forEach((spec) => {
            if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
              exports.push(spec.exported.name);
            }
          });
        },
        ExportDefaultDeclaration: () => {
          exports.push('default');
        },
      });
    } catch (error) {
      console.error('Failed to extract exports:', error);
    }

    return exports;
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