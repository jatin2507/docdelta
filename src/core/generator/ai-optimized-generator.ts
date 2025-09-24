import * as fs from 'fs-extra';
import * as path from 'path';
import { ProjectFlow, FileNode } from '../../core/analyzer/flow-analyzer';
import { ParsedModule } from '../../types';
import { AIService } from '../ai';

export interface AIOptimizedDoc {
  projectOverview: ProjectOverviewSection;
  executionFlow: ExecutionFlowSection;
  fileDocumentation: FileDocSection[];
  dependencies: DependencySection;
  apiReference: APIReferenceSection;
  dataModels: DataModelSection;
  codeExamples: CodeExampleSection;
}

interface ProjectOverviewSection {
  title: string;
  purpose: string;
  techStack: string[];
  entryPoints: EntryPointInfo[];
  projectStructure: string;
  keyFeatures: string[];
  setupInstructions: string;
}

interface EntryPointInfo {
  file: string;
  purpose: string;
  startsFlow: string[];
}

interface ExecutionFlowSection {
  title: string;
  description: string;
  mainFlow: FlowStep[];
  alternativeFlows: FlowStep[][];
}

interface FlowStep {
  order: number;
  file: string;
  action: string;
  imports: string[];
  exports: string[];
  triggers: string[];
}

interface FileDocSection {
  filePath: string;
  purpose: string;
  dependencies: FileDependency[];
  exports: ExportInfo[];
  functions: FunctionDoc[];
  classes: ClassDoc[];
  usedBy: string[];
  criticalFor: string[];
  codeSnippets: CodeSnippet[];
  functionFlowDiagram?: string;
}

interface FileDependency {
  path: string;
  reason: string;
  items: string[];
}

interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type';
  description: string;
}

interface FunctionDoc {
  name: string;
  purpose: string;
  parameters: ParameterDoc[];
  returns: string;
  sideEffects: string[];
  example?: string;
}

interface ParameterDoc {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: string;
}

interface ClassDoc {
  name: string;
  purpose: string;
  constructor: FunctionDoc;
  methods: FunctionDoc[];
  properties: PropertyDoc[];
  inheritance?: string;
}

interface PropertyDoc {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  description: string;
}

interface DependencySection {
  title: string;
  graph: DependencyGraph;
  externalDependencies: ExternalDep[];
  internalModules: InternalModule[];
}

interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: ModuleCluster[];
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  importance: 'critical' | 'important' | 'standard';
}

interface GraphEdge {
  from: string;
  to: string;
  type: 'imports' | 'extends' | 'implements' | 'uses';
}

interface ModuleCluster {
  name: string;
  purpose: string;
  modules: string[];
}

interface ExternalDep {
  name: string;
  version?: string;
  purpose: string;
  usedIn: string[];
}

interface InternalModule {
  path: string;
  exports: string[];
  importedBy: string[];
  purpose: string;
}

interface APIReferenceSection {
  title: string;
  endpoints?: APIEndpoint[];
  functions: PublicFunction[];
  classes: PublicClass[];
}

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  parameters: ParameterDoc[];
  responses: ResponseDoc[];
  authentication?: string;
}

interface ResponseDoc {
  status: number;
  description: string;
  schema?: any;
}

interface PublicFunction {
  name: string;
  module: string;
  signature: string;
  description: string;
  usage: string;
}

interface PublicClass {
  name: string;
  module: string;
  description: string;
  publicMethods: string[];
  usage: string;
}

interface DataModelSection {
  title: string;
  databases: DatabaseInfo[];
  models: ModelDoc[];
  relationships: RelationshipDoc[];
}

interface DatabaseInfo {
  type: string;
  name?: string;
  collections?: CollectionDoc[];
  tables?: TableDoc[];
}

interface CollectionDoc {
  name: string;
  schema: any;
  indexes: string[];
  purpose: string;
}

interface TableDoc {
  name: string;
  columns: ColumnDoc[];
  indexes: string[];
  foreignKeys: ForeignKeyDoc[];
}

interface ColumnDoc {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  description: string;
}

interface ForeignKeyDoc {
  column: string;
  references: string;
  onDelete?: string;
  onUpdate?: string;
}

