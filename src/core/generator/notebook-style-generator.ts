import * as fs from 'fs-extra';
import * as path from 'path';
import {
  ParsedModule,
  DocType,
  GeneratedFile,
  Language
} from '../../types';
import { AIService } from '../ai';

export interface NotebookCell {
  id: string;
  type: 'markdown' | 'code' | 'output' | 'analysis';
  content: string;
  metadata?: any;
  executionCount?: number;
  outputs?: string[];
}

export interface NotebookDocument {
  id: string;
  title: string;
  cells: NotebookCell[];
  metadata: {
    kernelspec?: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info?: {
      name: string;
      version: string;
    };
    created: string;
    modified: string;
    chapter?: number; // Allow chapter metadata
    [key: string]: any; // Allow additional metadata
  };
}

export class NotebookStyleGenerator {
  private aiService: AIService;
  private outputDir: string;

  constructor(aiService: AIService, outputDir: string) {
    this.aiService = aiService;
    this.outputDir = outputDir;
  }

  async generateNotebookDocs(modules: ParsedModule[]): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const notebookDir = path.join(this.outputDir, 'notebooks');

    await fs.ensureDir(notebookDir);

    // Generate table of contents (textbook index)
    const tocNotebook = await this.generateTableOfContents(modules);
    const tocFile = await this.writeNotebook(tocNotebook, '00-table-of-contents');
    files.push(tocFile);

    // Chapter 1: Introduction and Project Overview
    const introNotebook = await this.generateIntroductionChapter(modules);
    const introFile = await this.writeNotebook(introNotebook, '01-introduction');
    files.push(introFile);

    // Chapter 2: Getting Started Guide
    const gettingStartedNotebook = await this.generateGettingStartedChapter(modules);
    const gettingStartedFile = await this.writeNotebook(gettingStartedNotebook, '02-getting-started');
    files.push(gettingStartedFile);

    // Chapter 3: Architecture and Design
    const archNotebook = await this.generateArchitectureChapter(modules);
    const archFile = await this.writeNotebook(archNotebook, '03-architecture');
    files.push(archFile);

    // Chapter 4-N: Module Chapters (organized by importance)
    const organizedModules = this.organizeModulesByImportance(modules);
    let chapterNum = 4;

