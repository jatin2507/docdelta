import * as fs from 'fs-extra';
import * as path from 'path';
import {
  DocumentationSection,
  DocType,
  GeneratedFile,
  GenerationResult,
  GenerationStats,
  ParsedModule,
  CodeChunk,
  DocDeltaConfig,
} from '../../types';
import { AIService } from '../../core/ai';
import { ConfigManager } from '../../config';

export class DocumentationGenerator {
  private config: DocDeltaConfig;
  private aiService: AIService;
  private outputDir: string;
  private stats: GenerationStats;

  constructor(config?: DocDeltaConfig) {
    this.config = config || ConfigManager.getInstance().getConfig();
    this.aiService = new AIService(this.config.ai);
    this.outputDir = this.config.outputDir;
    this.stats = {
      filesProcessed: 0,
      chunksAnalyzed: 0,
      tokensUsed: 0,
      timeElapsed: 0,
      errors: [],
    };
  }

  async generate(modules: ParsedModule[]): Promise<GenerationResult> {
    const startTime = Date.now();
    const sections: DocumentationSection[] = [];
    const files: GeneratedFile[] = [];

    await fs.ensureDir(this.outputDir);

    try {
      const overviewSection = await this.generateOverview(modules);
      sections.push(overviewSection);
      files.push(this.createFile('README.md', overviewSection, DocType.OVERVIEW));

      const architectureSection = await this.generateArchitecture(modules);
      sections.push(architectureSection);
      files.push(
        this.createFile('docs/architecture.md', architectureSection, DocType.ARCHITECTURE)
      );

      const apiDocs = await this.generateAPIReference(modules);
      sections.push(...apiDocs);
      apiDocs.forEach((doc) => {
        files.push(this.createFile(`docs/api/${doc.id}.md`, doc, DocType.API_REFERENCE));
      });

      const databaseDocs = await this.generateDatabaseDocs(modules);
      if (databaseDocs.length > 0) {
        sections.push(...databaseDocs);
        files.push(
          this.createFile(
            'docs/database.md',
            this.combineSections(databaseDocs),
            DocType.DATABASE
          )
        );
      }

      const moduleDocs = await this.generateModuleDocs(modules);
      sections.push(...moduleDocs);
      moduleDocs.forEach((doc) => {
        const moduleName = doc.metadata?.moduleName || doc.id;
        files.push(this.createFile(`docs/modules/${moduleName}.md`, doc, DocType.MODULE));
      });

      await this.writeFiles(files);

      this.stats.filesProcessed = modules.length;
      this.stats.chunksAnalyzed = modules.reduce((acc, m) => acc + m.chunks.length, 0);
      this.stats.tokensUsed = this.aiService.getTokenCount();
      this.stats.timeElapsed = Date.now() - startTime;
    } catch (error) {
      console.error('Documentation generation failed:', error);
      this.stats.errors.push(error instanceof Error ? error.message : String(error));
    }

    return { sections, files, stats: this.stats };
  }

  private async generateOverview(modules: ParsedModule[]): Promise<DocumentationSection> {
    const projectStructure = this.analyzeProjectStructure(modules);
    const chunks = modules.flatMap((m) => m.chunks).slice(0, 10);

    const result = await this.aiService.summarizeChunks({
      chunks,
      context: `Project structure: ${JSON.stringify(projectStructure, null, 2)}`,
      docType: DocType.OVERVIEW,
    });

    return {
      id: 'overview',
      type: DocType.OVERVIEW,
      title: 'Project Overview',
      content: result.summary,
      children: result.sections,
    };
  }

  private async generateArchitecture(modules: ParsedModule[]): Promise<DocumentationSection> {
    const dependencies = this.analyzeDependencies(modules);
    const chunks = this.extractArchitecturalChunks(modules);

    const result = await this.aiService.summarizeChunks({
      chunks,
      context: `Dependencies: ${JSON.stringify(dependencies, null, 2)}`,
      docType: DocType.ARCHITECTURE,
    });

    const diagram = await this.aiService.generateDiagram(chunks, 'flow');

    return {
      id: 'architecture',
      type: DocType.ARCHITECTURE,
      title: 'System Architecture',
      content: `${result.summary  }\n\n## Architecture Diagram\n\n${  diagram}`,
      children: result.sections,
      metadata: { dependencies, diagram },
    };
  }

