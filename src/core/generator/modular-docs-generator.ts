import * as fs from 'fs-extra';
import * as path from 'path';
import {
  DocType,
  GeneratedFile,
  ParsedModule,
  DocDeltaConfig,
} from '../../types';
import { AIService } from '../../core/ai';

export interface ModuleGroup {
  name: string;
  type: 'api' | 'core' | 'utils' | 'components' | 'services' | 'database' | 'tests' | 'config';
  modules: ParsedModule[];
  description: string;
  dependencies: string[];
}

export interface DocumentationMap {
  overview: string;
  moduleGroups: { [key: string]: string };
  individualModules: { [key: string]: string };
  crossReferences: { [key: string]: string[] };
}

export class ModularDocumentationGenerator {
  private config: DocDeltaConfig;
  private aiService: AIService;
  private outputDir: string;
  private documentationMap: DocumentationMap;

  constructor(config: DocDeltaConfig, aiService: AIService, outputDir: string) {
    this.config = config;
    this.aiService = aiService;
    this.outputDir = outputDir;
    this.documentationMap = {
      overview: '',
      moduleGroups: {},
      individualModules: {},
      crossReferences: {}
    };
  }

  async generateModularDocumentation(modules: ParsedModule[]): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    console.log('📚 Starting modular documentation generation...');

    // 1. Analyze and group modules
    const moduleGroups = this.analyzeModuleStructure(modules);

    // 2. Generate overview documentation
    const overviewFile = await this.generateOverviewDocumentation(moduleGroups, modules);
    files.push(overviewFile);

    // 3. Generate group documentation files
    for (const group of moduleGroups) {
      const groupFile = await this.generateGroupDocumentation(group);
      files.push(groupFile);
    }

    // 4. Generate individual module documentation
    for (const module of modules) {
      const moduleFile = await this.generateIndividualModuleDocumentation(module, moduleGroups);
      files.push(moduleFile);
    }

    // 5. Generate cross-reference index
    const crossRefFile = await this.generateCrossReferenceIndex(files);
    files.push(crossRefFile);

    // 6. Generate database overview if SQL files exist
    const sqlModules = modules.filter(m => m.language.toLowerCase() === 'sql');
    if (sqlModules.length > 0) {
      const dbOverviewFile = await this.generateDatabaseOverview(sqlModules);
      files.push(dbOverviewFile);
    }