interface ModelDoc {
  name: string;
  type: string;
  fields: FieldDoc[];
  methods?: string[];
  validations?: string[];
}

interface FieldDoc {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  reference?: string;
}

interface RelationshipDoc {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  through?: string;
}

interface CodeExampleSection {
  title: string;
  examples: CodeExample[];
}

interface CodeExample {
  title: string;
  description: string;
  files: string[];
  code: string;
  explanation: string;
}

interface CodeSnippet {
  purpose: string;
  code: string;
  language: string;
}

export class AIOptimizedDocGenerator {
  private outputDir: string;
  private aiService: AIService;

  constructor(outputDir?: string, aiService?: AIService) {
    this.outputDir = outputDir || path.join(process.cwd(), 'docs-ai');
    this.aiService = aiService || new AIService();
  }

  async generateStructuredDocs(
    flow: ProjectFlow,
    modules: Map<string, ParsedModule>
  ): Promise<AIOptimizedDoc> {
    await fs.ensureDir(this.outputDir);

    const doc: AIOptimizedDoc = {
      projectOverview: await this.generateProjectOverview(flow),
      executionFlow: await this.generateExecutionFlow(flow),
      fileDocumentation: await this.generateFileDocumentation(flow, modules),
      dependencies: await this.generateDependencySection(flow),
      apiReference: await this.generateAPIReference(flow, modules),
      dataModels: await this.generateDataModels(modules),
      codeExamples: await this.generateCodeExamples(flow, modules),
    };

    await this.writeDocumentation(doc);

    return doc;
  }

  private async generateProjectOverview(flow: ProjectFlow): Promise<ProjectOverviewSection> {
    const overview: ProjectOverviewSection = {
      title: 'Project Overview',
      purpose: this.inferProjectPurpose(flow),
      techStack: this.extractTechStack(flow),
      entryPoints: flow.entryPoints.map(ep => ({
        file: ep.relativePath,
        purpose: ep.purpose || 'Application entry point',
        startsFlow: ep.dependencies.map(d => d.relativePath),
      })),
      projectStructure: this.describeProjectStructure(flow.projectStructure),
      keyFeatures: await this.identifyKeyFeatures(flow),
      setupInstructions: await this.generateSetupInstructions(flow.projectStructure),
    };

    return overview;
  }

  private inferProjectPurpose(flow: ProjectFlow): string {
    const { framework, packageManager } = flow.projectStructure;
    const moduleTypes = Array.from(flow.modules.values()).map(m => m.type);

    let purpose = 'This project is a ';

    if (framework) {
      purpose += `${framework} application `;
    } else {
      purpose += 'JavaScript/TypeScript application ';
    }

    if (moduleTypes.includes('component')) {
      purpose += 'with UI components ';
    }

    const hasAPI = Array.from(flow.modules.values()).some(m =>
      m.relativePath.includes('api') || m.relativePath.includes('route')
    );

    if (hasAPI) {
      purpose += 'providing API endpoints ';
    }

    purpose += `managed with ${packageManager || 'npm'}.`;

    return purpose;
  }

  private extractTechStack(flow: ProjectFlow): string[] {
    const stack: string[] = [];
    const { framework, languages } = flow.projectStructure;

    if (framework) stack.push(framework);

    languages.forEach(lang => {
      switch (lang) {
        case 'typescript':
          stack.push('TypeScript');
          break;
        case 'javascript':
          stack.push('JavaScript');
          break;
        case 'python':
          stack.push('Python');
          break;
      }
    });

    const modules = Array.from(flow.modules.values());

    if (modules.some(m => m.filePath.includes('express'))) stack.push('Express.js');
    if (modules.some(m => m.filePath.includes('mongo'))) stack.push('MongoDB');
    if (modules.some(m => m.filePath.includes('postgres'))) stack.push('PostgreSQL');
    if (modules.some(m => m.filePath.includes('redis'))) stack.push('Redis');
    if (modules.some(m => m.filePath.includes('graphql'))) stack.push('GraphQL');

    return [...new Set(stack)];
  }

