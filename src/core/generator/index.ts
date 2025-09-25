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
import { ModularDocumentationGenerator } from './modular-docs-generator';

export class DocumentationGenerator {
  private config: DocDeltaConfig;
  private aiService: AIService;
  private outputDir: string;
  private stats: GenerationStats;
  private progressCallback?: (step: string, progress: number, total: number) => void;

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

  setProgressCallback(callback: (step: string, progress: number, total: number) => void): void {
    this.progressCallback = callback;
  }

  private updateProgress(step: string, progress: number, total: number): void {
    if (this.progressCallback) {
      this.progressCallback(step, progress, total);
    }
  }

  async generate(modules: ParsedModule[]): Promise<GenerationResult> {
    const startTime = Date.now();
    const sections: DocumentationSection[] = [];
    const files: GeneratedFile[] = [];
    const totalSteps = 6; // Overview, Architecture, API, Database, Modules, ModularDocs
    let currentStep = 0;

    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(path.join(this.outputDir, 'docs'));
    await fs.ensureDir(path.join(this.outputDir, 'docs', 'api'));
    await fs.ensureDir(path.join(this.outputDir, 'docs', 'modules'));

    try {
      // Step 1: Generate Overview (Write Immediately)
      this.updateProgress('Generating project overview...', ++currentStep, totalSteps);
      try {
        const overviewSection = await this.generateOverview(modules);
        sections.push(overviewSection);
        const overviewFile = this.createFile('README.md', overviewSection, DocType.OVERVIEW);
        await this.writeFileImmediately(overviewFile);
        files.push(overviewFile);
        console.log('✅ README.md generated successfully');
      } catch (error) {
        console.warn(`⚠️ Failed to generate overview, creating fallback...`);
        const fallbackOverview = this.createFallbackOverview(modules);
        sections.push(fallbackOverview);
        const fallbackFile = this.createFile('README.md', fallbackOverview, DocType.OVERVIEW);
        await this.writeFileImmediately(fallbackFile);
        files.push(fallbackFile);
        console.log('✅ README.md (fallback) generated successfully');
        this.stats.errors.push(`Overview generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 2: Generate Architecture (Write Immediately)
      this.updateProgress('Analyzing architecture...', ++currentStep, totalSteps);
      try {
        const architectureSection = await this.generateArchitecture(modules);
        sections.push(architectureSection);
        const archFile = this.createFile('docs/architecture.md', architectureSection, DocType.ARCHITECTURE);
        await this.writeFileImmediately(archFile);
        files.push(archFile);
        console.log('✅ docs/architecture.md generated successfully');
      } catch (error) {
        console.warn(`⚠️ Failed to generate architecture, creating fallback...`);
        const fallbackArchitecture = this.createFallbackArchitecture(modules);
        sections.push(fallbackArchitecture);
        const fallbackFile = this.createFile('docs/architecture.md', fallbackArchitecture, DocType.ARCHITECTURE);
        await this.writeFileImmediately(fallbackFile);
        files.push(fallbackFile);
        console.log('✅ docs/architecture.md (fallback) generated successfully');
        this.stats.errors.push(`Architecture generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 3: Generate API Reference (Write Immediately in Chunks)
      this.updateProgress('Creating API reference...', ++currentStep, totalSteps);
      try {
        const apiDocs = await this.generateAPIReferenceChunked(modules);
        sections.push(...apiDocs);
        for (const doc of apiDocs) {
          const apiFile = this.createFile(`docs/api/${doc.id}.md`, doc, DocType.API_REFERENCE);
          await this.writeFileImmediately(apiFile);
          files.push(apiFile);
          console.log(`✅ docs/api/${doc.id}.md generated successfully`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to generate API reference, creating fallback...`);
        const fallbackAPI = this.createFallbackAPIReference(modules);
        sections.push(...fallbackAPI);
        for (const doc of fallbackAPI) {
          const fallbackFile = this.createFile(`docs/api/${doc.id}.md`, doc, DocType.API_REFERENCE);
          await this.writeFileImmediately(fallbackFile);
          files.push(fallbackFile);
          console.log(`✅ docs/api/${doc.id}.md (fallback) generated successfully`);
        }
        this.stats.errors.push(`API reference generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 4: Generate Database Documentation (Write Immediately with Fallback)
      this.updateProgress('Documenting database schemas...', ++currentStep, totalSteps);
      try {
        const databaseDocs = await this.generateDatabaseDocs(modules);
        if (databaseDocs.length > 0) {
          sections.push(...databaseDocs);
          const dbFile = this.createFile(
            'docs/database.md',
            this.combineSections(databaseDocs),
            DocType.DATABASE
          );
          await this.writeFileImmediately(dbFile);
          files.push(dbFile);
          console.log('✅ docs/database.md generated successfully');
        } else {
          console.log('ℹ️ No database files found, skipping database documentation');
        }
      } catch (error) {
        console.warn(`⚠️ Database documentation failed, creating fallback...`);
        console.error(`Database error: ${error instanceof Error ? error.message : String(error)}`);
        const fallbackDB = this.createFallbackDatabaseDocs(modules);
        if (fallbackDB) {
          sections.push(fallbackDB);
          const fallbackFile = this.createFile('docs/database.md', fallbackDB, DocType.DATABASE);
          await this.writeFileImmediately(fallbackFile);
          files.push(fallbackFile);
          console.log('✅ docs/database.md (fallback) generated successfully');
        }
        this.stats.errors.push(`Database documentation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 5: Generate Module Documentation (Write Immediately in Chunks with Fallback)
      this.updateProgress(`Generating module documentation (${modules.length} modules)...`, ++currentStep, totalSteps);
      try {
        const moduleDocs = await this.generateModuleDocsChunked(modules);
        sections.push(...moduleDocs);
        for (const doc of moduleDocs) {
          try {
            const moduleName = doc.metadata?.moduleName || doc.id;
            const moduleFile = this.createFile(`docs/modules/${moduleName}.md`, doc, DocType.MODULE);
            await this.writeFileImmediately(moduleFile);
            files.push(moduleFile);
            console.log(`✅ docs/modules/${moduleName}.md generated successfully`);
          } catch (writeError) {
            console.error(`❌ Failed to write module file for ${doc.id}: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
            this.stats.errors.push(`Module file write failed for ${doc.id}: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Module documentation failed, creating fallback for all modules...`);
        console.error(`Module docs error: ${error instanceof Error ? error.message : String(error)}`);
        const fallbackModules = this.createFallbackModuleDocsForAll(modules);
        sections.push(...fallbackModules);
        for (const doc of fallbackModules) {
          try {
            const moduleName = doc.metadata?.moduleName || doc.id;
            const fallbackFile = this.createFile(`docs/modules/${moduleName}.md`, doc, DocType.MODULE);
            await this.writeFileImmediately(fallbackFile);
            files.push(fallbackFile);
            console.log(`✅ docs/modules/${moduleName}.md (fallback) generated successfully`);
          } catch (writeError) {
            console.error(`❌ Failed to write fallback module file for ${doc.id}: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
          }
        }
        this.stats.errors.push(`Module documentation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 5.5: Generate Enhanced Modular Documentation with Cross-linking
      this.updateProgress('Creating modular documentation with cross-references...', ++currentStep, totalSteps);
      try {
        const modularGenerator = new ModularDocumentationGenerator(this.config, this.aiService, this.outputDir);
        const modularFiles = await modularGenerator.generateModularDocumentation(modules);
        for (const modularFile of modularFiles) {
          await this.writeFileImmediately(modularFile);
          files.push(modularFile);
          console.log(`✅ ${path.relative(this.outputDir, modularFile.path)} generated successfully`);
        }
        console.log(`✅ Generated ${modularFiles.length} modular documentation files with cross-linking`);
      } catch (error) {
        console.warn(`⚠️ Enhanced modular documentation failed, skipping...`);
        console.error(`Modular docs error: ${error instanceof Error ? error.message : String(error)}`);
        this.stats.errors.push(`Enhanced modular documentation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 6: Complete (Files Already Written)
      this.updateProgress(`Documentation generation complete! ${files.length} files generated.`, totalSteps, totalSteps);
      console.log(`\n🎉 Documentation generation completed successfully!`);
      console.log(`📁 Generated ${files.length} files in ${this.outputDir}`);

      this.stats.filesProcessed = modules.length;
      this.stats.chunksAnalyzed = modules.reduce((acc, m) => acc + m.chunks.length, 0);
      this.stats.tokensUsed = this.aiService.getTokenCount();
      this.stats.timeElapsed = Date.now() - startTime;
    } catch (error) {
      console.error('💥 CRITICAL: Documentation generation failed completely:', error);
      this.stats.errors.push(`CRITICAL FAILURE: ${error instanceof Error ? error.message : String(error)}`);

      // Create absolute emergency documentation
      try {
        console.log('🚨 Creating absolute emergency documentation...');
        await fs.ensureDir(this.outputDir);

        const emergencyDoc = this.createAbsoluteEmergencyDocumentation(modules, error);
        const emergencyFile: GeneratedFile = {
          path: path.join(this.outputDir, 'EMERGENCY_README.md'),
          content: emergencyDoc.content,
          type: DocType.OVERVIEW
        };

        await fs.writeFile(emergencyFile.path, emergencyFile.content, 'utf8');
        files.push(emergencyFile);
        sections.push(emergencyDoc);
        console.log('✅ EMERGENCY_README.md created as last resort');

        this.stats.filesProcessed = modules.length;
        this.stats.timeElapsed = Date.now() - startTime;
      } catch (emergencyError) {
        console.error('💀 Even emergency documentation creation failed:', emergencyError);
        this.stats.errors.push(`ABSOLUTE FAILURE: ${emergencyError instanceof Error ? emergencyError.message : String(emergencyError)}`);
      }
    }

    // Always return something - never let the process completely fail
    if (sections.length === 0 && files.length === 0) {
      console.log('🔧 Creating minimal viable documentation...');
      const minimalDoc = this.createMinimalViableDocumentation(modules);
      sections.push(minimalDoc);
      files.push({
        path: path.join(this.outputDir, 'MINIMAL_README.md'),
        content: minimalDoc.content,
        type: DocType.OVERVIEW
      });
    }

    return { sections, files, stats: this.stats };
  }

  private async generateOverview(modules: ParsedModule[]): Promise<DocumentationSection> {
    const projectStructure = this.analyzeProjectStructure(modules);
    const allChunks = modules.flatMap((m) => m.chunks);

    // Limit chunks to prevent overly large prompts
    const chunks = this.chunkForPrompt(allChunks, 20000); // ~20K characters max

    console.log(`📊 Generating overview with ${chunks.length} chunks (${allChunks.length} total available)`);

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

  private chunkForPrompt(chunks: any[], maxLength: number = 20000): any[] {
    const result = [];
    let currentLength = 0;

    for (const chunk of chunks) {
      const chunkLength = chunk.content?.length || 0;
      if (currentLength + chunkLength > maxLength) {
        console.log(`⚠️ Prompt length limit reached (${currentLength}/${maxLength}), using ${result.length}/${chunks.length} chunks`);
        break;
      }
      result.push(chunk);
      currentLength += chunkLength;
    }

    return result.length > 0 ? result : chunks.slice(0, 5); // At least try with 5 chunks
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

  private async _generateAPIReference(modules: ParsedModule[]): Promise<DocumentationSection[]> {
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

  private async _generateModuleDocs(modules: ParsedModule[]): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];

    for (const module of modules) {
      // Skip modules with no chunks to avoid validation errors
      if (!module.chunks || module.chunks.length === 0) {
        console.warn(`⚠️  Skipping module ${module.name}: no code chunks found`);
        this.stats.errors.push(`Module ${module.name}: No extractable code chunks found`);
        continue;
      }

      try {
        const result = await this.aiService.summarizeChunks({
          chunks: module.chunks,
          context: `Module: ${module.name}, Imports: ${module.imports?.join(', ') || 'none'}, Exports: ${module.exports?.join(', ') || 'none'}`,
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
            imports: module.imports || [],
            exports: module.exports || [],
          },
        });

        console.log(`✅ Generated documentation for module: ${module.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`❌ Failed to generate documentation for module ${module.name}: ${errorMessage}`);
        this.stats.errors.push(`Module ${module.name}: ${errorMessage}`);

        // Continue processing other modules instead of failing completely
        continue;
      }
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

  private createFallbackOverview(modules: ParsedModule[]): DocumentationSection {
    const structure = this.analyzeProjectStructure(modules);
    const totalChunks = modules.reduce((acc, m) => acc + m.chunks.length, 0);

    const content = `# ${path.basename(process.cwd())} - Project Overview

## 📊 Project Statistics
- **Total Modules**: ${structure.totalModules}
- **Code Chunks**: ${totalChunks}
- **Languages**: ${structure.languages.join(', ')}
- **Directories**: ${structure.directories.length}

## 📁 Project Structure
${structure.directories.map((dir: string) => `- \`${dir}\``).join('\n')}

## 🔍 Language Breakdown
${structure.languages.map((lang: string) => {
  const langModules = modules.filter(m => m.language === lang);
  return `- **${lang}**: ${langModules.length} modules`;
}).join('\n')}

---
*Documentation generated automatically. AI generation failed - using fallback.*`;

    return {
      id: 'overview',
      type: DocType.OVERVIEW,
      title: 'Project Overview',
      content,
      children: [],
    };
  }

  private createFallbackArchitecture(modules: ParsedModule[]): DocumentationSection {
    const dependencies = this.analyzeDependencies(modules);

    const content = `# Architecture Overview

## 📦 Module Dependencies
${Object.entries(dependencies).map(([module, deps]) =>
  `### ${module}\n${deps.map(dep => `- ${dep}`).join('\n')}`
).join('\n\n')}

## 🏗️ System Structure
- **Total Modules**: ${modules.length}
- **Interconnected Components**: ${Object.keys(dependencies).length}

---
*Architecture documentation generated automatically. AI generation failed - using fallback.*`;

    return {
      id: 'architecture',
      type: DocType.ARCHITECTURE,
      title: 'Architecture Overview',
      content,
      children: [],
    };
  }

  private createFallbackAPIReference(modules: ParsedModule[]): DocumentationSection[] {
    const sections: DocumentationSection[] = [];

    for (const module of modules) {
      if (module.chunks.length === 0) continue;

      const functions = module.chunks.filter(c => c.type === 'function');
      const classes = module.chunks.filter(c => c.type === 'class');

      // Generate function flow diagram
      let flowDiagram = '';
      if (functions.length > 0) {
        flowDiagram = this.generateStaticFunctionFlowDiagram(functions);
      }

      const content = `# ${module.name} API Reference

## 📋 Module Information
- **File**: \`${module.path}\`
- **Language**: ${module.language}
- **Functions**: ${functions.length}
- **Classes**: ${classes.length}

${flowDiagram ? `## 🔄 Function Flow Diagram\n\n\`\`\`mermaid\n${flowDiagram}\n\`\`\`\n` : ''}

## 🔧 Functions
${functions.map(fn => `### ${fn.metadata?.name || 'Unknown'}
- **Type**: Function
- **Location**: Lines ${fn.startLine}-${fn.endLine}
- **Code**:
\`\`\`${module.language}
${fn.content}
\`\`\``).join('\n\n')}

## 📚 Classes
${classes.map(cls => `### ${cls.metadata?.name || 'Unknown'}
- **Type**: Class
- **Location**: Lines ${cls.startLine}-${cls.endLine}
- **Code**:
\`\`\`${module.language}
${cls.content}
\`\`\``).join('\n\n')}

---
*API reference generated automatically. AI generation failed - using fallback with static analysis.*`;

      sections.push({
        id: `api-${module.name}`,
        type: DocType.API_REFERENCE,
        title: `${module.name} API`,
        content,
        children: [],
        metadata: {
          moduleName: module.name,
          functions: functions.length,
          classes: classes.length
        }
      });
    }

    return sections;
  }

  private generateStaticFunctionFlowDiagram(functions: any[]): string {
    if (functions.length === 0) return '';

    const nodes = functions.map((fn, index) => {
      const name = fn.metadata?.name || `function_${index}`;
      const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      return { name, safeName, content: fn.content };
    });

    // Simple static analysis to find function calls
    const connections: string[] = [];

    nodes.forEach(node => {
      nodes.forEach(otherNode => {
        if (node.name !== otherNode.name &&
            node.content.includes(otherNode.name)) {
          connections.push(`    ${node.safeName} --> ${otherNode.safeName}`);
        }
      });
    });

    const diagram = `flowchart TD
${nodes.map(node => `    ${node.safeName}[${node.name}]`).join('\n')}
${connections.join('\n')}

    classDef default fill:#f9f,stroke:#333,stroke-width:2px
    classDef function fill:#bbf,stroke:#333,stroke-width:2px`;

    return diagram;
  }

  private generateASTChartsForAllModules(modules: ParsedModule[]): DocumentationSection[] {
    const astSections: DocumentationSection[] = [];

    console.log(`🌳 Generating AST charts for ${modules.length} modules...`);

    for (const module of modules) {
      if (!module.chunks || module.chunks.length === 0) continue;

      const astChart = this.generateModuleASTChart(module);
      if (astChart) {
        astSections.push(astChart);
      }
    }

    console.log(`✅ Generated ${astSections.length} AST charts`);
    return astSections;
  }

  private generateModuleASTChart(module: ParsedModule): DocumentationSection | null {
    const functions = module.chunks.filter(c => c.type === 'function');
    const classes = module.chunks.filter(c => c.type === 'class');
    const interfaces = module.chunks.filter(c => c.type === 'interface');
    const types = module.chunks.filter(c => c.type === 'type');

    if (functions.length === 0 && classes.length === 0 && interfaces.length === 0 && types.length === 0) {
      return null;
    }

    // Generate AST structure diagram
    const astDiagram = this.generateASTStructureDiagram(module);

    // Generate function flow diagram
    const flowDiagram = functions.length > 0 ? this.generateStaticFunctionFlowDiagram(functions) : '';

    const content = `# ${module.name} - AST Analysis

## 📊 AST Summary
- **File**: \`${module.path}\`
- **Language**: ${module.language}
- **Functions**: ${functions.length}
- **Classes**: ${classes.length}
- **Interfaces**: ${interfaces.length}
- **Types**: ${types.length}
- **Total AST Nodes**: ${module.chunks.length}

## 🌳 AST Structure Diagram

\`\`\`mermaid
${astDiagram}
\`\`\`

${flowDiagram ? `## 🔄 Function Flow Diagram\n\n\`\`\`mermaid\n${flowDiagram}\n\`\`\`\n` : ''}

## 📋 AST Node Details

### Functions (${functions.length})
${functions.map(fn => `- **${fn.metadata?.name || 'Anonymous'}** (Lines ${fn.startLine}-${fn.endLine})`).join('\n') || 'None'}

### Classes (${classes.length})
${classes.map(cls => `- **${cls.metadata?.name || 'Anonymous'}** (Lines ${cls.startLine}-${cls.endLine})`).join('\n') || 'None'}

### Interfaces (${interfaces.length})
${interfaces.map(iface => `- **${iface.metadata?.name || 'Anonymous'}** (Lines ${iface.startLine}-${iface.endLine})`).join('\n') || 'None'}

### Types (${types.length})
${types.map(type => `- **${type.metadata?.name || 'Anonymous'}** (Lines ${type.startLine}-${type.endLine})`).join('\n') || 'None'}

---
*AST analysis generated automatically using static code analysis.*`;

    return {
      id: `ast-${module.name}`,
      type: DocType.MODULE,
      title: `${module.name} AST`,
      content,
      children: [],
      metadata: {
        astNodes: module.chunks.length,
        functions: functions.length,
        classes: classes.length,
        interfaces: interfaces.length,
        types: types.length
      }
    };
  }

  private generateASTStructureDiagram(module: ParsedModule): string {
    const functions = module.chunks.filter(c => c.type === 'function');
    const classes = module.chunks.filter(c => c.type === 'class');
    const interfaces = module.chunks.filter(c => c.type === 'interface');
    const types = module.chunks.filter(c => c.type === 'type');

    const nodes: string[] = [];
    const connections: string[] = [];

    // Add module root
    nodes.push(`    Module["📄 ${module.name}"]`);

    // Add category nodes
    if (functions.length > 0) {
      nodes.push(`    Functions["🔧 Functions (${functions.length})"]`);
      connections.push(`    Module --> Functions`);

      functions.forEach((fn, i) => {
        const name = fn.metadata?.name || `function_${i}`;
        const safeName = `F${i}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        nodes.push(`    ${safeName}["${name}()"]`);
        connections.push(`    Functions --> ${safeName}`);
      });
    }

    if (classes.length > 0) {
      nodes.push(`    Classes["📚 Classes (${classes.length})"]`);
      connections.push(`    Module --> Classes`);

      classes.forEach((cls, i) => {
        const name = cls.metadata?.name || `class_${i}`;
        const safeName = `C${i}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        nodes.push(`    ${safeName}["${name}"]`);
        connections.push(`    Classes --> ${safeName}`);
      });
    }

    if (interfaces.length > 0) {
      nodes.push(`    Interfaces["🔗 Interfaces (${interfaces.length})"]`);
      connections.push(`    Module --> Interfaces`);

      interfaces.forEach((iface, i) => {
        const name = iface.metadata?.name || `interface_${i}`;
        const safeName = `I${i}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        nodes.push(`    ${safeName}["${name}"]`);
        connections.push(`    Interfaces --> ${safeName}`);
      });
    }

    if (types.length > 0) {
      nodes.push(`    Types["📝 Types (${types.length})"]`);
      connections.push(`    Module --> Types`);

      types.forEach((type, i) => {
        const name = type.metadata?.name || `type_${i}`;
        const safeName = `T${i}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        nodes.push(`    ${safeName}["${name}"]`);
        connections.push(`    Types --> ${safeName}`);
      });
    }

    return `graph TD
${nodes.join('\n')}
${connections.join('\n')}

    classDef module fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef category fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef function fill:#e8f5e8,stroke:#2e7d32,stroke-width:1px
    classDef class fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef interface fill:#e0f2f1,stroke:#00695c,stroke-width:1px
    classDef type fill:#fce4ec,stroke:#c2185b,stroke-width:1px

    class Module module
    class Functions,Classes,Interfaces,Types category`;
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

  private async _writeFiles(files: GeneratedFile[]): Promise<void> {
    for (const file of files) {
      await fs.ensureDir(path.dirname(file.path));
      await fs.writeFile(file.path, file.content, 'utf8');
    }
  }

  getStats(): GenerationStats {
    return this.stats;
  }

  // New methods for immediate file writing and chunked processing
  private async writeFileImmediately(file: GeneratedFile): Promise<void> {
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await fs.ensureDir(path.dirname(file.path));
        await fs.writeFile(file.path, file.content, 'utf8');
        return; // Success - exit the retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ File write attempt ${attempt}/${MAX_RETRIES} failed for ${file.path}: ${lastError.message}`);

        if (attempt < MAX_RETRIES) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
    }

    // All retries failed - create emergency backup
    console.error(`❌ All ${MAX_RETRIES} attempts failed to write ${file.path}`);
    try {
      const emergencyPath = file.path.replace(/\.md$/, '_emergency.md');
      await fs.writeFile(emergencyPath, file.content, 'utf8');
      console.log(`✅ Emergency backup saved to ${emergencyPath}`);
    } catch (emergencyError) {
      console.error(`❌ Even emergency backup failed: ${emergencyError instanceof Error ? emergencyError.message : String(emergencyError)}`);
    }

    // Don't throw - allow the process to continue with other files
    this.stats.errors.push(`File write failed after ${MAX_RETRIES} retries: ${file.path} - ${lastError?.message}`);
  }

  private async generateAPIReferenceChunked(modules: ParsedModule[]): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];
    const CHUNK_SIZE = 3; // Process 3 modules at a time to save tokens

    for (let i = 0; i < modules.length; i += CHUNK_SIZE) {
      const chunk = modules.slice(i, i + CHUNK_SIZE);
      console.log(`📄 Processing API chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(modules.length/CHUNK_SIZE)} (${chunk.length} modules)...`);

      for (const module of chunk) {
        try {
          const apiChunks = module.chunks.filter(
            (c) =>
              c.type === 'function' ||
              c.type === 'class' ||
              c.type === 'method' ||
              c.type === 'interface'
          );

          if (apiChunks.length > 0) {
            // Limit prompt size for token efficiency
            const limitedChunks = apiChunks.slice(0, 10); // Max 10 chunks per module to save tokens
            const result = await this.aiService.summarizeChunks({
              chunks: limitedChunks,
              docType: DocType.API_REFERENCE,
            });

            sections.push({
              id: `api-${path.basename(module.path, path.extname(module.path))}`,
              type: DocType.API_REFERENCE,
              title: `API: ${module.name}`,
              content: result.summary,
              children: result.sections,
              metadata: { module: module.name, path: module.path, chunksProcessed: limitedChunks.length },
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to generate API for ${module.name}, creating fallback...`);
          console.error(`Error details: ${error instanceof Error ? error.message : String(error)}`);
          // Create fallback API documentation
          const fallbackAPI = this.createSingleModuleFallbackAPI(module);
          if (fallbackAPI) sections.push(fallbackAPI);
        }
      }

      // Small delay between chunks to prevent rate limiting
      if (i + CHUNK_SIZE < modules.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return sections;
  }

  private async generateModuleDocsChunked(modules: ParsedModule[]): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];
    const CHUNK_SIZE = 2; // Process 2 modules at a time for module docs

    for (let i = 0; i < modules.length; i += CHUNK_SIZE) {
      const chunk = modules.slice(i, i + CHUNK_SIZE);
      console.log(`📚 Processing module chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(modules.length/CHUNK_SIZE)} (${chunk.length} modules)...`);

      for (const module of chunk) {
        try {
          if (module.chunks.length === 0) {
            console.log(`⚠️ Skipping ${module.name} - no extractable chunks`);
            continue;
          }

          // Limit chunks for token efficiency
          const limitedChunks = module.chunks.slice(0, 15); // Max 15 chunks per module
          const result = await this.aiService.summarizeChunks({
            chunks: limitedChunks,
            docType: DocType.MODULE,
          });

          sections.push({
            id: `module-${path.basename(module.path, path.extname(module.path))}`,
            type: DocType.MODULE,
            title: `Module: ${module.name}`,
            content: result.summary,
            children: result.sections,
            metadata: {
              moduleName: module.name,
              path: module.path,
              chunksProcessed: limitedChunks.length,
              totalChunks: module.chunks.length
            },
          });
        } catch (error) {
          console.warn(`⚠️ Failed to generate module docs for ${module.name}, creating fallback...`);
          console.error(`Error details: ${error instanceof Error ? error.message : String(error)}`);
          // Create fallback module documentation
          const fallbackModule = this.createSingleModuleFallback(module);
          if (fallbackModule) sections.push(fallbackModule);
        }
      }

      // Small delay between chunks to prevent rate limiting
      if (i + CHUNK_SIZE < modules.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    return sections;
  }

  private createSingleModuleFallbackAPI(module: ParsedModule): DocumentationSection | null {
    if (module.chunks.length === 0) return null;

    const functions = module.chunks.filter(c => c.type === 'function');
    const classes = module.chunks.filter(c => c.type === 'class');
    const interfaces = module.chunks.filter(c => c.type === 'interface');

    const content = `# ${module.name} API Reference

## 📋 Module Information
- **File**: \`${module.path}\`
- **Language**: ${module.language}
- **Functions**: ${functions.length}
- **Classes**: ${classes.length}
- **Interfaces**: ${interfaces.length}

## 🔧 Functions
${functions.map(fn => `### ${fn.metadata?.name || 'Unknown'}
- **Location**: Lines ${fn.startLine}-${fn.endLine}`).join('\n\n') || 'None found'}

## 📚 Classes
${classes.map(cls => `### ${cls.metadata?.name || 'Unknown'}
- **Location**: Lines ${cls.startLine}-${cls.endLine}`).join('\n\n') || 'None found'}

## 🔗 Interfaces
${interfaces.map(iface => `### ${iface.metadata?.name || 'Unknown'}
- **Location**: Lines ${iface.startLine}-${iface.endLine}`).join('\n\n') || 'None found'}

---
*API documentation generated automatically using fallback analysis.*`;

    return {
      id: `api-${path.basename(module.path, path.extname(module.path))}`,
      type: DocType.API_REFERENCE,
      title: `API: ${module.name}`,
      content,
      children: [],
      metadata: { module: module.name, path: module.path, fallback: true },
    };
  }

  private createSingleModuleFallback(module: ParsedModule): DocumentationSection | null {
    if (module.chunks.length === 0) return null;

    const content = `# ${module.name} Module

## 📋 Module Overview
- **File**: \`${module.path}\`
- **Language**: ${module.language}
- **Total Elements**: ${module.chunks.length}

## 📊 Code Elements
${module.chunks.map(chunk => `### ${chunk.metadata?.name || 'Unknown'} (${chunk.type})
- **Location**: Lines ${chunk.startLine}-${chunk.endLine}`).join('\n\n')}

---
*Module documentation generated automatically using fallback analysis.*`;

    return {
      id: `module-${path.basename(module.path, path.extname(module.path))}`,
      type: DocType.MODULE,
      title: `Module: ${module.name}`,
      content,
      children: [],
      metadata: {
        moduleName: module.name,
        path: module.path,
        fallback: true,
        totalChunks: module.chunks.length
      },
    };
  }

  private createFallbackDatabaseDocs(modules: ParsedModule[]): DocumentationSection | null {
    const sqlModules = modules.filter(m => m.language === 'sql' || m.path.includes('.sql'));
    if (sqlModules.length === 0) {
      return null;
    }

    const content = `# Database Documentation (Fallback)

## 📊 Database Overview
- **SQL Files Found**: ${sqlModules.length}
- **Total Files Scanned**: ${modules.length}

## 📋 SQL Files Analysis
${sqlModules.map(module => `### ${module.name}
- **File**: \`${module.path}\`
- **Size**: ${module.chunks.length} code elements`).join('\n\n') || 'No detailed analysis available'}

---
*Database documentation generated using fallback analysis. AI generation failed.*`;

    return {
      id: 'database-fallback',
      type: DocType.DATABASE,
      title: 'Database Documentation',
      content,
      children: [],
      metadata: { fallback: true, sqlFiles: sqlModules.length }
    };
  }

  private createFallbackModuleDocsForAll(modules: ParsedModule[]): DocumentationSection[] {
    const sections: DocumentationSection[] = [];

    for (const module of modules) {
      if (module.chunks.length === 0) continue;

      const fallbackModule = this.createSingleModuleFallback(module);
      if (fallbackModule) {
        sections.push(fallbackModule);
      }
    }

    return sections;
  }

  private createBasicASTFallback(modules: ParsedModule[]): DocumentationSection | null {
    if (modules.length === 0) return null;

    const totalFunctions = modules.reduce((acc, m) => acc + m.chunks.filter(c => c.type === 'function').length, 0);
    const totalClasses = modules.reduce((acc, m) => acc + m.chunks.filter(c => c.type === 'class').length, 0);
    const totalInterfaces = modules.reduce((acc, m) => acc + m.chunks.filter(c => c.type === 'interface').length, 0);
    const totalTypes = modules.reduce((acc, m) => acc + m.chunks.filter(c => c.type === 'type').length, 0);

    const content = `# Basic AST Analysis (Fallback)

## 📊 Project Code Structure Summary
- **Total Modules**: ${modules.length}
- **Total Functions**: ${totalFunctions}
- **Total Classes**: ${totalClasses}
- **Total Interfaces**: ${totalInterfaces}
- **Total Types**: ${totalTypes}

## 📁 Module Breakdown
${modules.map(module => `### ${module.name}
- **Path**: \`${module.path}\`
- **Language**: ${module.language}
- **Elements**: ${module.chunks.length}
- **Functions**: ${module.chunks.filter(c => c.type === 'function').length}
- **Classes**: ${module.chunks.filter(c => c.type === 'class').length}`).join('\n\n')}

## 🌳 Basic AST Structure

\`\`\`mermaid
graph TD
    Project["📄 Project"]
    ${modules.map((module, i) => `    Module${i}["${module.name}"]
    Project --> Module${i}`).join('\n    ')}
\`\`\`

---
*Basic AST analysis generated using fallback method. Detailed AST generation failed.*`;

    return {
      id: 'basic-ast-analysis',
      type: DocType.MODULE,
      title: 'Basic AST Analysis',
      content,
      children: [],
      metadata: {
        fallback: true,
        totalModules: modules.length,
        totalFunctions,
        totalClasses,
        totalInterfaces,
        totalTypes
      }
    };
  }

  private createEmergencyASTFallback(modules: ParsedModule[]): DocumentationSection {
    const content = `# Emergency AST Analysis

## ⚠️ Emergency Fallback Mode
AST generation encountered critical errors. Basic project information:

- **Total Files Processed**: ${modules.length}
- **Processing Date**: ${new Date().toISOString()}
- **Mode**: Emergency Fallback

## 📄 File List
${modules.map(module => `- \`${module.path}\` (${module.language})`).join('\n')}

---
*Emergency fallback documentation. All advanced analysis methods failed.*`;

    return {
      id: 'emergency-ast-analysis',
      type: DocType.MODULE,
      title: 'Emergency AST Analysis',
      content,
      children: [],
      metadata: {
        emergency: true,
        fallback: true,
        totalFiles: modules.length,
        timestamp: new Date().toISOString()
      }
    };
  }

  private createAbsoluteEmergencyDocumentation(modules: ParsedModule[], error: any): DocumentationSection {
    const content = `# 🚨 EMERGENCY DOCUMENTATION

## ⚠️ CRITICAL SYSTEM FAILURE
**Documentation generation encountered a catastrophic error and could not complete normally.**

### Error Information
- **Error**: ${error instanceof Error ? error.message : String(error)}
- **Time**: ${new Date().toISOString()}
- **Files Attempted**: ${modules.length}

### 📄 Discovered Files
${modules.map(module => `- **${module.name}** (\`${module.path}\`)
  - Language: ${module.language}
  - Elements: ${module.chunks?.length || 0}`).join('\n')}

### 🔧 What Happened
The ScribeVerse documentation generator encountered an unrecoverable error during processing. This emergency documentation contains basic information about your project files.

### 📋 Next Steps
1. Check the error message above for specific details
2. Ensure all dependencies are installed: \`npm install\`
3. Verify your AI API keys are configured correctly
4. Try running the generator again: \`scribeverse generate\`
5. If the problem persists, please report the issue

---
*Emergency documentation generated by ScribeVerse v1.2.6 failsafe system*`;

    return {
      id: 'emergency-documentation',
      type: DocType.OVERVIEW,
      title: '🚨 Emergency Documentation',
      content,
      children: [],
      metadata: {
        emergency: true,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        filesAttempted: modules.length
      }
    };
  }

  private createMinimalViableDocumentation(modules: ParsedModule[]): DocumentationSection {
    const content = `# Project Documentation

## 📁 Project Structure
This project contains ${modules.length} files:

${modules.map(module => `### ${module.name}
- **File**: \`${module.path}\`
- **Type**: ${module.language}
- **Size**: ${module.chunks?.length || 0} code elements`).join('\n\n')}

## 🔧 Generated Information
- **Files Scanned**: ${modules.length}
- **Generated**: ${new Date().toISOString()}
- **Tool**: ScribeVerse v1.2.6

---
*Minimal documentation generated as fallback when advanced features failed*`;

    return {
      id: 'minimal-documentation',
      type: DocType.OVERVIEW,
      title: 'Project Documentation',
      content,
      children: [],
      metadata: {
        minimal: true,
        filesCount: modules.length,
        timestamp: new Date().toISOString()
      }
    };
  }

}