    console.log(`✅ Generated ${files.length} modular documentation files`);
    return files;
  }

  private analyzeModuleStructure(modules: ParsedModule[]): ModuleGroup[] {
    const groups: ModuleGroup[] = [];
    const groupMap = new Map<string, ParsedModule[]>();

    // Categorize modules based on path patterns and naming conventions
    for (const module of modules) {
      const category = this.categorizeModule(module);
      if (!groupMap.has(category)) {
        groupMap.set(category, []);
      }
      groupMap.get(category)!.push(module);
    }

    // Convert to ModuleGroup objects
    for (const [categoryName, categoryModules] of groupMap.entries()) {
      const group: ModuleGroup = {
        name: categoryName,
        type: this.getGroupType(categoryName),
        modules: categoryModules,
        description: this.getGroupDescription(categoryName),
        dependencies: this.analyzeGroupDependencies(categoryModules, modules)
      };
      groups.push(group);
    }

    return groups.sort((a, b) => this.getGroupPriority(a.type) - this.getGroupPriority(b.type));
  }

  private categorizeModule(module: ParsedModule): string {
    const pathParts = module.path.split('/').filter(part => part.length > 0);
    const fileName = path.basename(module.path, path.extname(module.path));

    // Check for common patterns
    if (pathParts.includes('api') || pathParts.includes('routes') || pathParts.includes('controllers')) {
      return 'API & Routes';
    }
    if (pathParts.includes('core') || pathParts.includes('engine') || pathParts.includes('lib')) {
      return 'Core System';
    }
    if (pathParts.includes('utils') || pathParts.includes('helpers') || pathParts.includes('common')) {
      return 'Utilities';
    }
    if (pathParts.includes('components') || pathParts.includes('ui') || pathParts.includes('views')) {
      return 'Components';
    }
    if (pathParts.includes('services') || pathParts.includes('providers')) {
      return 'Services';
    }
    if (pathParts.includes('database') || pathParts.includes('db') || pathParts.includes('models') || module.language.toLowerCase() === 'sql') {
      return 'Database';
    }
    if (pathParts.includes('test') || pathParts.includes('spec') || fileName.includes('test') || fileName.includes('spec')) {
      return 'Tests';
    }
    if (pathParts.includes('config') || fileName.includes('config') || fileName.includes('settings')) {
      return 'Configuration';
    }
    if (pathParts.includes('types') || fileName.includes('types') || fileName.includes('interfaces')) {
      return 'Type Definitions';
    }

    // Default categorization based on file location depth
    if (pathParts.length <= 2) {
      return 'Root Level';
    }

    return pathParts[pathParts.length - 2] || 'Miscellaneous';
  }

  private getGroupType(categoryName: string): ModuleGroup['type'] {
    const typeMap: { [key: string]: ModuleGroup['type'] } = {
      'API & Routes': 'api',
      'Core System': 'core',
      'Utilities': 'utils',
      'Components': 'components',
      'Services': 'services',
      'Database': 'database',
      'Tests': 'tests',
      'Configuration': 'config'
    };
    return typeMap[categoryName] || 'core';
  }

  private getGroupDescription(categoryName: string): string {
    const descriptions: { [key: string]: string } = {
      'API & Routes': 'RESTful API endpoints, route handlers, and HTTP controllers',
      'Core System': 'Core business logic, main application engine, and fundamental components',
      'Utilities': 'Helper functions, utility classes, and common functionality',
      'Components': 'Reusable UI components, widgets, and interface elements',
      'Services': 'Business services, external integrations, and service providers',
      'Database': 'Database schemas, models, migrations, and data access layers',
      'Tests': 'Unit tests, integration tests, and testing utilities',
      'Configuration': 'Application configuration, settings, and environment variables',
      'Type Definitions': 'TypeScript interfaces, type definitions, and data structures'
    };
    return descriptions[categoryName] || `${categoryName} related modules and functionality`;
  }

  private getGroupPriority(type: ModuleGroup['type']): number {
    const priorities = {
      'core': 1,
      'api': 2,
      'services': 3,
      'database': 4,
      'components': 5,
      'utils': 6,
      'config': 7,
      'tests': 8
    };
    return priorities[type] || 9;
  }

  private analyzeGroupDependencies(groupModules: ParsedModule[], allModules: ParsedModule[]): string[] {
    const dependencies = new Set<string>();

    for (const module of groupModules) {
      for (const dep of module.dependencies) {
        const targetModule = allModules.find(m => m.path === dep.target);
        if (targetModule) {
          const targetCategory = this.categorizeModule(targetModule);
          const currentCategory = this.categorizeModule(module);
          if (targetCategory !== currentCategory) {
            dependencies.add(targetCategory);
          }
        }
      }
    }

    return Array.from(dependencies);
  }

  private async generateOverviewDocumentation(groups: ModuleGroup[], modules: ParsedModule[]): Promise<GeneratedFile> {
    const totalFunctions = modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0);
    const totalClasses = modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0);

    const content = `# 📋 Documentation Overview

## 🏗️ Project Structure

This documentation is organized into **${groups.length} main module groups** containing **${modules.length} total modules**.

### 📊 Quick Statistics
- **Total Modules**: ${modules.length}
- **Total Functions**: ${totalFunctions}
- **Total Classes**: ${totalClasses}
- **Module Groups**: ${groups.length}

## 📁 Module Groups

${groups.map(group => `### ${this.getGroupIcon(group.type)} [${group.name}](./groups/${this.sanitizeFileName(group.name)}.md)

**${group.description}**

- **Modules**: ${group.modules.length}
- **Functions**: ${group.modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0)}
- **Classes**: ${group.modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0)}
${group.dependencies.length > 0 ? `- **Dependencies**: ${group.dependencies.map(dep => `[${dep}](./groups/${this.sanitizeFileName(dep)}.md)`).join(', ')}` : ''}