  private describeProjectStructure(structure: any): string {
    const parts: string[] = [];

    parts.push(`Root directory: ${structure.rootDir}`);

    if (structure.srcDir) {
      parts.push(`Source code in: ${structure.srcDir}/`);
    }

    if (structure.testDir) {
      parts.push(`Tests in: ${structure.testDir}/`);
    }

    parts.push(`Total files: ${structure.totalFiles}`);
    parts.push(`Modules: ${structure.moduleCount}`);

    return parts.join('\n');
  }

  private async identifyKeyFeatures(flow: ProjectFlow): Promise<string[]> {
    const features: string[] = [];
    const modules = Array.from(flow.modules.values());

    if (modules.some(m => m.relativePath.includes('auth'))) {
      features.push('Authentication and Authorization');
    }

    if (modules.some(m => m.relativePath.includes('database') || m.relativePath.includes('model'))) {
      features.push('Database Integration');
    }

    if (modules.some(m => m.relativePath.includes('api') || m.relativePath.includes('route'))) {
      features.push('RESTful API');
    }

    if (modules.some(m => m.relativePath.includes('websocket') || m.relativePath.includes('socket'))) {
      features.push('Real-time Communication');
    }

    if (modules.some(m => m.relativePath.includes('cache'))) {
      features.push('Caching System');
    }

    if (modules.some(m => m.relativePath.includes('queue') || m.relativePath.includes('worker'))) {
      features.push('Background Job Processing');
    }

    return features;
  }

  private async generateSetupInstructions(structure: any): Promise<string> {
    const instructions: string[] = [];

    instructions.push('## Setup Instructions\n');
    instructions.push('1. Clone the repository');
    instructions.push(`2. Install dependencies: ${structure.packageManager || 'npm'} install`);

    if (structure.configFiles.some((f: string) => f.includes('.env'))) {
      instructions.push('3. Create .env file with required environment variables');
    }

    if (structure.framework === 'Next.js') {
      instructions.push('4. Run development server: npm run dev');
    } else {
      instructions.push('4. Start the application: npm start');
    }

    return instructions.join('\n');
  }

  private async generateExecutionFlow(flow: ProjectFlow): Promise<ExecutionFlowSection> {
    return {
      title: 'Application Execution Flow',
      description: 'The sequential flow of module execution starting from entry points',
      mainFlow: flow.executionFlow.map(ef => ({
        order: ef.step,
        file: ef.file,
        action: ef.action,
        imports: ef.imports,
        exports: ef.exports,
        triggers: ef.nextSteps,
      })),
      alternativeFlows: this.identifyAlternativeFlows(flow),
    };
  }

  private identifyAlternativeFlows(flow: ProjectFlow): FlowStep[][] {
    const alternativeFlows: FlowStep[][] = [];

    // Identify error handling flows
    const errorHandlers = Array.from(flow.modules.values()).filter(m =>
      m.relativePath.includes('error') || m.relativePath.includes('exception')
    );

    if (errorHandlers.length > 0) {
      const errorFlow: FlowStep[] = errorHandlers.map((handler, index) => ({
        order: index,
        file: handler.relativePath,
        action: 'Handle errors and exceptions',
        imports: handler.imports,
        exports: handler.exports,
        triggers: [],
      }));

      alternativeFlows.push(errorFlow);
    }

    return alternativeFlows;
  }