  private async generateAPIReference(modules: ParsedModule[]): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];

    for (const module of modules) {
      const apiChunks = module.chunks.filter(
        (c) =>
          c.type === 'function' ||
          c.type === 'class' ||
          c.type === 'method' ||
          c.type === 'interface'
      );

      if (apiChunks.length > 0) {
        const result = await this.aiService.summarizeChunks({
          chunks: apiChunks,
          docType: DocType.API_REFERENCE,
        });

        sections.push({
          id: `api-${path.basename(module.path, path.extname(module.path))}`,
          type: DocType.API_REFERENCE,
          title: `API: ${module.name}`,
          content: result.summary,
          children: result.sections,
          metadata: { module: module.name, path: module.path },
        });
      }
    }

    return sections;
  }

  private async generateDatabaseDocs(modules: ParsedModule[]): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];
    const sqlModules = modules.filter((m) => m.language === 'sql');

    for (const module of sqlModules) {
      const dbChunks = module.chunks.filter(
        (c) => c.type === 'database_table' || c.type === 'database_schema'
      );

      if (dbChunks.length > 0) {
        const result = await this.aiService.summarizeChunks({
          chunks: dbChunks,
          docType: DocType.DATABASE,
        });

        sections.push({
          id: `db-${module.name}`,
          type: DocType.DATABASE,
          title: `Database: ${module.name}`,
          content: result.summary,
          children: result.sections,
          metadata: { schema: module.name, tables: dbChunks.map((c) => c.metadata?.name) },
        });
      }
    }

    return sections;
  }

  private async generateModuleDocs(modules: ParsedModule[]): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];

    for (const module of modules) {
      const result = await this.aiService.summarizeChunks({
        chunks: module.chunks,
        context: `Module: ${module.name}, Imports: ${module.imports.join(', ')}, Exports: ${module.exports.join(', ')}`,
        docType: DocType.MODULE,
      });

      sections.push({
        id: `module-${module.name}`,
        type: DocType.MODULE,
        title: module.name,
        content: result.summary,
        children: result.sections,
        metadata: {
          moduleName: module.name,
          path: module.path,
          language: module.language,
          imports: module.imports,
          exports: module.exports,
        },
      });
    }

    return sections;
  }

  private analyzeProjectStructure(modules: ParsedModule[]): Record<string, any> {
    const structure: Record<string, any> = {
      totalModules: modules.length,
      languages: [...new Set(modules.map((m) => m.language))],
      directories: [...new Set(modules.map((m) => path.dirname(m.path)))],
    };

    return structure;
  }

  private analyzeDependencies(modules: ParsedModule[]): Record<string, string[]> {
    const deps: Record<string, string[]> = {};

    modules.forEach((module) => {
      deps[module.path] = module.imports;
    });

    return deps;
  }

  private extractArchitecturalChunks(modules: ParsedModule[]): CodeChunk[] {
    const chunks: CodeChunk[] = [];

    modules.forEach((module) => {
      const mainChunks = module.chunks.filter(
        (c) => c.type === 'class' || c.type === 'interface' || c.type === 'module'
      );
      chunks.push(...mainChunks.slice(0, 3));
    });

    return chunks;
  }

  private combineSections(sections: DocumentationSection[]): DocumentationSection {
    const content = sections.map((s) => s.content).join('\n\n---\n\n');
    const children = sections.flatMap((s) => s.children || []);

    return {
      id: 'combined',
      type: sections[0]?.type || DocType.MODULE,
      title: 'Combined Documentation',
      content,
      children,
    };
  }

  private createFile(
    relativePath: string,
    section: DocumentationSection,
    type: DocType
  ): GeneratedFile {
    const content = this.formatMarkdown(section);

    return {
      path: path.join(this.outputDir, relativePath),
      content,
      type,
    };
  }

  private formatMarkdown(section: DocumentationSection): string {
    let markdown = `# ${section.title}\n\n`;
    markdown += `${section.content  }\n\n`;

    if (section.children && section.children.length > 0) {
      section.children.forEach((child) => {
        markdown += `## ${child.title}\n\n`;
        markdown += `${child.content  }\n\n`;
      });
    }

    if (section.metadata) {
      markdown += '\n---\n\n';
      markdown += '*Generated metadata:*\n\n';
      markdown += '```json\n';
      markdown += JSON.stringify(section.metadata, null, 2);
      markdown += '\n```\n';
    }

    return markdown;
  }

  private async writeFiles(files: GeneratedFile[]): Promise<void> {
    for (const file of files) {
      await fs.ensureDir(path.dirname(file.path));
      await fs.writeFile(file.path, file.content, 'utf8');
    }
  }

  getStats(): GenerationStats {
    return this.stats;
  }
}