#### Key Modules:
${group.modules.slice(0, 3).map(m => `- [${path.basename(m.path)}](./modules/${this.sanitizeFileName(m.name)}.md)`).join('\\n')}
${group.modules.length > 3 ? `- ... and ${group.modules.length - 3} more` : ''}
`).join('\\n')}

## 🔗 Cross-References

- **[Module Cross-Reference Index](./cross-references.md)** - Complete module dependency map
- **[Database Overview](./database-overview.md)** - Database schemas and models (if available)
- **[API Reference](./api-reference.md)** - Complete API documentation

## 📖 How to Navigate

1. **Start with Module Groups** - Understand the high-level architecture
2. **Browse Individual Modules** - Dive into specific implementations
3. **Use Cross-References** - Follow dependency relationships
4. **Check Database Docs** - Understand data structures

---

*This documentation was automatically generated and is organized for maximum clarity and navigation ease.*
`;

    this.documentationMap.overview = 'overview.md';

    return {
      path: path.join(this.outputDir, 'overview.md'),
      content,
      type: DocType.OVERVIEW,
      crossReferences: groups.map(g => `groups/${this.sanitizeFileName(g.name)}.md`),
      tags: ['overview', 'navigation', 'structure']
    };
  }

  private async generateGroupDocumentation(group: ModuleGroup): Promise<GeneratedFile> {
    const groupDir = path.join(this.outputDir, 'groups');
    await fs.ensureDir(groupDir);

    const content = `# ${this.getGroupIcon(group.type)} ${group.name}

## 📖 Overview

${group.description}

### 📊 Group Statistics
- **Total Modules**: ${group.modules.length}
- **Total Functions**: ${group.modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'function').length, 0)}
- **Total Classes**: ${group.modules.reduce((sum, m) => sum + m.chunks.filter(c => c.type === 'class').length, 0)}
- **Dependencies**: ${group.dependencies.length > 0 ? group.dependencies.join(', ') : 'None'}

## 📁 Modules in this Group

${group.modules.map(module => {
  const functions = module.chunks.filter(c => c.type === 'function');
  const classes = module.chunks.filter(c => c.type === 'class');

  return `### 📄 [${module.name}](../modules/${this.sanitizeFileName(module.name)}.md)

**Path**: \`${module.path}\`
**Language**: ${module.language}
**Functions**: ${functions.length} | **Classes**: ${classes.length}

${functions.length > 0 ? `**Key Functions**: ${functions.slice(0, 3).map(f => `\`${f.id}\``).join(', ')}${functions.length > 3 ? ` (${functions.length - 3} more)` : ''}` : ''}

${module.chunks.filter(c => c.type === 'comment').length > 0 ?
  `**Description**: ${module.chunks.filter(c => c.type === 'comment')[0]?.content.slice(0, 100)}...` :
  '**Description**: Core module functionality'}

---
`;
}).join('\\n')}

## 🔗 Dependencies

${group.dependencies.length > 0 ? `This group depends on:
${group.dependencies.map(dep => `- [${dep}](${this.sanitizeFileName(dep)}.md)`).join('\\n')}` : 'This group has no external dependencies.'}

## ⚡ Quick Actions