  private async generateFileDocumentation(
    flow: ProjectFlow,
    modules: Map<string, ParsedModule>
  ): Promise<FileDocSection[]> {
    const docs: FileDocSection[] = [];

    for (const [, node] of flow.modules) {
      const module = modules.get(node.filePath);
      if (!module) continue;

      const doc: FileDocSection = {
        filePath: node.relativePath,
        purpose: node.purpose || 'Module functionality',
        dependencies: node.dependencies.map(dep => ({
          path: dep.relativePath,
          reason: this.inferDependencyReason(node, dep),
          items: dep.exports.filter(exp => node.imports.includes(exp)),
        })),
        exports: module.exports.map(exp => ({
          name: exp,
          type: this.inferExportType(exp, module),
          description: `Exported ${exp} for external use`,
        })),
        functions: (node.functions || []).map(func => ({
          name: func.name,
          purpose: `Function ${func.name} implementation`,
          parameters: func.params.map(param => ({
            name: param,
            type: 'any',
            description: `Parameter ${param}`,
            required: true,
          })),
          returns: func.returnType || 'void',
          sideEffects: func.calls,
        })),
        classes: (node.classes || []).map(cls => ({
          name: cls.name,
          purpose: `Class ${cls.name} implementation`,
          constructor: {
            name: 'constructor',
            purpose: 'Initialize class instance',
            parameters: [],
            returns: cls.name,
            sideEffects: [],
          },
          methods: cls.methods.map(method => ({
            name: method,
            purpose: `Method ${method} implementation`,
            parameters: [],
            returns: 'any',
            sideEffects: [],
          })),
          properties: cls.properties.map(prop => ({
            name: prop,
            type: 'any',
            visibility: 'public' as const,
            description: `Property ${prop}`,
          })),
          inheritance: cls.extends,
        })),
        usedBy: node.dependents.map(d => d.relativePath),
        criticalFor: this.identifyCriticalDependents(node),
        codeSnippets: this.extractKeySnippets(module),
        functionFlowDiagram: await this.generateFunctionFlowDiagram(module, node),
      };

      docs.push(doc);
    }

    // Sort by dependency order (entry points first)
    docs.sort((a, b) => {
      const aNode = flow.modules.get(a.filePath);
      const bNode = flow.modules.get(b.filePath);
      return (aNode?.depth || 0) - (bNode?.depth || 0);
    });

    return docs;
  }

  private inferDependencyReason(node: FileNode, dependency: FileNode): string {
    if (dependency.type === 'config') {
      return 'Configuration and settings';
    }
    if (dependency.type === 'utility') {
      return 'Utility functions and helpers';
    }
    if (dependency.type === 'component') {
      return 'UI components';
    }
    if (dependency.exports.some(exp => node.functions?.some(f => f.calls.includes(exp)))) {
      return 'Function calls';
    }
    return 'Module functionality';
  }

  private inferExportType(
    exportName: string,
    module: ParsedModule
  ): 'function' | 'class' | 'variable' | 'interface' | 'type' {
    const chunk = module.chunks.find(c => c.metadata?.name === exportName);

    if (!chunk) return 'variable';

    switch (chunk.type) {
      case 'function':
        return 'function';
      case 'class':
        return 'class';
      case 'interface':
        return 'interface';
      case 'type':
        return 'type';
      default:
        return 'variable';
    }
  }

  private identifyCriticalDependents(node: FileNode): string[] {
    return node.dependents
      .filter(dep => dep.isEntryPoint || dep.type === 'entry')
      .map(dep => dep.relativePath);
  }

