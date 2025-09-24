import { BaseParser } from './base';
import { CodeChunk, ChunkType, Language, ParsedModule } from '../../types';
import * as path from 'path';

export class MongoDBParser extends BaseParser {
  constructor() {
    super(Language.JAVASCRIPT);
  }

  async parse(filePath: string, content: string): Promise<ParsedModule> {
    const chunks = this.extractChunks(content, filePath);

    return {
      path: filePath,
      name: path.basename(filePath, path.extname(filePath)),
      language: this.language,
      chunks,
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      dependencies: [],
    };
  }

  extractChunks(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    // Extract Mongoose schemas
    const mongooseSchemas = this.extractMongooseSchemas(content, filePath);
    chunks.push(...mongooseSchemas);

    // Extract MongoDB collection definitions
    const collections = this.extractCollections(content, filePath);
    chunks.push(...collections);

    // Extract aggregation pipelines
    const pipelines = this.extractAggregationPipelines(content, filePath);
    chunks.push(...pipelines);

    // Extract indexes
    const indexes = this.extractIndexDefinitions(content, filePath);
    chunks.push(...indexes);

    // Extract validation rules
    const validations = this.extractValidationRules(content, filePath);
    chunks.push(...validations);

    return chunks;
  }

  private extractMongooseSchemas(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    // Pattern for Mongoose Schema
    const schemaRegex = /(?:const|let|var)\s+(\w+Schema)\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(([\s\S]*?)\n\}\s*(?:,\s*\{[^}]*\})?\s*\)/g;
    let match;

    while ((match = schemaRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const schemaContent = match[0];
      const fields = this.parseMongooseFields(match[2]);
      const lineNumbers = this.getLineNumbers(content, schemaContent);

      chunks.push({
        id: `${filePath}:schema:${schemaName}`,
        filePath,
        content: schemaContent,
        type: ChunkType.DATABASE_SCHEMA,
        language: this.language,
        startLine: lineNumbers.start,
        endLine: lineNumbers.end,
        hash: this.generateHash(schemaContent),
        metadata: {
          name: schemaName,
          schemaType: 'mongoose',
          fields,
          methods: this.extractSchemaMethods(content, schemaName),
          virtuals: this.extractSchemaVirtuals(content, schemaName),
          hooks: this.extractSchemaHooks(content, schemaName),
        },
      });
    }

    // Pattern for TypeScript interfaces used as schemas
    const interfaceRegex = /interface\s+(\w+)(?:Schema|Model|Document)\s*\{([^}]+)\}/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const interfaceContent = match[0];
      const fields = this.parseTypeScriptInterface(match[2]);
      const lineNumbers = this.getLineNumbers(content, interfaceContent);

      chunks.push({
        id: `${filePath}:interface:${interfaceName}`,
        filePath,
        content: interfaceContent,
        type: ChunkType.DATABASE_SCHEMA,
        language: this.language,
        startLine: lineNumbers.start,
        endLine: lineNumbers.end,
        hash: this.generateHash(interfaceContent),
        metadata: {
          name: interfaceName,
          schemaType: 'typescript-interface',
          fields,
        },
      });
    }

    return chunks;
  }

  private parseMongooseFields(schemaBody: string): any[] {
    const fields: any[] = [];
    const fieldRegex = /(\w+)\s*:\s*\{([^}]+)\}|(\w+)\s*:\s*([^,\n]+)/g;
    let match;

    while ((match = fieldRegex.exec(schemaBody)) !== null) {
      const fieldName = match[1] || match[3];
      const fieldDef = match[2] || match[4];

      if (fieldName) {
        const field: any = {
          name: fieldName,
          definition: fieldDef.trim(),
        };

        // Extract type
        const typeMatch = fieldDef.match(/type\s*:\s*([^,}]+)/);
        if (typeMatch) {
          field.type = typeMatch[1].trim();
        }

        // Check if required
        field.required = fieldDef.includes('required: true');

        // Extract default value
        const defaultMatch = fieldDef.match(/default\s*:\s*([^,}]+)/);
        if (defaultMatch) {
          field.default = defaultMatch[1].trim();
        }

        // Check for unique
        field.unique = fieldDef.includes('unique: true');

        // Check for index
        field.index = fieldDef.includes('index: true');

        // Extract ref for references
        const refMatch = fieldDef.match(/ref\s*:\s*['"]([^'"]+)['"]/);
        if (refMatch) {
          field.ref = refMatch[1];
        }

        fields.push(field);
      }
    }

    return fields;
  }

  private parseTypeScriptInterface(interfaceBody: string): any[] {
    const fields: any[] = [];
    const lines = interfaceBody.split('\n').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      const fieldMatch = line.match(/(\w+)(\?)?\s*:\s*([^;]+)/);
      if (fieldMatch) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[3].trim(),
          required: !fieldMatch[2],
        });
      }
    }

    return fields;
  }

  private extractCollections(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    // Pattern for model creation
    const modelRegex = /(?:const|let|var|export\s+const)\s+(\w+)\s*=\s*(?:mongoose\.)?model\s*(?:<[^>]+>)?\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+Schema)\s*(?:,\s*['"]([^'"]+)['"])?\s*\)/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const collectionName = match[4] || match[2];
      const schemaName = match[3];
      const lineNumbers = this.getLineNumbers(content, match[0]);

      chunks.push({
        id: `${filePath}:model:${modelName}`,
        filePath,
        content: match[0],
        type: ChunkType.DATABASE_TABLE,
        language: this.language,
        startLine: lineNumbers.start,
        endLine: lineNumbers.end,
        hash: this.generateHash(match[0]),
        metadata: {
          name: modelName,
          collection: collectionName,
          schema: schemaName,
          type: 'mongoose-model',
        },
      });
    }

    return chunks;
  }

  private extractAggregationPipelines(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    // Pattern for aggregation pipelines
    const pipelineRegex = /(?:const|let|var)\s+(\w+Pipeline)\s*=\s*\[([\s\S]*?)\];/g;
    let match;

    while ((match = pipelineRegex.exec(content)) !== null) {
      const pipelineName = match[1];
      const stages = this.parseAggregationStages(match[2]);
      const lineNumbers = this.getLineNumbers(content, match[0]);

      chunks.push({
        id: `${filePath}:pipeline:${pipelineName}`,
        filePath,
        content: match[0],
        type: ChunkType.DATABASE_SCHEMA,
        language: this.language,
        startLine: lineNumbers.start,
        endLine: lineNumbers.end,
        hash: this.generateHash(match[0]),
        metadata: {
          name: pipelineName,
          type: 'aggregation-pipeline',
          stages,
        },
      });
    }

    return chunks;
  }

  private parseAggregationStages(pipelineContent: string): string[] {
    const stages: string[] = [];
    const stageRegex = /\$\w+/g;
    const matches = pipelineContent.match(stageRegex);
    if (matches) {
      stages.push(...new Set(matches));
    }
    return stages;
  }

  private extractIndexDefinitions(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    // Pattern for index definitions
    const indexRegex = /(\w+Schema)\.index\s*\(\s*\{([^}]+)\}\s*(?:,\s*\{([^}]+)\})?\s*\)/g;
    let match;

    while ((match = indexRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const indexFields = match[2];
      const indexOptions = match[3] || '';
      const lineNumbers = this.getLineNumbers(content, match[0]);

      chunks.push({
        id: `${filePath}:index:${schemaName}:${lineNumbers.start}`,
        filePath,
        content: match[0],
        type: ChunkType.DATABASE_SCHEMA,
        language: this.language,
        startLine: lineNumbers.start,
        endLine: lineNumbers.end,
        hash: this.generateHash(match[0]),
        metadata: {
          schema: schemaName,
          type: 'index',
          fields: this.parseIndexFields(indexFields),
          options: this.parseIndexOptions(indexOptions),
        },
      });
    }

    return chunks;
  }

  private parseIndexFields(fieldsStr: string): any {
    const fields: any = {};
    const fieldRegex = /(\w+)\s*:\s*([^,}]+)/g;
    let match;

    while ((match = fieldRegex.exec(fieldsStr)) !== null) {
      fields[match[1]] = match[2].trim();
    }

    return fields;
  }

  private parseIndexOptions(optionsStr: string): any {
    if (!optionsStr) return {};

    const options: any = {};
    const optionRegex = /(\w+)\s*:\s*([^,}]+)/g;
    let match;

    while ((match = optionRegex.exec(optionsStr)) !== null) {
      options[match[1]] = match[2].trim();
    }

    return options;
  }

  private extractValidationRules(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    // Pattern for validation rules
    const validationRegex = /validate\s*:\s*(?:\{([^}]+)\}|function[^{]*\{([^}]+)\})/g;

    let match;
    while ((match = validationRegex.exec(content)) !== null) {
      const validationContent = match[0];
      const lineNumbers = this.getLineNumbers(content, validationContent);

      chunks.push({
        id: `${filePath}:validation:${lineNumbers.start}`,
        filePath,
        content: validationContent,
        type: ChunkType.DATABASE_SCHEMA,
        language: this.language,
        startLine: lineNumbers.start,
        endLine: lineNumbers.end,
        hash: this.generateHash(validationContent),
        metadata: {
          type: 'validation-rule',
          content: match[1] || match[2],
        },
      });
    }

    return chunks;
  }

  private extractSchemaMethods(content: string, schemaName: string): string[] {
    const methods: string[] = [];
    const methodRegex = new RegExp(`${schemaName}\\.methods\\.(\\w+)`, 'g');
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      methods.push(match[1]);
    }

    return methods;
  }

  private extractSchemaVirtuals(content: string, schemaName: string): string[] {
    const virtuals: string[] = [];
    const virtualRegex = new RegExp(`${schemaName}\\.virtual\\(['"]([^'"]+)['"]\\)`, 'g');
    let match;

    while ((match = virtualRegex.exec(content)) !== null) {
      virtuals.push(match[1]);
    }

    return virtuals;
  }

  private extractSchemaHooks(content: string, schemaName: string): string[] {
    const hooks: string[] = [];
    const hookTypes = ['pre', 'post'];

    for (const hookType of hookTypes) {
      const hookRegex = new RegExp(`${schemaName}\\.${hookType}\\(['"]([^'"]+)['"]`, 'g');
      let match;

      while ((match = hookRegex.exec(content)) !== null) {
        hooks.push(`${hookType}:${match[1]}`);
      }
    }

    return hooks;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return [...new Set(imports)];
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|class|function)?\s*(\w+)/g;
    const moduleExportRegex = /module\.exports\s*=\s*(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    while ((match = moduleExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return [...new Set(exports)];
  }

  extractDependencies(content: string): string[] {
    return this.extractImports(content);
  }
}