import { BaseParser } from './base';
import { CodeChunk, ChunkType, Language, ParsedModule } from '../../types';
import * as path from 'path';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  constraints: string[];
  indexes: string[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export class SQLParser extends BaseParser {
  constructor() {
    super(Language.SQL);
  }

  async parse(filePath: string, content: string): Promise<ParsedModule> {
    const chunks = this.extractChunks(content, filePath);

    return {
      path: filePath,
      name: path.basename(filePath, path.extname(filePath)),
      language: this.language,
      chunks,
      imports: [],
      exports: chunks.map((c) => c.metadata?.name || '').filter(Boolean),
      dependencies: [],
    };
  }

  extractChunks(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    const tables = this.extractTables(content);
    tables.forEach((table) => {
      const tableChunk = this.createTableChunk(table, filePath, content);
      if (tableChunk) chunks.push(tableChunk);
    });

    const views = this.extractViews(content);
    views.forEach((view) => {
      const viewChunk = this.createViewChunk(view, filePath, content);
      if (viewChunk) chunks.push(viewChunk);
    });

    const procedures = this.extractProcedures(content);
    procedures.forEach((proc) => {
      const procChunk = this.createProcedureChunk(proc, filePath, content);
      if (procChunk) chunks.push(procChunk);
    });

    return chunks;
  }

  private extractTables(content: string): TableInfo[] {
    const tables: TableInfo[] = [];
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`'"]?\w+[`'"]?)\s*\(([\s\S]*?)\)(?:\s*ENGINE\s*=\s*\w+)?(?:\s*DEFAULT\s*CHARSET\s*=\s*\w+)?;/gi;
    let match;

    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1].replace(/[`'"]/g, '');
      const tableBody = match[2];

      const columns = this.parseColumns(tableBody);
      const constraints = this.parseConstraints(tableBody);
      const indexes = this.parseIndexes(tableBody);

      tables.push({
        name: tableName,
        columns,
        constraints,
        indexes,
      });
    }

    return tables;
  }

  private parseColumns(tableBody: string): ColumnInfo[] {
    const columns: ColumnInfo[] = [];
    const lines = tableBody.split(',').map((line) => line.trim());

    lines.forEach((line) => {
      if (
        !line.startsWith('PRIMARY KEY') &&
        !line.startsWith('FOREIGN KEY') &&
        !line.startsWith('UNIQUE') &&
        !line.startsWith('INDEX') &&
        !line.startsWith('KEY') &&
        !line.startsWith('CONSTRAINT')
      ) {
        const columnMatch = line.match(/^([`'"]?\w+[`'"]?)\s+(\w+(?:\([^)]+\))?)/);
        if (columnMatch) {
          const columnName = columnMatch[1].replace(/[`'"]/g, '');
          const columnType = columnMatch[2];

          columns.push({
            name: columnName,
            type: columnType,
            nullable: !line.toUpperCase().includes('NOT NULL'),
            defaultValue: this.extractDefault(line),
            isPrimaryKey: line.toUpperCase().includes('PRIMARY KEY'),
            isForeignKey: false,
          });
        }
      }
    });

    const foreignKeyRegex = /FOREIGN\s+KEY\s*\(([`'"]?\w+[`'"]?)\)/gi;
    let fkMatch;
    while ((fkMatch = foreignKeyRegex.exec(tableBody)) !== null) {
      const fkColumn = fkMatch[1].replace(/[`'"]/g, '');
      const column = columns.find((c) => c.name === fkColumn);
      if (column) column.isForeignKey = true;
    }

    const primaryKeyRegex = /PRIMARY\s+KEY\s*\(([^)]+)\)/i;
    const pkMatch = tableBody.match(primaryKeyRegex);
    if (pkMatch) {
      const pkColumns = pkMatch[1].split(',').map((c) => c.trim().replace(/[`'"]/g, ''));
      pkColumns.forEach((pkCol) => {
        const column = columns.find((c) => c.name === pkCol);
        if (column) column.isPrimaryKey = true;
      });
    }

    return columns;
  }

  private extractDefault(line: string): string | undefined {
    const defaultMatch = line.match(/DEFAULT\s+([^,\s]+)/i);
    return defaultMatch ? defaultMatch[1] : undefined;
  }

  private parseConstraints(tableBody: string): string[] {
    const constraints: string[] = [];
    const constraintRegex = /CONSTRAINT\s+([`'"]?\w+[`'"]?)\s+([^,]+)/gi;
    let match;

    while ((match = constraintRegex.exec(tableBody)) !== null) {
      constraints.push(`${match[1]}: ${match[2]}`);
    }

    return constraints;
  }

  private parseIndexes(tableBody: string): string[] {
    const indexes: string[] = [];
    const indexRegex = /(?:INDEX|KEY)\s+([`'"]?\w+[`'"]?)\s*\(([^)]+)\)/gi;
    let match;

    while ((match = indexRegex.exec(tableBody)) !== null) {
      indexes.push(`${match[1]}: (${match[2]})`);
    }

    return indexes;
  }

  private extractViews(content: string): { name: string; definition: string }[] {
    const views: { name: string; definition: string }[] = [];
    const viewRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+([`'"]?\w+[`'"]?)\s+AS\s+([\s\S]*?);/gi;
    let match;

    while ((match = viewRegex.exec(content)) !== null) {
      views.push({
        name: match[1].replace(/[`'"]/g, ''),
        definition: match[0],
      });
    }

    return views;
  }

  private extractProcedures(content: string): { name: string; definition: string }[] {
    const procedures: { name: string; definition: string }[] = [];
    const procRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:PROCEDURE|FUNCTION)\s+([`'"]?\w+[`'"]?)\s*\([^)]*\)[\s\S]*?END\s*;/gi;
    let match;

    while ((match = procRegex.exec(content)) !== null) {
      procedures.push({
        name: match[1].replace(/[`'"]/g, ''),
        definition: match[0],
      });
    }

    return procedures;
  }

  private createTableChunk(table: TableInfo, filePath: string, content: string): CodeChunk | null {
    const tableRegex = new RegExp(
      `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?[\\\`'"]?${table.name}[\\\`'"]?[\\s\\S]*?;`,
      'gi'
    );
    const match = content.match(tableRegex);

    if (!match) return null;

    const tableContent = match[0];
    const lineNumbers = this.getLineNumbers(content, tableContent);

    return {
      id: `${filePath}:table:${table.name}`,
      filePath,
      content: tableContent,
      type: ChunkType.DATABASE_TABLE,
      language: this.language,
      startLine: lineNumbers.start,
      endLine: lineNumbers.end,
      hash: this.generateHash(tableContent),
      metadata: {
        name: table.name,
        columns: table.columns,
        constraints: table.constraints,
        indexes: table.indexes,
      },
    };
  }

  private createViewChunk(
    view: { name: string; definition: string },
    filePath: string,
    content: string
  ): CodeChunk {
    const lineNumbers = this.getLineNumbers(content, view.definition);

    return {
      id: `${filePath}:view:${view.name}`,
      filePath,
      content: view.definition,
      type: ChunkType.DATABASE_SCHEMA,
      language: this.language,
      startLine: lineNumbers.start,
      endLine: lineNumbers.end,
      hash: this.generateHash(view.definition),
      metadata: {
        name: view.name,
        type: 'VIEW',
      },
    };
  }

  private createProcedureChunk(
    proc: { name: string; definition: string },
    filePath: string,
    content: string
  ): CodeChunk {
    const lineNumbers = this.getLineNumbers(content, proc.definition);

    return {
      id: `${filePath}:procedure:${proc.name}`,
      filePath,
      content: proc.definition,
      type: ChunkType.DATABASE_SCHEMA,
      language: this.language,
      startLine: lineNumbers.start,
      endLine: lineNumbers.end,
      hash: this.generateHash(proc.definition),
      metadata: {
        name: proc.name,
        type: 'PROCEDURE',
      },
    };
  }

  extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    const foreignKeyRegex = /FOREIGN\s+KEY\s*\([^)]+\)\s*REFERENCES\s+([`'"]?\w+[`'"]?)/gi;
    let match;

    while ((match = foreignKeyRegex.exec(content)) !== null) {
      dependencies.push(match[1].replace(/[`'"]/g, ''));
    }

    return [...new Set(dependencies)];
  }
}