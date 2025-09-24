import { Language, ParsedModule } from '../../types';
import { TypeScriptParser } from './typescript-parser';
import { PythonParser } from './python-parser';
import { SQLParser } from './sql-parser';
import { MongoDBParser } from './mongodb-parser';
import { BaseParser } from './base';
import * as path from 'path';
import * as fs from 'fs-extra';

export class ParserFactory {
  private static parsers: Map<Language, BaseParser> = new Map<Language, BaseParser>([
    [Language.TYPESCRIPT, new TypeScriptParser()],
    [Language.JAVASCRIPT, new TypeScriptParser()],
    [Language.PYTHON, new PythonParser()],
    [Language.SQL, new SQLParser()],
  ]);

  static getParser(language: Language): BaseParser | null {
    return this.parsers.get(language) || null;
  }

  static getParserByExtension(filePath: string): BaseParser | null {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    // Check for MongoDB schema files
    if (fileName.includes('schema') || fileName.includes('model')) {
      if (ext === '.js' || ext === '.ts') {
        return new MongoDBParser();
      }
    }

    const languageMap: Record<string, Language> = {
      '.ts': Language.TYPESCRIPT,
      '.tsx': Language.TYPESCRIPT,
      '.js': Language.JAVASCRIPT,
      '.jsx': Language.JAVASCRIPT,
      '.py': Language.PYTHON,
      '.sql': Language.SQL,
    };

    const language = languageMap[ext];
    return language ? this.getParser(language) : null;
  }

  static async parseFile(filePath: string): Promise<ParsedModule | null> {
    const parser = this.getParserByExtension(filePath);
    if (!parser) {
      console.warn(`No parser found for file: ${filePath}`);
      return null;
    }

    try {
      const content = await fs.readFile(filePath, 'utf8');
      return await parser.parse(filePath, content);
    } catch (error) {
      console.error(`Failed to parse file ${filePath}:`, error);
      return null;
    }
  }

  static async parseDirectory(dirPath: string, patterns?: string[]): Promise<ParsedModule[]> {
    const { globby } = await import('globby');
    const defaultPatterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.sql',
    ];

    const files = await globby(patterns || defaultPatterns, {
      cwd: dirPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });

    const results = await Promise.all(files.map((file) => this.parseFile(file)));
    return results.filter((r): r is ParsedModule => r !== null);
  }
}

export { BaseParser } from './base';
export { TypeScriptParser } from './typescript-parser';
export { PythonParser } from './python-parser';
export { SQLParser } from './sql-parser';
export { MongoDBParser } from './mongodb-parser';