- [← Back to Overview](../overview.md)
- [View All Modules](../cross-references.md)
- [Browse Other Groups](../overview.md#module-groups)

---

*Generated from ${group.modules.length} modules*
`;

    const fileName = `${this.sanitizeFileName(group.name)}.md`;
    this.documentationMap.moduleGroups[group.name] = `groups/${fileName}`;

    return {
      path: path.join(groupDir, fileName),
      content,
      type: DocType.MODULE,
      module: group.name,
      crossReferences: group.modules.map(m => `../modules/${this.sanitizeFileName(m.name)}.md`),
      tags: ['group', group.type, 'modules']
    };
  }

  private async generateIndividualModuleDocumentation(module: ParsedModule, groups: ModuleGroup[]): Promise<GeneratedFile> {
    const modulesDir = path.join(this.outputDir, 'modules');
    await fs.ensureDir(modulesDir);

    const group = groups.find(g => g.modules.includes(module));
    const functions = module.chunks.filter(c => c.type === 'function');
    const classes = module.chunks.filter(c => c.type === 'class');
    const interfaces = module.chunks.filter(c => c.type === 'interface');
    const types = module.chunks.filter(c => c.type === 'type');

    // Try to generate AI-powered documentation
    let aiDescription = '';
    try {
      aiDescription = await this.aiService.analyzeCode(
        JSON.stringify(module.chunks.slice(0, 5)),
        module.language,
        'documentation'
      );
    } catch {
      aiDescription = `**${module.name}** - Core module functionality for ${module.language} development.`;
    }

    const content = `# 📄 ${module.name}

## 📍 Module Information

- **Path**: \`${module.path}\`
- **Language**: ${module.language}
- **Group**: [${group?.name || 'Uncategorized'}](../groups/${this.sanitizeFileName(group?.name || 'uncategorized')}.md)
- **Imports**: ${module.imports.length}
- **Exports**: ${module.exports.length}

## 📖 Description

${aiDescription}

## 🏗️ Module Structure

${functions.length > 0 ? `### 🔧 Functions (${functions.length})

${functions.map(func => `#### \`${func.id}\`

**Lines**: ${func.startLine}-${func.endLine}

\`\`\`${module.language.toLowerCase()}
${func.content.slice(0, 300)}${func.content.length > 300 ? '...' : ''}
\`\`\`

---
`).join('\\n')}` : ''}

${classes.length > 0 ? `### 🏛️ Classes (${classes.length})

${classes.map(cls => `#### \`${cls.id}\`

**Lines**: ${cls.startLine}-${cls.endLine}

\`\`\`${module.language.toLowerCase()}
${cls.content.slice(0, 300)}${cls.content.length > 300 ? '...' : ''}
\`\`\`

---
`).join('\\n')}` : ''}

${interfaces.length > 0 ? `### 🔌 Interfaces (${interfaces.length})

${interfaces.map(iface => `#### \`${iface.id}\`

\`\`\`typescript
${iface.content}
\`\`\`

---
`).join('\\n')}` : ''}

${types.length > 0 ? `### 📋 Types (${types.length})

${types.map(type => `#### \`${type.id}\`

\`\`\`typescript
${type.content}
\`\`\`

---
`).join('\\n')}` : ''}

## 📦 Dependencies

${module.dependencies.length > 0 ? `
### Imports
${module.imports.map(imp => `- \`${imp}\``).join('\\n')}

### Dependency Graph
${module.dependencies.map(dep => `- **${dep.type}**: \`${dep.source}\` → \`${dep.target}\``).join('\\n')}
` : 'No dependencies found.'}

## 🔗 Related Modules

${group ? group.modules.filter(m => m !== module).slice(0, 5).map(m =>
  `- [${m.name}](${this.sanitizeFileName(m.name)}.md) - ${m.language}`
).join('\\n') : 'No related modules found.'}

## ⚡ Quick Actions

- [← Back to ${group?.name || 'Overview'}](../groups/${this.sanitizeFileName(group?.name || 'overview')}.md)
- [View Module Group](../groups/${this.sanitizeFileName(group?.name || 'uncategorized')}.md)
- [Browse All Modules](../cross-references.md)

---

*Last updated: ${new Date().toLocaleDateString()}*
`;

    const fileName = `${this.sanitizeFileName(module.name)}.md`;
    this.documentationMap.individualModules[module.name] = `modules/${fileName}`;

    return {
      path: path.join(modulesDir, fileName),
      content,
      type: DocType.MODULE,
      module: module.name,
      crossReferences: group?.modules.filter(m => m !== module).map(m => `${this.sanitizeFileName(m.name)}.md`) || [],
      tags: ['module', module.language.toLowerCase(), group?.type || 'misc']
    };
  }

  private async generateCrossReferenceIndex(files: GeneratedFile[]): Promise<GeneratedFile> {
    const content = `# 🔗 Cross-Reference Index

## 📋 All Documentation Files

### 📖 Overview & Groups
${files.filter(f => f.type === DocType.OVERVIEW || f.tags?.includes('group')).map(f =>
  `- [${path.basename(f.path, '.md')}](${path.relative(this.outputDir, f.path).replace(/\\\\/g, '/')}) ${f.tags ? `*(${f.tags.join(', ')})*` : ''}`
).join('\\n')}

### 📄 Individual Modules
${files.filter(f => f.type === DocType.MODULE && !f.tags?.includes('group')).map(f =>
  `- [${path.basename(f.path, '.md')}](${path.relative(this.outputDir, f.path).replace(/\\\\/g, '/')}) ${f.tags ? `*(${f.tags.join(', ')})*` : ''}`
).join('\\n')}

### 🗂️ Other Documentation
${files.filter(f => f.type !== DocType.MODULE && f.type !== DocType.OVERVIEW && !f.tags?.includes('group')).map(f =>
  `- [${path.basename(f.path, '.md')}](${path.relative(this.outputDir, f.path).replace(/\\\\/g, '/')}) - ${f.type} ${f.tags ? `*(${f.tags.join(', ')})*` : ''}`
).join('\\n')}

## 🌐 Dependency Graph

\`\`\`mermaid
graph TD
${this.generateMermaidDependencyGraph(files)}
\`\`\`

## 📊 Documentation Statistics

- **Total Files**: ${files.length}
- **Module Files**: ${files.filter(f => f.type === DocType.MODULE).length}
- **Overview Files**: ${files.filter(f => f.type === DocType.OVERVIEW).length}
- **API Files**: ${files.filter(f => f.type === DocType.API_REFERENCE).length}
- **Database Files**: ${files.filter(f => f.type === DocType.DATABASE).length}

---

*Cross-reference index automatically generated*
`;

    return {
      path: path.join(this.outputDir, 'cross-references.md'),
      content,
      type: DocType.OVERVIEW,
      crossReferences: files.map(f => path.relative(this.outputDir, f.path).replace(/\\\\/g, '/')),
      tags: ['index', 'cross-reference', 'navigation']
    };
  }

  private async generateDatabaseOverview(sqlModules: ParsedModule[]): Promise<GeneratedFile> {
    const tables = sqlModules.flatMap(m => m.chunks.filter(c => c.type === 'database_table'));
    const schemas = sqlModules.flatMap(m => m.chunks.filter(c => c.type === 'database_schema'));

    const content = `# 🗄️ Database Overview

## 📊 Database Statistics

- **SQL Modules**: ${sqlModules.length}
- **Tables**: ${tables.length}
- **Schemas**: ${schemas.length}

## 📋 Database Modules

${sqlModules.map(module => `### 📄 [${module.name}](./modules/${this.sanitizeFileName(module.name)}.md)

**Path**: \`${module.path}\`
**Tables**: ${module.chunks.filter(c => c.type === 'database_table').length}
**Schemas**: ${module.chunks.filter(c => c.type === 'database_schema').length}

#### Tables in this module:
${module.chunks.filter(c => c.type === 'database_table').map(t => `- \`${t.id}\``).join('\\n') || 'No tables found'}