  private extractKeySnippets(module: ParsedModule): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];

    // Get first 3 most important chunks
    const importantChunks = module.chunks
      .filter(c => c.type === 'class' || c.type === 'function')
      .slice(0, 3);

    importantChunks.forEach(chunk => {
      snippets.push({
        purpose: `${chunk.type} ${chunk.metadata?.name || 'implementation'}`,
        code: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : ''),
        language: module.language,
      });
    });

    return snippets;
  }

  private async generateFunctionFlowDiagram(module: ParsedModule, node: FileNode): Promise<string> {
    try {
      // Get function chunks from the module
      const functionChunks = module.chunks.filter(
        c => c.type === 'function' || c.type === 'method'
      );

      if (functionChunks.length === 0) {
        return '';
      }

      // Find entry point function (exported functions or main function)
      const entryFunction = functionChunks.find(c =>
        module.exports.includes(c.metadata?.name || '') ||
        c.metadata?.name === 'main' ||
        c.metadata?.name === 'index'
      );

      const entryPoint = entryFunction?.metadata?.name;

      // Generate the flow diagram using AI service
      const diagram = await this.aiService.generateFunctionFlowDiagram(functionChunks, entryPoint);

      return diagram;
    } catch (error) {
      console.error(`Failed to generate function flow diagram for ${node.relativePath}:`, error);
      return '';
    }
  }

  private async generateDependencySection(flow: ProjectFlow): Promise<DependencySection> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Create nodes
    flow.modules.forEach((node, path) => {
      nodes.push({
        id: path,
        label: node.name,
        type: node.type,
        importance: node.isEntryPoint ? 'critical' : node.dependents.length > 3 ? 'important' : 'standard',
      });
    });

    // Create edges
    flow.dependencyGraph.forEach((deps, from) => {
      deps.forEach(to => {
        edges.push({
          from,
          to,
          type: 'imports',
        });
      });
    });

    // Identify clusters
    const clusters = this.identifyModuleClusters(flow);

    // External dependencies
    const externalDeps = await this.identifyExternalDependencies(flow);

    // Internal modules
    const internalModules = Array.from(flow.modules.values()).map(node => ({
      path: node.relativePath,
      exports: node.exports,
      importedBy: node.dependents.map(d => d.relativePath),
      purpose: node.purpose || 'Module',
    }));

    return {
      title: 'Dependency Graph',
      graph: { nodes, edges, clusters },
      externalDependencies: externalDeps,
      internalModules,
    };
  }

  private identifyModuleClusters(flow: ProjectFlow): ModuleCluster[] {
    const clusters: ModuleCluster[] = [];
    const modulesByDir = new Map<string, string[]>();

    // Group modules by directory
    flow.modules.forEach((_, modPath) => {
      const dir = path.dirname(modPath);
      if (!modulesByDir.has(dir)) {
        modulesByDir.set(dir, []);
      }
      modulesByDir.get(dir)?.push(modPath);
    });

    // Create clusters for directories with multiple modules
    modulesByDir.forEach((modules, dir) => {
      if (modules.length > 2) {
        clusters.push({
          name: path.basename(dir) || 'root',
          purpose: this.inferDirectoryPurpose(dir),
          modules,
        });
      }
    });

    return clusters;
  }

  private inferDirectoryPurpose(dir: string): string {
    const basename = path.basename(dir).toLowerCase();

    const purposeMap: Record<string, string> = {
      controllers: 'Request handling and routing',
      models: 'Data models and database schemas',
      services: 'Business logic and external integrations',
      utils: 'Utility functions and helpers',
      middleware: 'Request/response processing',
      components: 'UI components',
      views: 'View templates and UI',
      api: 'API endpoints',
      config: 'Configuration files',
      test: 'Test files',
    };

    return purposeMap[basename] || 'Application modules';
  }

  private async identifyExternalDependencies(flow: ProjectFlow): Promise<ExternalDep[]> {
    const deps: ExternalDep[] = [];
    const packageJsonPath = path.join(flow.projectStructure.rootDir, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      Object.entries(allDeps).forEach(([name, version]) => {
        const usedIn = Array.from(flow.modules.values())
          .filter(node => node.imports.some(imp => imp.includes(name)))
          .map(node => node.relativePath);

        if (usedIn.length > 0) {
          deps.push({
            name,
            version: version as string,
            purpose: this.inferPackagePurpose(name),
            usedIn,
          });
        }
      });
    }

    return deps;
  }

  private inferPackagePurpose(packageName: string): string {
    const purposeMap: Record<string, string> = {
      express: 'Web server framework',
      react: 'UI library',
      vue: 'UI framework',
      angular: 'Web framework',
      mongoose: 'MongoDB ODM',
      sequelize: 'SQL ORM',
      axios: 'HTTP client',
      lodash: 'Utility library',
      moment: 'Date manipulation',
      jsonwebtoken: 'JWT authentication',
      bcrypt: 'Password hashing',
      cors: 'CORS middleware',
      dotenv: 'Environment variables',
      jest: 'Testing framework',
      eslint: 'Code linting',
      prettier: 'Code formatting',
    };

    return purposeMap[packageName] || 'External dependency';
  }

  private async generateAPIReference(
    flow: ProjectFlow,
    modules: Map<string, ParsedModule>
  ): Promise<APIReferenceSection> {
    const publicFunctions: PublicFunction[] = [];
    const publicClasses: PublicClass[] = [];

    flow.modules.forEach((node) => {
      const module = modules.get(node.filePath);
      if (!module) return;

      // Find exported functions
      module.chunks
        .filter((c: any) => c.type === 'function' && module.exports.includes(c.metadata?.name || ''))
        .forEach((chunk: any) => {
          publicFunctions.push({
            name: chunk.metadata?.name || 'anonymous',
            module: node.relativePath,
            signature: this.extractSignature(chunk.content),
            description: `Function exported from ${node.name}`,
            usage: `import { ${chunk.metadata?.name} } from './${node.relativePath}';`,
          });
        });

      // Find exported classes
      module.chunks
        .filter((c: any) => c.type === 'class' && module.exports.includes(c.metadata?.name || ''))
        .forEach((chunk: any) => {
          const methods = module.chunks
            .filter((c: any) => c.type === 'method' && c.metadata?.className === chunk.metadata?.name)
            .map((c: any) => c.metadata?.methodName || '');

          publicClasses.push({
            name: chunk.metadata?.name || 'anonymous',
            module: node.relativePath,
            description: `Class exported from ${node.name}`,
            publicMethods: methods,
            usage: `import { ${chunk.metadata?.name} } from './${node.relativePath}';`,
          });
        });
    });

    return {
      title: 'API Reference',
      functions: publicFunctions,
      classes: publicClasses,
    };
  }

  private extractSignature(content: string): string {
    const lines = content.split('\n');
    const firstLine = lines[0];

    // Extract function signature
    const match = firstLine.match(/(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)(?::\s*[^{]+)?/);
    return match ? match[0] : firstLine;
  }

  private async generateDataModels(modules: Map<string, ParsedModule>): Promise<DataModelSection> {
    const models: ModelDoc[] = [];
    const databases: DatabaseInfo[] = [];

    modules.forEach(module => {
      // Find MongoDB schemas
      module.chunks
        .filter(c => c.type === 'database_schema' && c.metadata?.schemaType === 'mongoose')
        .forEach(chunk => {
          models.push({
            name: chunk.metadata?.name || 'Schema',
            type: 'Mongoose',
            fields: (chunk.metadata?.fields || []).map((field: any) => ({
              name: field.name,
              type: field.type,
              required: field.required,
              unique: field.unique,
              reference: field.ref,
            })),
            methods: chunk.metadata?.methods || [],
            validations: chunk.metadata?.validations || [],
          });
        });

      // Find SQL tables
      module.chunks
        .filter(c => c.type === 'database_table')
        .forEach(chunk => {
          const tableDoc: TableDoc = {
            name: chunk.metadata?.name || 'Table',
            columns: (chunk.metadata?.columns || []).map((col: any) => ({
              name: col.name,
              type: col.type,
              nullable: col.nullable,
              default: col.default,
              description: `Column ${col.name}`,
            })),
            indexes: chunk.metadata?.indexes || [],
            foreignKeys: [],
          };

          // Add to appropriate database
          let db = databases.find(d => d.type === 'SQL');
          if (!db) {
            db = { type: 'SQL', tables: [] };
            databases.push(db);
          }
          db.tables?.push(tableDoc);
        });
    });

    // Add MongoDB database if models exist
    if (models.some(m => m.type === 'Mongoose')) {
      databases.unshift({
        type: 'MongoDB',
        collections: models
          .filter(m => m.type === 'Mongoose')
          .map(model => ({
            name: model.name,
            schema: model.fields,
            indexes: [],
            purpose: `Store ${model.name} documents`,
          })),
      });
    }

    return {
      title: 'Data Models',
      databases,
      models,
      relationships: this.identifyRelationships(models),
    };
  }

  private identifyRelationships(models: ModelDoc[]): RelationshipDoc[] {
    const relationships: RelationshipDoc[] = [];

    models.forEach(model => {
      model.fields.forEach(field => {
        if (field.reference) {
          relationships.push({
            from: model.name,
            to: field.reference,
            type: 'one-to-many',
          });
        }
      });
    });

    return relationships;
  }

  private async generateCodeExamples(
    flow: ProjectFlow,
    modules: Map<string, ParsedModule>
  ): Promise<CodeExampleSection> {
    const examples: CodeExample[] = [];

    // Use modules for generating examples based on parsed code
    console.log(`Generating examples from ${modules.size} modules`);

    // Example: How to use the main entry point
    if (flow.entryPoints.length > 0) {
      const entry = flow.entryPoints[0];
      examples.push({
        title: 'Starting the Application',
        description: 'How to initialize and run the application',
        files: [entry.relativePath],
        code: `// Import and start the application\nimport app from './${entry.relativePath}';\n\napp.start();`,
        explanation: `This example shows how to import and start the application from the main entry point at ${entry.relativePath}`,
      });
    }

    // Example: Using a key module
    const keyModule = Array.from(flow.modules.values()).find(m =>
      m.type === 'module' && m.exports.length > 0
    );

    if (keyModule) {
      examples.push({
        title: `Using ${keyModule.name}`,
        description: `How to import and use functions from ${keyModule.name}`,
        files: [keyModule.relativePath],
        code: `import { ${keyModule.exports[0] || 'module'} } from './${keyModule.relativePath}';\n\n// Use the imported module\n${keyModule.exports[0] || 'module'}();`,
        explanation: `This example demonstrates importing and using exports from ${keyModule.relativePath}`,
      });
    }

    return {
      title: 'Code Examples',
      examples,
    };
  }

  private async writeDocumentation(doc: AIOptimizedDoc): Promise<void> {
    // Write main documentation file
    const mainDoc = this.formatMainDocument(doc);
    await fs.writeFile(path.join(this.outputDir, 'AI_PROJECT_DOCS.md'), mainDoc);

    // Write structured JSON for AI consumption
    await fs.writeJson(path.join(this.outputDir, 'project-structure.json'), doc, { spaces: 2 });

    // Write individual file docs
    const fileDocsDir = path.join(this.outputDir, 'files');
    await fs.ensureDir(fileDocsDir);

    for (const fileDoc of doc.fileDocumentation) {
      const fileName = `${fileDoc.filePath.replace(/\//g, '_')  }.md`;
      const content = this.formatFileDoc(fileDoc);
      await fs.writeFile(path.join(fileDocsDir, fileName), content);
    }

    // Write execution flow
    const flowDoc = this.formatExecutionFlow(doc.executionFlow);
    await fs.writeFile(path.join(this.outputDir, 'EXECUTION_FLOW.md'), flowDoc);

    // Write dependency graph
    const depDoc = this.formatDependencyGraph(doc.dependencies);
    await fs.writeFile(path.join(this.outputDir, 'DEPENDENCIES.md'), depDoc);
  }

  private formatMainDocument(doc: AIOptimizedDoc): string {
    const sections: string[] = [];

    // Project Overview
    sections.push(`# ${doc.projectOverview.title}\n`);
    sections.push(`## Purpose\n${doc.projectOverview.purpose}\n`);
    sections.push(`## Technology Stack\n${doc.projectOverview.techStack.map(t => `- ${t}`).join('\n')}\n`);
    sections.push(`## Entry Points\n${doc.projectOverview.entryPoints.map(ep =>
      `- **${ep.file}**: ${ep.purpose}`
    ).join('\n')}\n`);

    // Execution Flow Summary
    sections.push(`## Execution Flow\n`);
    sections.push(`${doc.executionFlow.description}\n`);
    sections.push(`### Main Flow Steps:\n`);
    doc.executionFlow.mainFlow.slice(0, 10).forEach(step => {
      sections.push(`${step.order}. **${step.file}**: ${step.action}`);
    });

    // Key Files
    sections.push(`\n## Key Files\n`);
    doc.fileDocumentation.slice(0, 10).forEach(file => {
      sections.push(`### ${file.filePath}`);
      sections.push(`**Purpose**: ${file.purpose}`);
      if (file.exports.length > 0) {
        sections.push(`**Exports**: ${file.exports.map(e => e.name).join(', ')}`);
      }
      if (file.usedBy.length > 0) {
        sections.push(`**Used by**: ${file.usedBy.slice(0, 3).join(', ')}`);
      }
      sections.push('');
    });

    // API Reference Summary
    if (doc.apiReference.functions.length > 0) {
      sections.push(`## Public API\n`);
      sections.push(`### Functions\n`);
      doc.apiReference.functions.slice(0, 5).forEach(func => {
        sections.push(`- **${func.name}** (${func.module}): ${func.description}`);
      });
    }

    // Data Models Summary
    if (doc.dataModels.models.length > 0) {
      sections.push(`\n## Data Models\n`);
      doc.dataModels.models.slice(0, 5).forEach(model => {
        sections.push(`- **${model.name}** (${model.type}): ${model.fields.length} fields`);
      });
    }

    return sections.join('\n');
  }

  private formatFileDoc(doc: FileDocSection): string {
    const sections: string[] = [];

    sections.push(`# File: ${doc.filePath}\n`);
    sections.push(`## Purpose\n${doc.purpose}\n`);

    if (doc.dependencies.length > 0) {
      sections.push(`## Dependencies\n`);
      doc.dependencies.forEach(dep => {
        sections.push(`- **${dep.path}**: ${dep.reason}`);
        if (dep.items.length > 0) {
          sections.push(`  - Imports: ${dep.items.join(', ')}`);
        }
      });
    }

    if (doc.exports.length > 0) {
      sections.push(`\n## Exports\n`);
      doc.exports.forEach(exp => {
        sections.push(`- **${exp.name}** (${exp.type}): ${exp.description}`);
      });
    }

    if (doc.functions.length > 0) {
      sections.push(`\n## Functions\n`);
      doc.functions.forEach(func => {
        sections.push(`### ${func.name}\n`);
        sections.push(`${func.purpose}\n`);
        sections.push(`**Parameters**: ${func.parameters.map(p => p.name).join(', ') || 'none'}`);
        sections.push(`**Returns**: ${func.returns}`);
      });
    }

    if (doc.classes.length > 0) {
      sections.push(`\n## Classes\n`);
      doc.classes.forEach(cls => {
        sections.push(`### ${cls.name}\n`);
        sections.push(`${cls.purpose}\n`);
        if (cls.inheritance) {
          sections.push(`**Extends**: ${cls.inheritance}`);
        }
        sections.push(`**Methods**: ${cls.methods.map(m => m.name).join(', ')}`);
      });
    }

    if (doc.usedBy.length > 0) {
      sections.push(`\n## Used By\n`);
      doc.usedBy.forEach(file => {
        sections.push(`- ${file}`);
      });
    }

    if (doc.functionFlowDiagram) {
      sections.push(`\n## Function Call Flow\n`);
      sections.push(`\`\`\`mermaid\n${doc.functionFlowDiagram}\n\`\`\`\n`);
      sections.push(`*This diagram shows the function call relationships within this file.*`);
    }

    return sections.join('\n');
  }

  private formatExecutionFlow(flow: ExecutionFlowSection): string {
    const sections: string[] = [];

    sections.push(`# ${flow.title}\n`);
    sections.push(`${flow.description}\n`);

    sections.push(`## Main Execution Flow\n`);
    flow.mainFlow.forEach(step => {
      sections.push(`### Step ${step.order}: ${step.file}\n`);
      sections.push(`**Action**: ${step.action}\n`);
      if (step.imports.length > 0) {
        sections.push(`**Imports**: ${step.imports.slice(0, 5).join(', ')}`);
      }
      if (step.exports.length > 0) {
        sections.push(`**Exports**: ${step.exports.slice(0, 5).join(', ')}`);
      }
      if (step.triggers.length > 0) {
        sections.push(`**Triggers**: ${step.triggers.slice(0, 3).join(', ')}`);
      }
      sections.push('');
    });

    return sections.join('\n');
  }

  private formatDependencyGraph(deps: DependencySection): string {
    const sections: string[] = [];

    sections.push(`# ${deps.title}\n`);

    sections.push(`## Module Clusters\n`);
    deps.graph.clusters.forEach(cluster => {
      sections.push(`### ${cluster.name}\n`);
      sections.push(`**Purpose**: ${cluster.purpose}\n`);
      sections.push(`**Modules**: ${cluster.modules.length} files\n`);
    });

    sections.push(`## External Dependencies\n`);
    deps.externalDependencies.slice(0, 10).forEach(dep => {
      sections.push(`- **${dep.name}** (${dep.version}): ${dep.purpose}`);
    });

    sections.push(`\n## Key Internal Modules\n`);
    deps.internalModules
      .filter(m => m.importedBy.length > 2)
      .slice(0, 10)
      .forEach(module => {
        sections.push(`- **${module.path}**: ${module.purpose}`);
        sections.push(`  - Imported by ${module.importedBy.length} modules`);
      });

    return sections.join('\n');
  }
}