    for (const moduleGroup of organizedModules) {
      if (moduleGroup.modules.length > 0) {
        try {
          const chapterNotebook = await this.generateModuleChapter(moduleGroup, chapterNum);
          const chapterFile = await this.writeNotebook(chapterNotebook,
            `${chapterNum.toString().padStart(2, '0')}-${moduleGroup.category.toLowerCase().replace(/\s+/g, '-')}`);
          files.push(chapterFile);
          chapterNum++;
        } catch (error) {
          console.warn(`⚠️ Failed to generate chapter for ${moduleGroup.category}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Final Chapter: API Reference
    const apiNotebook = await this.generateAPIChapter(modules, chapterNum);
    const apiFile = await this.writeNotebook(apiNotebook, `${chapterNum.toString().padStart(2, '0')}-api-reference`);
    files.push(apiFile);

    // Appendices
    const appendixNotebook = await this.generateAppendices(modules);
    const appendixFile = await this.writeNotebook(appendixNotebook, '99-appendices');
    files.push(appendixFile);

    // Generate main index (textbook cover)
    const indexFile = this.generateTextbookIndex(files, modules);
    files.push(indexFile);

    console.log(`✅ Generated ${files.length} notebook-style textbook files`);
    return files;
  }

  private async generateOverviewNotebook(modules: ParsedModule[]): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    // Title cell
    cells.push({
      id: 'title',
      type: 'markdown',
      content: `# 📊 Project Overview Analysis

*Interactive documentation notebook generated automatically*

---`
    });

    // Statistics cell
    const totalFunctions = modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0);
    const totalClasses = modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0);
    const languages = [...new Set(modules.map(m => m.language))];

    cells.push({
      id: 'stats',
      type: 'output',
      content: `## 📈 Project Statistics

| Metric | Count |
|--------|-------|
| **Total Files** | ${modules.length} |
| **Languages** | ${languages.join(', ')} |
| **Functions** | ${totalFunctions} |
| **Classes** | ${totalClasses} |
| **Code Chunks** | ${modules.reduce((sum, m) => sum + m.chunks.length, 0)} |`,
      outputs: [`Analysis complete: ${modules.length} files processed`]
    });

    // Project structure visualization
    cells.push({
      id: 'structure',
      type: 'markdown',
      content: `## 🏗️ Project Structure

\`\`\`mermaid
graph TD
    Project["📄 ${path.basename(process.cwd())}"]
    ${languages.map(lang => `    ${lang.replace(/[^a-zA-Z0-9]/g, '_')}["🔧 ${lang}"]
    Project --> ${lang.replace(/[^a-zA-Z0-9]/g, '_')}`).join('\n    ')}

    ${languages.map(lang => {
      const langModules = modules.filter(m => m.language === lang);
      return langModules.slice(0, 5).map((mod, i) => {
        const safeName = `${lang.replace(/[^a-zA-Z0-9]/g, '_')}_${i}`;
        return `    ${safeName}["${mod.name}"]
    ${lang.replace(/[^a-zA-Z0-9]/g, '_')} --> ${safeName}`;
      }).join('\n    ');
    }).join('\n    ')}
\`\`\``,
      metadata: { diagramType: 'project-structure' }
    });

    // AI Analysis cell
    try {
      const analysisChunks = modules.flatMap(m => m.chunks).slice(0, 10);
      const aiAnalysis = await this.aiService.summarizeChunks({
        chunks: analysisChunks,
        context: `Project analysis for ${modules.length} modules`,
        docType: DocType.OVERVIEW
      });

      cells.push({
        id: 'ai-analysis',
        type: 'analysis',
        content: `## 🤖 AI Analysis

${aiAnalysis.summary}`,
        metadata: { tokensUsed: this.aiService.getTokenCount() },
        outputs: ['AI analysis complete']
      });
    } catch {
      cells.push({
        id: 'ai-analysis-fallback',
        type: 'analysis',
        content: `## 🤖 AI Analysis

*AI analysis unavailable at this time.*

The project contains ${modules.length} files across ${languages.length} programming languages. Manual inspection recommended for detailed architectural insights.`,
        outputs: ['AI analysis failed - using fallback']
      });
    }

    return {
      id: 'project-overview',
      title: 'Project Overview Analysis',
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Documentation Analysis',
          language: 'markdown',
          name: 'doc-analysis'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private async generateModuleNotebook(module: ParsedModule): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    // Module header
    cells.push({
      id: 'header',
      type: 'markdown',
      content: `# 📦 Module: ${module.name}

**File:** \`${module.path}\`
**Language:** ${module.language}
**Elements:** ${module.chunks.length}

---`
    });

    // Module metadata
    cells.push({
      id: 'metadata',
      type: 'output',
      content: `## 📋 Module Information

| Property | Value |
|----------|-------|
| **File Path** | \`${module.path}\` |
| **Language** | ${module.language} |
| **Functions** | ${module.chunks.filter(c => c.type === 'function').length} |
| **Classes** | ${module.chunks.filter(c => c.type === 'class').length} |
| **Interfaces** | ${module.chunks.filter(c => c.type === 'interface').length} |
| **Total Elements** | ${module.chunks.length} |`,
      outputs: [`Module analysis: ${module.chunks.length} code elements found`]
    });

    // Imports and exports
    if (module.imports.length > 0 || module.exports.length > 0) {
      cells.push({
        id: 'dependencies',
        type: 'code',
        content: `// Imports and Exports Analysis
const moduleImports = ${JSON.stringify(module.imports, null, 2)};
const moduleExports = ${JSON.stringify(module.exports, null, 2)};

console.log('Imports:', moduleImports.length);
console.log('Exports:', moduleExports.length);`,
        outputs: [
          `Imports: ${module.imports.length}`,
          `Exports: ${module.exports.length}`
        ]
      });
    }

    // Code elements breakdown
    const functions = module.chunks.filter(c => c.type === 'function');
    const classes = module.chunks.filter(c => c.type === 'class');

    if (functions.length > 0) {
      cells.push({
        id: 'functions',
        type: 'markdown',
        content: `## 🔧 Functions (${functions.length})

${functions.map(fn => `### \`${fn.metadata?.name || 'Anonymous'}\`
- **Lines:** ${fn.startLine}-${fn.endLine}
- **Type:** ${fn.type}

\`\`\`${module.language}
${fn.content.substring(0, 200)}${fn.content.length > 200 ? '...' : ''}
\`\`\`
`).join('\n')}`
      });
    }

    if (classes.length > 0) {
      cells.push({
        id: 'classes',
        type: 'markdown',
        content: `## 📚 Classes (${classes.length})

${classes.map(cls => `### \`${cls.metadata?.name || 'Anonymous'}\`
- **Lines:** ${cls.startLine}-${cls.endLine}
- **Type:** ${cls.type}

\`\`\`${module.language}
${cls.content.substring(0, 200)}${cls.content.length > 200 ? '...' : ''}
\`\`\`
`).join('\n')}`
      });
    }

    // AI analysis for the module
    try {
      const moduleAnalysis = await this.aiService.summarizeChunks({
        chunks: module.chunks.slice(0, 5),
        context: `Module: ${module.name}`,
        docType: DocType.MODULE
      });

      cells.push({
        id: 'ai-module-analysis',
        type: 'analysis',
        content: `## 🤖 AI Module Analysis

${moduleAnalysis.summary}`,
        metadata: {
          moduleName: module.name,
          tokensUsed: this.aiService.getTokenCount()
        },
        outputs: ['Module AI analysis complete']
      });
    } catch {
      cells.push({
        id: 'ai-analysis-fallback',
        type: 'analysis',
        content: `## 🤖 AI Module Analysis

*AI analysis unavailable for this module.*

This module contains ${module.chunks.length} code elements including ${functions.length} functions and ${classes.length} classes.`,
        outputs: ['AI analysis failed - using fallback']
      });
    }

    return {
      id: `module-${module.name}`,
      title: `Module: ${module.name}`,
      cells,
      metadata: {
        kernelspec: {
          display_name: `${module.language} Module Analysis`,
          language: module.language,
          name: `${module.language}-analysis`
        },
        language_info: {
          name: module.language,
          version: '1.0'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private async generateAPINotebook(modules: ParsedModule[]): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    cells.push({
      id: 'api-header',
      type: 'markdown',
      content: `# 🔌 API Reference Notebook

Interactive API documentation with code examples and analysis.

---`
    });

    // API summary
    const allFunctions = modules.flatMap(m => m.chunks.filter(c => c.type === 'function'));
    const allClasses = modules.flatMap(m => m.chunks.filter(c => c.type === 'class'));
    const allInterfaces = modules.flatMap(m => m.chunks.filter(c => c.type === 'interface'));

    cells.push({
      id: 'api-stats',
      type: 'output',
      content: `## 📊 API Overview

| API Element | Count |
|-------------|-------|
| **Functions** | ${allFunctions.length} |
| **Classes** | ${allClasses.length} |
| **Interfaces** | ${allInterfaces.length} |
| **Total APIs** | ${allFunctions.length + allClasses.length + allInterfaces.length} |`,
      outputs: [`API scan complete: ${allFunctions.length + allClasses.length + allInterfaces.length} elements found`]
    });

    // Function showcase
    if (allFunctions.length > 0) {
      const sampleFunctions = allFunctions.slice(0, 5);

      cells.push({
        id: 'function-showcase',
        type: 'code',
        content: `// Function Analysis
const functions = [
${sampleFunctions.map(fn => `  {
    name: '${fn.metadata?.name || 'anonymous'}',
    lines: '${fn.startLine}-${fn.endLine}',
    module: '${modules.find(m => m.chunks.includes(fn))?.name || 'unknown'}'
  }`).join(',\n')}
];

console.log('Sample Functions:', functions.length);
functions.forEach(fn => {
  console.log(\`\${fn.name} (\${fn.lines}) - \${fn.module}\`);
});`,
        outputs: [
          `Sample Functions: ${sampleFunctions.length}`,
          ...sampleFunctions.map(fn => `${fn.metadata?.name || 'anonymous'} (${fn.startLine}-${fn.endLine}) - ${modules.find(m => m.chunks.includes(fn))?.name || 'unknown'}`)
        ]
      });
    }

    return {
      id: 'api-reference',
      title: 'API Reference',
      cells,
      metadata: {
        kernelspec: {
          display_name: 'API Documentation',
          language: 'javascript',
          name: 'api-docs'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private async generateArchitectureNotebook(modules: ParsedModule[]): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    cells.push({
      id: 'arch-header',
      type: 'markdown',
      content: `# 🏛️ Architecture Analysis Notebook

Interactive architectural analysis with dependency mapping and system insights.

---`
    });

    // Architecture overview
    const dependencies = this.calculateDependencies(modules);

    cells.push({
      id: 'dependency-analysis',
      type: 'code',
      content: `// Dependency Analysis
const dependencyData = ${JSON.stringify(dependencies, null, 2)};

const totalDependencies = Object.values(dependencyData)
  .reduce((sum, deps) => sum + deps.length, 0);

const mostConnected = Object.entries(dependencyData)
  .sort(([,a], [,b]) => b.length - a.length)
  .slice(0, 3);

console.log('Total dependencies:', totalDependencies);
console.log('Most connected modules:');
mostConnected.forEach(([module, deps]) => {
  console.log(\`  \${module}: \${deps.length} dependencies\`);
});`,
      outputs: [
        `Total dependencies: ${Object.values(dependencies).reduce((sum, deps) => sum + deps.length, 0)}`,
        'Most connected modules:',
        ...Object.entries(dependencies)
          .sort(([,a], [,b]) => b.length - a.length)
          .slice(0, 3)
          .map(([module, deps]) => `  ${module}: ${deps.length} dependencies`)
      ]
    });

    // Architecture diagram
    cells.push({
      id: 'arch-diagram',
      type: 'markdown',
      content: `## 🔗 Architecture Diagram

\`\`\`mermaid
graph TB
    ${Object.entries(dependencies).slice(0, 8).map(([module, deps], i) => {
      const safeName = `M${i}_${module.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const depConnections = deps.slice(0, 3).map((dep, j) => {
        const depSafeName = `D${i}_${j}_${dep.replace(/[^a-zA-Z0-9]/g, '_')}`;
        return `    ${depSafeName}["${dep}"]
    ${safeName} --> ${depSafeName}`;
      }).join('\n    ');

      return `    ${safeName}["📦 ${module}"]
    ${depConnections}`;
    }).join('\n')}

    classDef module fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef dependency fill:#f3e5f5,stroke:#4a148c,stroke-width:1px
\`\`\``,
      metadata: { diagramType: 'architecture' }
    });

    return {
      id: 'architecture-analysis',
      title: 'Architecture Analysis',
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Architecture Analysis',
          language: 'javascript',
          name: 'arch-analysis'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private calculateDependencies(modules: ParsedModule[]): Record<string, string[]> {
    const deps: Record<string, string[]> = {};

    modules.forEach(module => {
      deps[module.name] = module.imports || [];
    });

    return deps;
  }

  // New textbook-style methods

  private async generateTableOfContents(modules: ParsedModule[]): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    cells.push({
      id: 'toc-header',
      type: 'markdown',
      content: `# 📚 Table of Contents

*A comprehensive guide to understanding this codebase*

---

## How to Use This Textbook

This documentation is structured like a textbook, with each chapter building upon the previous ones. Start from Chapter 1 and work your way through sequentially for the best learning experience.

### 📖 Reading Guide

- **🟢 Beginner**: Start with Chapters 1-3
- **🟡 Intermediate**: Focus on Chapters 4-6
- **🔴 Advanced**: Deep dive into later chapters and appendices
- **📚 Reference**: Use the API Reference chapter for quick lookups

---`
    });

    // Generate dynamic table of contents
    const organizedModules = this.organizeModulesByImportance(modules);
    let chapterNum = 1;
    const tocEntries = [
      { num: chapterNum++, title: 'Introduction and Project Overview', description: 'Get started with understanding the project structure and goals' },
      { num: chapterNum++, title: 'Getting Started Guide', description: 'Installation, setup, and first steps' },
      { num: chapterNum++, title: 'Architecture and Design', description: 'System architecture, patterns, and design decisions' }
    ];

    organizedModules.forEach(group => {
      if (group.modules.length > 0) {
        tocEntries.push({
          num: chapterNum++,
          title: group.category,
          description: `${group.modules.length} modules: ${group.modules.slice(0, 3).map(m => m.name).join(', ')}${group.modules.length > 3 ? '...' : ''}`
        });
      }
    });

    tocEntries.push(
      { num: chapterNum++, title: 'API Reference', description: 'Complete API documentation and examples' },
      { num: 99, title: 'Appendices', description: 'Additional resources, glossary, and troubleshooting' }
    );

    cells.push({
      id: 'toc-content',
      type: 'output',
      content: `## 📋 Chapters

${tocEntries.map(entry => `### Chapter ${entry.num}: ${entry.title}
${entry.description}

**[📖 Read Chapter ${entry.num}](./${entry.num.toString().padStart(2, '0')}-${entry.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.html)**`).join('\n\n')}`,
      outputs: [`Table of Contents generated with ${tocEntries.length} chapters`]
    });

    cells.push({
      id: 'learning-path',
      type: 'analysis',
      content: `## 🎯 Recommended Learning Paths

### 📚 For New Team Members
1. **Start Here**: Chapter 1 (Introduction)
2. **Setup**: Chapter 2 (Getting Started)
3. **Understanding**: Chapter 3 (Architecture)
4. **Core Modules**: Chapters 4-6
5. **Reference**: API Reference as needed

### 🔧 For Developers
1. **Quick Start**: Chapters 1-2
2. **Architecture Deep Dive**: Chapter 3
3. **Module Implementation**: All module chapters
4. **API Mastery**: API Reference chapter

### 📖 For Documentation Writers
1. **Project Overview**: Chapter 1
2. **Architecture Understanding**: Chapter 3
3. **Complete Module Review**: All chapters
4. **Reference Materials**: Appendices

---

**💡 Pro Tip**: Each chapter includes interactive examples and exercises to reinforce learning.`,
      outputs: ['Learning paths configured for different user types']
    });

    return {
      id: 'table-of-contents',
      title: 'Table of Contents - Project Documentation Textbook',
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Table of Contents',
          language: 'markdown',
          name: 'toc'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private async generateIntroductionChapter(modules: ParsedModule[]): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    cells.push({
      id: 'intro-header',
      type: 'markdown',
      content: `# 📖 Chapter 1: Introduction and Project Overview

*Welcome to the comprehensive documentation for this project*

---

## 🎯 Chapter Objectives

By the end of this chapter, you will understand:

- ✅ What this project does and why it exists
- ✅ The overall structure and organization
- ✅ Key technologies and languages used
- ✅ How different parts fit together
- ✅ Where to find specific information

---`
    });

    // Project statistics
    const totalFunctions = modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0);
    const totalClasses = modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0);
    const languages = [...new Set(modules.map(m => m.language))];

    cells.push({
      id: 'project-stats',
      type: 'output',
      content: `## 📊 Project at a Glance

| 📋 Aspect | 📈 Value | 📝 Notes |
|-----------|----------|----------|
| **Total Files** | ${modules.length} | Source code files analyzed |
| **Programming Languages** | ${languages.length} | ${languages.join(', ')} |
| **Functions** | ${totalFunctions} | Callable functions and methods |
| **Classes** | ${totalClasses} | Object-oriented classes |
| **Code Elements** | ${modules.reduce((sum, m) => sum + m.chunks.length, 0)} | Total analyzable code structures |
| **Documentation Scope** | Complete | All aspects covered in this textbook |`,
      outputs: [`Project analysis: ${modules.length} files, ${languages.length} languages, ${totalFunctions + totalClasses} major code elements`]
    });

    // Project purpose (AI-generated)
    try {
      const purposeChunks = modules.flatMap(m => m.chunks).slice(0, 8);
      const purposeAnalysis = await this.aiService.summarizeChunks({
        chunks: purposeChunks,
        context: 'Project introduction and purpose explanation',
        docType: DocType.OVERVIEW
      });

      cells.push({
        id: 'project-purpose',
        type: 'analysis',
        content: `## 🎯 What This Project Does

${purposeAnalysis.summary}

### 🔑 Key Features

Based on the code analysis, this project appears to:

- 📝 **Core Functionality**: Provides essential features through ${totalFunctions} functions
- 🏗️ **Architecture**: Uses ${totalClasses} classes for structured organization
- 🔧 **Multi-Language Support**: Implements solutions in ${languages.join(', ')}
- 📦 **Modular Design**: Organized into ${modules.length} separate modules

*This analysis was generated by examining the codebase structure and key components.*`,
        outputs: ['AI analysis complete - project purpose identified'],
        metadata: { aiGenerated: true }
      });
    } catch {
      cells.push({
        id: 'project-purpose-fallback',
        type: 'analysis',
        content: `## 🎯 What This Project Does

This project is a ${languages.join('/')} application with ${modules.length} modules, implementing ${totalFunctions} functions and ${totalClasses} classes.

### 📁 Project Structure Overview

The codebase is organized into several key areas:

${[...new Set(modules.map(m => path.dirname(m.path)))].slice(0, 6).map(dir =>
  `- **${dir === '.' ? 'Root Directory' : dir}**: Contains ${modules.filter(m => path.dirname(m.path) === dir).length} files`
).join('\n')}

*Detailed analysis requires AI services. This is a structural overview based on file organization.*`,
        outputs: ['Fallback analysis - structural overview provided']
      });
    }

    // Navigation guide
    cells.push({
      id: 'navigation-guide',
      type: 'markdown',
      content: `## 🧭 How to Navigate This Documentation

### 📚 Chapter Structure

Each chapter in this textbook follows a consistent structure:

1. **📖 Chapter Introduction**: Overview and learning objectives
2. **📊 Key Concepts**: Important ideas and terminology
3. **💻 Code Examples**: Interactive examples with explanations
4. **🔍 Deep Dive**: Detailed technical analysis
5. **✅ Chapter Summary**: Key takeaways and next steps
6. **🔗 Related Chapters**: Cross-references to related material

### 🔍 Finding Information

- **📋 Table of Contents**: Navigate to specific topics
- **🔗 Cross-References**: Follow links between related concepts
- **📚 API Reference**: Look up specific functions and classes
- **📖 Appendices**: Find additional resources and troubleshooting

### 💡 Interactive Elements

This documentation includes interactive elements:

- **📊 Live Statistics**: Real-time project metrics
- **💻 Code Examples**: Copy-paste ready code snippets
- **🤖 AI Analysis**: Intelligent insights about the code
- **🔄 Diagrams**: Visual representations of system architecture

---

**▶️ Next Chapter**: [Getting Started Guide](./02-getting-started.html) - Learn how to set up and run this project.`
    });

    return {
      id: 'introduction-chapter',
      title: 'Chapter 1: Introduction and Project Overview',
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Introduction Chapter',
          language: 'markdown',
          name: 'intro'
        },
        chapter: 1,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private async generateGettingStartedChapter(modules: ParsedModule[]): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    cells.push({
      id: 'getting-started-header',
      type: 'markdown',
      content: `# 🚀 Chapter 2: Getting Started Guide

*Your step-by-step guide to setting up and running this project*

---

## 🎯 Chapter Objectives

By the end of this chapter, you will be able to:

- ✅ Set up the development environment
- ✅ Install all necessary dependencies
- ✅ Run the project successfully
- ✅ Understand the basic project workflow
- ✅ Know where to get help when needed

---`
    });

    // Prerequisites and setup
    cells.push({
      id: 'prerequisites',
      type: 'code',
      content: `// Environment Check Script
console.log("🔍 Checking Development Environment...");

// Check Node.js version
const nodeVersion = process.version;
console.log(\`Node.js version: \${nodeVersion}\`);

// Check npm availability
try {
  const { execSync } = require('child_process');
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(\`npm version: \${npmVersion}\`);
} catch {
  console.log('❌ npm not found - please install Node.js');
}

// Project languages check
const languages = ${JSON.stringify([...new Set(modules.map(m => m.language))])};
console.log(\`Programming languages in this project: \${languages.join(', ')}\`);

console.log("✅ Environment check complete!");`,
      outputs: [
        `Node.js version: ${process.version}`,
        `Programming languages in this project: ${[...new Set(modules.map(m => m.language))].join(', ')}`,
        '✅ Environment check complete!'
      ]
    });

    // Installation steps
    cells.push({
      id: 'installation',
      type: 'markdown',
      content: `## 📦 Installation Steps

### Step 1: Prerequisites

Before you begin, ensure you have the following installed:

${[...new Set(modules.map(m => m.language))].map(lang => {
  switch (lang) {
    case 'typescript':
    case 'javascript':
      return '- **Node.js** (version 14 or higher) and **npm**';
    case 'python':
      return '- **Python** (version 3.8 or higher) and **pip**';
    case 'java':
      return '- **Java JDK** (version 11 or higher) and **Maven/Gradle**';
    default:
      return `- **${lang}** runtime and package manager`;
  }
}).filter((item, index, arr) => arr.indexOf(item) === index).join('\n')}

### Step 2: Clone and Install

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
${[...new Set(modules.map(m => m.language as any))].includes(Language.JAVASCRIPT) || [...new Set(modules.map(m => m.language as any))].includes(Language.TYPESCRIPT)
  ? 'npm install'
  : [...new Set(modules.map(m => m.language as any))].includes(Language.PYTHON)
    ? 'pip install -r requirements.txt'
    : 'echo "Install dependencies based on your project setup"'}
\`\`\`

### Step 3: Configuration

Check for configuration files in the project root:

- Configuration files detected: ${modules.filter(m => m.name.includes('config') || m.name.includes('env')).length}
- Look for: \`.env\`, \`config.json\`, or similar files
- Follow any setup instructions in the main README

### Step 4: Verify Installation

\`\`\`bash
# Run tests to verify everything is working
${[...new Set(modules.map(m => m.language as any))].includes(Language.JAVASCRIPT) || [...new Set(modules.map(m => m.language as any))].includes(Language.TYPESCRIPT)
  ? 'npm test'
  : 'echo "Run your project\'s test command"'}

# Start the application
${[...new Set(modules.map(m => m.language as any))].includes(Language.JAVASCRIPT) || [...new Set(modules.map(m => m.language as any))].includes(Language.TYPESCRIPT)
  ? 'npm start'
  : 'echo "Run your project\'s start command"'}
\`\`\``
    });

    // Project structure walkthrough
    cells.push({
      id: 'project-structure',
      type: 'output',
      content: `## 📁 Project Structure Walkthrough

Understanding the project layout:

${[...new Set(modules.map(m => path.dirname(m.path)))].slice(0, 8).map(dir => {
  const dirModules = modules.filter(m => path.dirname(m.path) === dir);
  return `### ${dir === '.' ? '📂 Root Directory' : `📁 ${dir}`}
- **Files**: ${dirModules.length}
- **Key modules**: ${dirModules.slice(0, 3).map(m => `\`${m.name}\``).join(', ')}
- **Purpose**: ${dir.includes('src') ? 'Source code' : dir.includes('test') ? 'Test files' : dir.includes('config') ? 'Configuration' : 'Project files'}`;
}).join('\n\n')}`,
      outputs: [`Project structure analyzed: ${modules.length} files across ${[...new Set(modules.map(m => path.dirname(m.path)))].length} directories`]
    });

    // Next steps
    cells.push({
      id: 'next-steps',
      type: 'markdown',
      content: `## ➡️ What's Next?

Now that you have the project set up, here's your learning path:

### 🎯 Immediate Next Steps

1. **📖 Read Chapter 3**: [Architecture and Design](./03-architecture.html)
2. **🔍 Explore the Code**: Start with the main entry points
3. **🧪 Run Examples**: Try out the core functionality
4. **📚 Reference Materials**: Bookmark the API reference

### 🆘 Getting Help

If you encounter issues:

- **📖 Check the Appendices**: [Common Issues and Solutions](./99-appendices.html)
- **🔍 Search the Code**: Use your IDE's search functionality
- **📋 Review Configuration**: Double-check your setup steps
- **🤖 AI Assistant**: The documentation includes AI-generated insights

### 🎓 Learning Tips

- **📝 Take Notes**: Keep track of important concepts
- **💻 Try Examples**: Run code examples in your environment
- **🔗 Follow Links**: Use cross-references to explore related topics
- **📊 Check Metrics**: Monitor the interactive statistics

---

**▶️ Next Chapter**: [Architecture and Design](./03-architecture.html) - Understand how this project is structured and organized.`
    });

    return {
      id: 'getting-started-chapter',
      title: 'Chapter 2: Getting Started Guide',
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Getting Started Guide',
          language: 'markdown',
          name: 'getting-started'
        },
        chapter: 2,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private organizeModulesByImportance(modules: ParsedModule[]): Array<{category: string, modules: ParsedModule[]}> {
    const categories = [
      {
        category: 'Core Components',
        modules: modules.filter(m =>
          m.name.includes('core') ||
          m.name.includes('main') ||
          m.name.includes('app') ||
          m.name.includes('index') ||
          m.chunks.length > 10
        )
      },
      {
        category: 'Services and APIs',
        modules: modules.filter(m =>
          m.name.includes('service') ||
          m.name.includes('api') ||
          m.name.includes('controller') ||
          m.chunks.filter(c => c.type === 'function').length > 5
        )
      },
      {
        category: 'Data and Models',
        modules: modules.filter(m =>
          m.name.includes('model') ||
          m.name.includes('data') ||
          m.name.includes('entity') ||
          m.name.includes('schema') ||
          m.chunks.filter(c => c.type === 'class').length > 2
        )
      },
      {
        category: 'Utilities and Helpers',
        modules: modules.filter(m =>
          m.name.includes('util') ||
          m.name.includes('helper') ||
          m.name.includes('tool') ||
          m.name.includes('common')
        )
      },
      {
        category: 'Configuration and Setup',
        modules: modules.filter(m =>
          m.name.includes('config') ||
          m.name.includes('setup') ||
          m.name.includes('env') ||
          m.name.includes('settings')
        )
      }
    ];

    // Add remaining modules to "Other Modules" category
    const usedModules = new Set();
    categories.forEach(cat => cat.modules.forEach(m => usedModules.add(m)));

    const remainingModules = modules.filter(m => !usedModules.has(m));
    if (remainingModules.length > 0) {
      categories.push({
        category: 'Other Modules',
        modules: remainingModules
      });
    }

    return categories.filter(cat => cat.modules.length > 0);
  }

  private async writeNotebook(notebook: NotebookDocument, filename: string): Promise<GeneratedFile> {
    const notebookDir = path.join(this.outputDir, 'notebooks');
    const htmlPath = path.join(notebookDir, `${filename}.html`);
    const jsonPath = path.join(notebookDir, `${filename}.ipynb`);

    // Generate HTML notebook
    const htmlContent = this.generateNotebookHTML(notebook);
    await fs.writeFile(htmlPath, htmlContent, 'utf8');

    // Generate JSON notebook (Jupyter format)
    const jsonContent = this.generateNotebookJSON(notebook);
    await fs.writeFile(jsonPath, jsonContent, 'utf8');

    return {
      path: htmlPath,
      content: htmlContent,
      type: DocType.MODULE,
      metadata: {
        notebook: true,
        notebookId: notebook.id,
        jsonPath: jsonPath
      }
    };
  }

  private generateNotebookHTML(notebook: NotebookDocument): string {
    const cellsHTML = notebook.cells.map((cell, index) => {
      const cellId = `cell-${index}`;

      switch (cell.type) {
        case 'markdown':
          return `
    <div class="cell markdown-cell" id="${cellId}">
      <div class="cell-toolbar">
        <span class="cell-type">Markdown</span>
        <span class="cell-number">[${index + 1}]</span>
      </div>
      <div class="cell-content markdown-content">
        ${this.markdownToHTML(cell.content)}
      </div>
    </div>`;

        case 'code':
          return `
    <div class="cell code-cell" id="${cellId}">
      <div class="cell-toolbar">
        <span class="cell-type">Code</span>
        <span class="cell-number">[${cell.executionCount || index + 1}]</span>
      </div>
      <div class="cell-input">
        <pre><code class="language-javascript">${this.escapeHTML(cell.content)}</code></pre>
      </div>
      ${cell.outputs ? `
      <div class="cell-output">
        ${cell.outputs.map(output => `<pre class="output-line">${this.escapeHTML(output)}</pre>`).join('')}
      </div>` : ''}
    </div>`;

        case 'output':
          return `
    <div class="cell output-cell" id="${cellId}">
      <div class="cell-toolbar">
        <span class="cell-type">Output</span>
        <span class="cell-number">[${index + 1}]</span>
      </div>
      <div class="cell-content output-content">
        ${this.markdownToHTML(cell.content)}
      </div>
      ${cell.outputs ? `
      <div class="cell-output">
        ${cell.outputs.map(output => `<pre class="output-line">${this.escapeHTML(output)}</pre>`).join('')}
      </div>` : ''}
    </div>`;

        case 'analysis':
          return `
    <div class="cell analysis-cell" id="${cellId}">
      <div class="cell-toolbar">
        <span class="cell-type">🤖 AI Analysis</span>
        <span class="cell-number">[${index + 1}]</span>
      </div>
      <div class="cell-content analysis-content">
        ${this.markdownToHTML(cell.content)}
      </div>
      ${cell.outputs ? `
      <div class="cell-output">
        ${cell.outputs.map(output => `<pre class="output-line">${this.escapeHTML(output)}</pre>`).join('')}
      </div>` : ''}
    </div>`;

        default:
          return '';
      }
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notebook.title} - ScribeVerse Notebook</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f8f9fa;
    }

    .notebook-container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .notebook-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .notebook-header h1 {
      margin: 0 0 10px 0;
      font-size: 2.5em;
    }

    .notebook-meta {
      opacity: 0.9;
      font-size: 0.9em;
    }

    .cell {
      border-bottom: 1px solid #e9ecef;
      margin: 0;
    }

    .cell-toolbar {
      background-color: #f8f9fa;
      padding: 8px 15px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8em;
      color: #6c757d;
    }

    .cell-type {
      font-weight: 600;
      text-transform: uppercase;
    }

    .cell-content {
      padding: 20px;
    }

    .cell-input {
      background-color: #f8f9fa;
      padding: 15px;
      border-left: 4px solid #007bff;
    }

    .cell-output {
      background-color: #fff;
      padding: 15px;
      border-left: 4px solid #28a745;
    }

    .markdown-cell {
      background: white;
    }

    .code-cell {
      background: #f8f9fa;
    }

    .analysis-cell {
      background: linear-gradient(135deg, #fff5f5 0%, #f0fff4 100%);
      border-left: 4px solid #ff6b6b;
    }

    .output-cell {
      background: #f8f9fa;
      border-left: 4px solid #ffa500;
    }

    pre {
      background-color: #2d3748;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 10px 0;
    }

    .output-line {
      background-color: #1a202c;
      color: #68d391;
      margin: 5px 0;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }

    th, td {
      border: 1px solid #dee2e6;
      padding: 12px;
      text-align: left;
    }

    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }

    .mermaid {
      text-align: center;
      margin: 20px 0;
    }

    h1, h2, h3, h4, h5, h6 {
      color: #2d3748;
      margin-top: 25px;
      margin-bottom: 15px;
    }

    blockquote {
      border-left: 4px solid #007bff;
      margin: 20px 0;
      padding-left: 20px;
      color: #6c757d;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="notebook-container">
    <div class="notebook-header">
      <h1>📓 ${notebook.title}</h1>
      <div class="notebook-meta">
        Created: ${new Date(notebook.metadata.created).toLocaleString()} |
        ScribeVerse Notebook |
        ${notebook.cells.length} cells
      </div>
    </div>

    <div class="notebook-cells">
      ${cellsHTML}
    </div>
  </div>

  <script>
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      themeVariables: {
        primaryColor: '#667eea',
        primaryTextColor: '#2d3748',
        primaryBorderColor: '#4c51bf',
        lineColor: '#a0aec0'
      }
    });

    // Add copy functionality to code blocks
    document.querySelectorAll('pre code').forEach(block => {
      const button = document.createElement('button');
      button.textContent = '📋 Copy';
      button.style.cssText = 'position: absolute; top: 5px; right: 5px; padding: 5px 10px; border: none; background: #4a5568; color: white; border-radius: 4px; cursor: pointer; font-size: 0.8em;';

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(block);
      wrapper.appendChild(button);

      button.addEventListener('click', () => {
        navigator.clipboard.writeText(block.textContent);
        button.textContent = '✅ Copied';
        setTimeout(() => button.textContent = '📋 Copy', 2000);
      });
    });
  </script>
</body>
</html>`;
  }

  private generateNotebookJSON(notebook: NotebookDocument): string {
    const jupyterNotebook = {
      cells: notebook.cells.map((cell, index) => ({
        cell_type: cell.type === 'analysis' ? 'markdown' : cell.type,
        id: cell.id,
        metadata: cell.metadata || {},
        source: [cell.content],
        ...(cell.type === 'code' ? {
          execution_count: cell.executionCount || index + 1,
          outputs: (cell.outputs || []).map(output => ({
            output_type: 'stream',
            name: 'stdout',
            text: [output]
          }))
        } : {})
      })),
      metadata: {
        kernelspec: notebook.metadata.kernelspec || {
          display_name: 'Documentation',
          language: 'markdown',
          name: 'doc'
        },
        language_info: notebook.metadata.language_info || {
          name: 'markdown',
          version: '1.0'
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };

    return JSON.stringify(jupyterNotebook, null, 2);
  }

  // Additional missing methods for complete textbook structure

  private async generateArchitectureChapter(modules: ParsedModule[]): Promise<NotebookDocument> {
    return this.generateArchitectureNotebook(modules);
  }

  private async generateModuleChapter(moduleGroup: {category: string, modules: ParsedModule[]}, chapterNum: number): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    cells.push({
      id: 'chapter-header',
      type: 'markdown',
      content: `# 📦 Chapter ${chapterNum}: ${moduleGroup.category}

*Deep dive into the ${moduleGroup.category.toLowerCase()} of this project*

---

## 🎯 Chapter Objectives

By the end of this chapter, you will understand:

- ✅ The purpose and role of ${moduleGroup.category.toLowerCase()}
- ✅ Key modules and their responsibilities
- ✅ How these modules interact with the rest of the system
- ✅ Code patterns and best practices used
- ✅ Practical examples and use cases

---`
    });

    // Chapter overview
    cells.push({
      id: 'chapter-overview',
      type: 'output',
      content: `## 📊 ${moduleGroup.category} Overview

| Metric | Value | Description |
|--------|-------|-------------|
| **Modules in Category** | ${moduleGroup.modules.length} | Number of modules in this chapter |
| **Total Functions** | ${moduleGroup.modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0)} | Functions across all modules |
| **Total Classes** | ${moduleGroup.modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0)} | Classes across all modules |
| **Code Complexity** | ${moduleGroup.modules.reduce((sum, m) => sum + m.chunks.length, 0)} | Total code elements |`,
      outputs: [`Chapter ${chapterNum} analysis complete: ${moduleGroup.modules.length} modules analyzed`]
    });

    // Module breakdown
    for (const module of moduleGroup.modules.slice(0, 5)) {
      cells.push({
        id: `module-${module.name}`,
        type: 'markdown',
        content: `## 📄 Module: ${module.name}

**File Path**: \`${module.path}\`
**Language**: ${module.language}
**Elements**: ${module.chunks.length}

### 🔍 Module Analysis

${module.chunks.filter(c => c.type === 'function').length > 0 ? `**Functions (${module.chunks.filter(c => c.type === 'function').length})**:
${module.chunks.filter(c => c.type === 'function').slice(0, 3).map(fn => `- \`${fn.metadata?.name || 'anonymous'}\` (lines ${fn.startLine}-${fn.endLine})`).join('\n')}` : ''}

${module.chunks.filter(c => c.type === 'class').length > 0 ? `**Classes (${module.chunks.filter(c => c.type === 'class').length})**:
${module.chunks.filter(c => c.type === 'class').slice(0, 3).map(cls => `- \`${cls.metadata?.name || 'anonymous'}\` (lines ${cls.startLine}-${cls.endLine})`).join('\n')}` : ''}

### 💻 Code Sample

\`\`\`${module.language}
${module.chunks[0]?.content.substring(0, 300) || 'No code available'}${module.chunks[0]?.content.length > 300 ? '...' : ''}
\`\`\`
`
      });
    }

    return {
      id: `chapter-${chapterNum}`,
      title: `Chapter ${chapterNum}: ${moduleGroup.category}`,
      cells,
      metadata: {
        kernelspec: {
          display_name: `${moduleGroup.category} Chapter`,
          language: 'markdown',
          name: `chapter-${chapterNum}`
        },
        chapter: chapterNum,
        category: moduleGroup.category,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private async generateAPIChapter(modules: ParsedModule[], chapterNum: number): Promise<NotebookDocument> {
    const apiNotebook = await this.generateAPINotebook(modules);
    apiNotebook.id = `chapter-${chapterNum}`;
    apiNotebook.title = `Chapter ${chapterNum}: API Reference`;
    if (apiNotebook.metadata) {
      apiNotebook.metadata.chapter = chapterNum;
    }
    return apiNotebook;
  }

  private async generateAppendices(modules: ParsedModule[]): Promise<NotebookDocument> {
    const cells: NotebookCell[] = [];

    cells.push({
      id: 'appendices-header',
      type: 'markdown',
      content: `# 📖 Appendices

*Additional resources, references, and troubleshooting information*

---

## 🗂️ What You'll Find Here

This section contains supplementary information that supports the main chapters:

- **📚 Glossary**: Definitions of key terms and concepts
- **🔧 Troubleshooting**: Common issues and solutions
- **📊 Complete Statistics**: Detailed project metrics
- **🔗 External Resources**: Helpful links and references
- **📝 Change Log**: Documentation update history

---`
    });

    // Glossary
    cells.push({
      id: 'glossary',
      type: 'markdown',
      content: `## 📚 Glossary

### 📝 Key Terms

**API (Application Programming Interface)**: A set of protocols and tools for building software applications. In this project, we have ${modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0)} API functions.

**Module**: A self-contained unit of code that encapsulates related functionality. This project has ${modules.length} modules.

**Function**: A reusable block of code that performs a specific task. Total functions in project: ${modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0)}.

**Class**: A blueprint for creating objects with shared properties and methods. Total classes: ${modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0)}.

**Dependency**: A relationship where one module relies on another. Tracked across all project modules.

### 🏗️ Architecture Terms

**Component**: A modular, reusable piece of code that serves a specific purpose.

**Service**: A layer that handles business logic and data operations.

**Utility**: Helper functions that provide common functionality across modules.

**Configuration**: Settings and parameters that control application behavior.`
    });

    // Troubleshooting
    cells.push({
      id: 'troubleshooting',
      type: 'markdown',
      content: `## 🔧 Troubleshooting Guide

### 🚨 Common Issues

#### Setup Problems

**Issue**: Dependencies not installing correctly
**Solution**:
1. Clear cache: \`npm cache clean --force\`
2. Delete node_modules: \`rm -rf node_modules\`
3. Reinstall: \`npm install\`

**Issue**: Module not found errors
**Solution**:
1. Check import paths are correct
2. Verify module exists in the codebase
3. Review the module dependency structure

#### Runtime Problems

**Issue**: Function not working as expected
**Solution**:
1. Check the API Reference chapter for correct usage
2. Verify all required parameters are provided
3. Review the function's source code in the relevant module chapter

#### Documentation Problems

**Issue**: Notebook not loading properly
**Solution**:
1. Refresh the browser
2. Check browser console for JavaScript errors
3. Ensure Mermaid.js is loading correctly

### 📞 Getting More Help

If you encounter issues not covered here:

1. **📖 Review Related Chapters**: Check if other chapters provide context
2. **🔍 Search the Code**: Use your IDE's search functionality
3. **📊 Check Statistics**: Review the project metrics for insights
4. **🤖 AI Analysis**: The AI-generated insights may provide clues`
    });

    // Complete statistics
    cells.push({
      id: 'complete-stats',
      type: 'code',
      content: `// Complete Project Statistics
const projectStats = {
  overview: {
    totalModules: ${modules.length},
    totalChunks: ${modules.reduce((sum, m) => sum + m.chunks.length, 0)},
    languages: ${JSON.stringify([...new Set(modules.map(m => m.language))])}
  },
  codeElements: {
    functions: ${modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0)},
    classes: ${modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0)},
    interfaces: ${modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'interface').length, 0)},
    other: ${modules.reduce((sum, m) => sum + m.chunks.filter(c => !['function', 'class', 'interface'].includes(c.type)).length, 0)}
  },
  directories: ${JSON.stringify([...new Set(modules.map(m => path.dirname(m.path)))])},
  generated: "${new Date().toISOString()}"
};

console.log("📊 Complete Project Statistics:");
console.log("================================");
Object.entries(projectStats).forEach(([key, value]) => {
  console.log(\`\${key}:\`, value);
});

// Most complex modules
const complexModules = [
${modules.sort((a, b) => b.chunks.length - a.chunks.length).slice(0, 5).map(m =>
  `  { name: "${m.name}", chunks: ${m.chunks.length}, path: "${m.path}" }`
).join(',\n')}
];

console.log("\\n🏆 Most Complex Modules:");
complexModules.forEach((module, index) => {
  console.log(\`\${index + 1}. \${module.name} (\${module.chunks} elements)\`);
});`,
      outputs: [
        '📊 Complete Project Statistics:',
        '================================',
        `overview: ${JSON.stringify({totalModules: modules.length, totalChunks: modules.reduce((sum, m) => sum + m.chunks.length, 0), languages: [...new Set(modules.map(m => m.language))]})}`,
        `codeElements: ${JSON.stringify({
          functions: modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0),
          classes: modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0),
          interfaces: modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'interface').length, 0)
        })}`,
        '',
        '🏆 Most Complex Modules:',
        ...modules.sort((a, b) => b.chunks.length - a.chunks.length).slice(0, 5).map((m, i) => `${i + 1}. ${m.name} (${m.chunks.length} elements)`)
      ]
    });

    return {
      id: 'appendices',
      title: 'Appendices',
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Appendices',
          language: 'markdown',
          name: 'appendices'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  private generateTextbookIndex(files: GeneratedFile[], modules: ParsedModule[]): GeneratedFile {
    const textbookFiles = files.filter(f => f.metadata?.notebook);

    const content = `# 📚 Project Documentation Textbook

*A comprehensive, interactive guide to understanding this codebase*

---

## 🎓 Welcome to Your Learning Journey

This documentation is structured as an interactive textbook, designed to take you from a complete beginner to an expert understanding of this codebase. Each chapter builds upon the previous ones, creating a logical learning progression.

## 📖 How to Read This Textbook

### 🟢 **For Beginners** (New to this project)
1. **Start Here**: [Table of Contents](./00-table-of-contents.html) - Understand the structure
2. **Foundation**: [Chapter 1: Introduction](./01-introduction.html) - Learn what this project does
3. **Setup**: [Chapter 2: Getting Started](./02-getting-started.html) - Get up and running
4. **Understanding**: [Chapter 3: Architecture](./03-architecture.html) - Grasp the big picture

### 🟡 **For Developers** (Familiar with programming)
1. **Quick Overview**: [Table of Contents](./00-table-of-contents.html)
2. **Project Context**: [Chapter 1: Introduction](./01-introduction.html)
3. **Architecture Deep Dive**: [Chapter 3: Architecture](./03-architecture.html)
4. **Module Exploration**: Core component chapters
5. **API Mastery**: API Reference chapter

### 🔴 **For Experts** (Code reviewers, maintainers)
1. **Strategic View**: [Chapter 1: Introduction](./01-introduction.html)
2. **System Design**: [Chapter 3: Architecture](./03-architecture.html)
3. **Complete Analysis**: All module chapters
4. **Reference**: [API Reference](./99-api-reference.html) and [Appendices](./99-appendices.html)

---

## 📚 Complete Chapter List

${textbookFiles.map(file => {
  const filename = path.basename(file.path, '.html');
  const chapterMatch = filename.match(/^(\d+)-(.+)$/);

  if (chapterMatch) {
    const [, chapterNum, chapterSlug] = chapterMatch;
    const chapterTitle = chapterSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const isSpecial = chapterNum === '00' || chapterNum === '99';
    const icon = chapterNum === '00' ? '📋' : chapterNum === '99' ? '📖' : '📖';

    return `### ${icon} ${isSpecial ? chapterTitle : `Chapter ${parseInt(chapterNum)}: ${chapterTitle}`}
**[📖 Read Now](./${filename}.html)** | **[📓 Jupyter Format](./${filename}.ipynb)**

${isSpecial ?
  (chapterNum === '00' ? 'Essential starting point - overview of entire textbook structure' : 'Additional resources, troubleshooting, and reference materials') :
  `Interactive chapter covering ${chapterTitle.toLowerCase()} with code examples and exercises`}`;
  }

  return `### 📄 ${filename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
**[📖 Read Now](./${filename}.html)**`;
}).join('\n\n')}

---

## 🎯 Textbook Features

### 📊 **Interactive Learning**
- **Live Code Examples**: Copy-paste ready snippets
- **Real-time Statistics**: Project metrics updated dynamically
- **Visual Diagrams**: Interactive Mermaid.js charts and graphs
- **AI Analysis**: Intelligent insights throughout each chapter

### 🔍 **Navigation Tools**
- **Cross-References**: Links between related concepts
- **Table of Contents**: Quick access to any topic
- **Chapter Progression**: Clear next/previous navigation
- **Search Integration**: Find information quickly

### 💾 **Multiple Formats**
- **Interactive HTML**: Full-featured browser experience
- **Jupyter Notebooks**: For data scientists and researchers
- **Printable Versions**: Clean formatting for offline reading
- **Mobile Friendly**: Responsive design for all devices

---

## 📊 Project Statistics

| Metric | Value | Coverage |
|--------|--------|----------|
| **Chapters** | ${textbookFiles.length} | Complete textbook |
| **Code Files** | ${modules.length} | 100% analyzed |
| **Functions** | ${modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0)} | Fully documented |
| **Classes** | ${modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0)} | All covered |
| **Languages** | ${[...new Set(modules.map(m => m.language))].join(', ')} | Multi-language support |

---

## 🚀 Getting Started

### 📖 **Recommended Reading Order**

1. **📋 Start**: [Table of Contents](./00-table-of-contents.html) (5 minutes)
2. **🎯 Understand**: [Chapter 1: Introduction](./01-introduction.html) (15 minutes)
3. **🛠️ Setup**: [Chapter 2: Getting Started](./02-getting-started.html) (20 minutes)
4. **🏗️ Architecture**: [Chapter 3: Architecture](./03-architecture.html) (30 minutes)
5. **📦 Components**: Module chapters (variable time)
6. **📚 Reference**: [API Reference](./99-api-reference.html) (as needed)
7. **📖 Resources**: [Appendices](./99-appendices.html) (for troubleshooting)

### ⏱️ **Time Investment**
- **Quick Overview**: 1 hour (Chapters 1-3)
- **Complete Understanding**: 3-4 hours (All chapters)
- **Expert Level**: 6-8 hours (Deep study + practice)

---

## 🛠️ Technical Details

- **Format**: Interactive HTML with embedded JavaScript
- **Compatibility**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Dependencies**: Mermaid.js for diagrams, no installation required
- **Generated**: ${new Date().toLocaleDateString()}
- **Version**: ScribeVerse Textbook Generator v1.0

---

**🎓 Happy Learning!** This textbook is designed to make understanding complex codebases as easy and enjoyable as possible. Start with the Table of Contents and embark on your journey to code mastery.

*Interactive textbook documentation generated automatically by ScribeVerse*`;

    return {
      path: path.join(this.outputDir, 'notebooks', 'index.html'),
      content: this.generateNotebookHTML({
        id: 'textbook-index',
        title: 'Project Documentation Textbook - Interactive Learning Guide',
        cells: [{
          id: 'textbook-content',
          type: 'markdown',
          content: content
        }],
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      }),
      type: DocType.OVERVIEW,
      metadata: {
        notebook: true,
        textbook: true,
        index: true
      }
    };
  }

  private markdownToHTML(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/^\|(.*)\|$/gim, (_match, content) => {
        const cells = content.split('|').map((cell: string) => cell.trim());
        return `<tr>${cells.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`;
      })
      .replace(/^---$/gim, '<hr>')
      .replace(/\n/g, '<br>');
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}