---
`).join('\\n')}

## 🔗 Model Connections

\`\`\`mermaid
erDiagram
${tables.slice(0, 10).map(t => `    ${t.id.replace(/[^a-zA-Z0-9]/g, '_')} {
        string id
        string name
    }`).join('\\n')}
\`\`\`

## ⚡ Quick Actions

- [← Back to Overview](./overview.md)
- [View All Modules](./cross-references.md)

---

*Database documentation generated from ${sqlModules.length} SQL modules*
`;

    return {
      path: path.join(this.outputDir, 'database-overview.md'),
      content,
      type: DocType.DATABASE,
      crossReferences: sqlModules.map(m => `modules/${this.sanitizeFileName(m.name)}.md`),
      tags: ['database', 'overview', 'sql']
    };
  }

  private generateMermaidDependencyGraph(files: GeneratedFile[]): string {
    const nodes: string[] = [];
    let counter = 0;

    for (const file of files.slice(0, 20)) { // Limit for readability
      const nodeId = `N${counter++}`;
      const name = path.basename(file.path, '.md');
      nodes.push(`    ${nodeId}[${name}]`);

      if (file.crossReferences && file.crossReferences.length > 0) {
        for (const ref of file.crossReferences.slice(0, 3)) {
          const refName = path.basename(ref, '.md');
          const refNodeId = `N${counter++}`;
          nodes.push(`    ${refNodeId}[${refName}]`);
          nodes.push(`    ${nodeId} --> ${refNodeId}`);
        }
      }
    }

    return nodes.join('\\n');
  }

  private getGroupIcon(type: ModuleGroup['type']): string {
    const icons = {
      'api': '🌐',
      'core': '⚡',
      'utils': '🔧',
      'components': '🧩',
      'services': '⚙️',
      'database': '🗄️',
      'tests': '🧪',
      'config': '⚙️'
    };
    return icons[type] || '📁';
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}