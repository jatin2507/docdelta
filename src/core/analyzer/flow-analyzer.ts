import * as path from 'path';
import * as fs from 'fs-extra';
import { ParsedModule, Language } from '../../types';
import { ParserFactory } from '../../core/parser';
import { FileUtils } from '../../utils/file-utils';

export interface FileNode {
  filePath: string;
  relativePath: string;
  name: string;
  type: 'entry' | 'module' | 'component' | 'utility' | 'config' | 'test' | 'unknown';
  language: Language;
  imports: string[];
  exports: string[];
  dependencies: FileNode[];
  dependents: FileNode[];
  depth: number;
  purpose?: string;
  description?: string;
  functions?: FunctionInfo[];
  classes?: ClassInfo[];
  isEntryPoint: boolean;
}

export interface FunctionInfo {
  name: string;
  params: string[];
  returnType?: string;
  description?: string;
  calledBy: string[];
  calls: string[];
}

export interface ClassInfo {
  name: string;
  methods: string[];
  properties: string[];
  extends?: string;
  implements?: string[];
  description?: string;
}

export interface ProjectFlow {
  entryPoints: FileNode[];
  modules: Map<string, FileNode>;
  dependencyGraph: Map<string, Set<string>>;
  executionFlow: ExecutionFlow[];
  projectStructure: ProjectStructure;
}

export interface ExecutionFlow {
  step: number;
  file: string;
  action: string;
  imports: string[];
  exports: string[];
  nextSteps: string[];
}

export interface ProjectStructure {
  rootDir: string;
  srcDir?: string;
  testDir?: string;
  configFiles: string[];
  entryFiles: string[];
  moduleCount: number;
  totalFiles: number;
  languages: Language[];
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  framework?: string;
}

export class FlowAnalyzer {
  private modules: Map<string, ParsedModule> = new Map();
  private fileNodes: Map<string, FileNode> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private projectRoot: string;
  private entryPoints: string[] = [];

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  async analyzeProject(patterns?: string[]): Promise<ProjectFlow> {
    // Step 1: Identify project structure and entry points
    const projectStructure = await this.identifyProjectStructure();

    // Step 2: Find and set entry points
    this.entryPoints = await this.findEntryPoints(projectStructure);

    // Step 3: Parse all modules
    await this.parseAllModules(patterns);

    // Step 4: Build dependency graph
    this.buildDependencyGraph();

    // Step 5: Analyze flow from entry points
    const entryPointNodes = await this.analyzeFromEntryPoints();

    // Step 6: Build execution flow
    const executionFlow = this.buildExecutionFlow(entryPointNodes);

    // Step 7: Enrich with purpose and descriptions
    await this.enrichFileNodes();

    return {
      entryPoints: entryPointNodes,
      modules: this.fileNodes,
      dependencyGraph: this.dependencyGraph,
      executionFlow,
      projectStructure,
    };
  }

  private async identifyProjectStructure(): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      rootDir: this.projectRoot,
      configFiles: [],
      entryFiles: [],
      moduleCount: 0,
      totalFiles: 0,
      languages: [],
      packageManager: await this.detectPackageManager(),
      framework: await this.detectFramework(),
    };

    // Find source directory
    const possibleSrcDirs = ['src', 'lib', 'app', 'source'];
    for (const dir of possibleSrcDirs) {
      const srcPath = path.join(this.projectRoot, dir);
      if (await fs.pathExists(srcPath)) {
        structure.srcDir = dir;
        break;
      }
    }

    // Find test directory
    const possibleTestDirs = ['test', 'tests', '__tests__', 'spec'];
    for (const dir of possibleTestDirs) {
      const testPath = path.join(this.projectRoot, dir);
      if (await fs.pathExists(testPath)) {
        structure.testDir = dir;
        break;
      }
    }

    // Find config files
    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'webpack.config.*',
      'vite.config.*',
      '.eslintrc.*',
      'jest.config.*',
      'babel.config.*',
    ];

    for (const pattern of configPatterns) {
      const files = await FileUtils.findFiles(this.projectRoot, [pattern], ['node_modules/**']);
      structure.configFiles.push(...files);
    }

    return structure;
  }

  private async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm' | undefined> {
    if (await fs.pathExists(path.join(this.projectRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (await fs.pathExists(path.join(this.projectRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    if (await fs.pathExists(path.join(this.projectRoot, 'package-lock.json'))) {
      return 'npm';
    }
    return undefined;
  }

  private async detectFramework(): Promise<string | undefined> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Detect common frameworks
      if (deps['next']) return 'Next.js';
      if (deps['react']) return 'React';
      if (deps['vue']) return 'Vue';
      if (deps['@angular/core']) return 'Angular';
      if (deps['svelte']) return 'Svelte';
      if (deps['express']) return 'Express';
      if (deps['fastify']) return 'Fastify';
      if (deps['koa']) return 'Koa';
      if (deps['nestjs']) return 'NestJS';
    }

    return undefined;
  }

  private async findEntryPoints(structure: ProjectStructure): Promise<string[]> {
    const entryPoints: string[] = [];

    // Check package.json for main/module/bin entries
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);

      if (packageJson.main) {
        entryPoints.push(path.join(this.projectRoot, packageJson.main));
      }
      if (packageJson.module) {
        entryPoints.push(path.join(this.projectRoot, packageJson.module));
      }
      if (packageJson.bin) {
        if (typeof packageJson.bin === 'string') {
          entryPoints.push(path.join(this.projectRoot, packageJson.bin));
        } else if (typeof packageJson.bin === 'object') {
          Object.values(packageJson.bin).forEach((binPath: any) => {
            entryPoints.push(path.join(this.projectRoot, binPath));
          });
        }
      }
    }

    // Common entry point patterns
    const commonEntryPoints = [
      'index.js',
      'index.ts',
      'main.js',
      'main.ts',
      'app.js',
      'app.ts',
      'server.js',
      'server.ts',
      'src/index.js',
      'src/index.ts',
      'src/main.js',
      'src/main.ts',
      'src/app.js',
      'src/app.ts',
    ];

    for (const entry of commonEntryPoints) {
      const fullPath = path.join(this.projectRoot, entry);
      if (await fs.pathExists(fullPath) && !entryPoints.includes(fullPath)) {
        entryPoints.push(fullPath);
      }
    }

    // Framework-specific entry points
    if (structure.framework === 'Next.js') {
      const pagesDir = path.join(this.projectRoot, 'pages');
      const appDir = path.join(this.projectRoot, 'app');

      if (await fs.pathExists(pagesDir)) {
        const indexFile = path.join(pagesDir, 'index.tsx');
        if (await fs.pathExists(indexFile)) {
          entryPoints.push(indexFile);
        }
      }

      if (await fs.pathExists(appDir)) {
        const layoutFile = path.join(appDir, 'layout.tsx');
        if (await fs.pathExists(layoutFile)) {
          entryPoints.push(layoutFile);
        }
      }
    }

    return entryPoints;
  }

  private async parseAllModules(patterns?: string[]): Promise<void> {
    const defaultPatterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.go',
      '**/*.java',
    ];

    const files = await FileUtils.findFiles(
      this.projectRoot,
      patterns || defaultPatterns,
      [
        // Node.js
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.nyc_output/**',

        // Python
        '**/venv/**',
        '**/env/**',
        '**/__pycache__/**',
        '**/.pytest_cache/**',
        '**/site-packages/**',
        '**/.venv/**',
        '**/virtualenv/**',
        '**/*.pyc',
        '**/*.pyo',
        '**/*.pyd',

        // Version Control
        '**/.git/**',
        '**/.svn/**',
        '**/.hg/**',

        // IDEs and Editors
        '**/.vscode/**',
        '**/.idea/**',
        '**/.vs/**',
        '**/*.swp',
        '**/*.swo',

        // OS Generated
        '**/.DS_Store',
        '**/Thumbs.db',

        // Cache and temporary
        '**/.cache/**',
        '**/tmp/**',
        '**/temp/**',
        '**/.tmp/**',

        // Dependencies
        '**/vendor/**',
        '**/packages/**',
        '**/libs/**',
        '**/third_party/**',

        // Language specific
        '**/target/**',
        '**/bin/**',
        '**/obj/**',
        '**/gems/**',

        // Logs and databases
        '**/*.log',
        '**/*.sqlite',
        '**/*.db',
      ]
    );

    for (const file of files) {
      const module = await ParserFactory.parseFile(file);
      if (module) {
        this.modules.set(file, module);
      }
    }
  }

  private buildDependencyGraph(): void {
    this.modules.forEach((module, filePath) => {
      const normalizedPath = this.normalizePath(filePath);

      if (!this.dependencyGraph.has(normalizedPath)) {
        this.dependencyGraph.set(normalizedPath, new Set());
      }

      module.imports.forEach((importPath) => {
        const resolvedPath = this.resolveImportPath(filePath, importPath);
        if (resolvedPath) {
          this.dependencyGraph.get(normalizedPath)?.add(resolvedPath);
        }
      });
    });
  }

  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Skip node_modules imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    const dir = path.dirname(fromFile);
    const resolvedPath = path.resolve(dir, importPath);

    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', ''];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (this.modules.has(fullPath)) {
        return this.normalizePath(fullPath);
      }

      // Try index file in directory
      const indexPath = path.join(resolvedPath, `index${ext}`);
      if (this.modules.has(indexPath)) {
        return this.normalizePath(indexPath);
      }
    }

    return null;
  }

  private normalizePath(filePath: string): string {
    return path.relative(this.projectRoot, filePath).replace(/\\/g, '/');
  }

  private async analyzeFromEntryPoints(): Promise<FileNode[]> {
    const entryNodes: FileNode[] = [];
    const visited = new Set<string>();

    for (const entryPath of this.entryPoints) {
      if (this.modules.has(entryPath)) {
        const node = await this.createFileNode(entryPath, 0, visited, true);
        if (node) {
          entryNodes.push(node);
          await this.traverseDependencies(node, visited, 1);
        }
      }
    }

    return entryNodes;
  }

  private async createFileNode(
    filePath: string,
    depth: number,
    visited: Set<string>,
    isEntry: boolean = false
  ): Promise<FileNode | null> {
    const normalizedPath = this.normalizePath(filePath);

    if (visited.has(normalizedPath)) {
      return this.fileNodes.get(normalizedPath) || null;
    }

    visited.add(normalizedPath);
    const module = this.modules.get(filePath);

    if (!module) return null;

    const node: FileNode = {
      filePath,
      relativePath: normalizedPath,
      name: path.basename(filePath),
      type: this.determineFileType(filePath, module),
      language: module.language,
      imports: module.imports,
      exports: module.exports,
      dependencies: [],
      dependents: [],
      depth,
      isEntryPoint: isEntry,
      functions: this.extractFunctions(module),
      classes: this.extractClasses(module),
    };

    this.fileNodes.set(normalizedPath, node);
    return node;
  }

  private determineFileType(
    filePath: string,
    module: ParsedModule
  ): 'entry' | 'module' | 'component' | 'utility' | 'config' | 'test' | 'unknown' {
    const fileName = path.basename(filePath).toLowerCase();
    const dirName = path.dirname(filePath).toLowerCase();

    // Check if it's an entry point
    if (this.entryPoints.includes(filePath)) {
      return 'entry';
    }

    // Check for test files
    if (fileName.includes('.test.') || fileName.includes('.spec.') || dirName.includes('test')) {
      return 'test';
    }

    // Check for config files
    if (fileName.includes('config') || fileName.includes('settings') || fileName.includes('.env')) {
      return 'config';
    }

    // Check for React/Vue components
    if (module.chunks.some(c => c.content.includes('React.Component') || c.content.includes('useState'))) {
      return 'component';
    }

    // Check for utility files
    if (dirName.includes('util') || dirName.includes('helper') || fileName.includes('util') || fileName.includes('helper')) {
      return 'utility';
    }

    // Default to module if has exports
    if (module.exports.length > 0) {
      return 'module';
    }

    return 'unknown';
  }

  private extractFunctions(module: ParsedModule): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    module.chunks
      .filter(c => c.type === 'function' || c.type === 'method')
      .forEach(chunk => {
        functions.push({
          name: chunk.metadata?.name || 'anonymous',
          params: this.extractParams(chunk.content),
          returnType: this.extractReturnType(chunk.content),
          calledBy: [],
          calls: this.extractFunctionCalls(chunk.content),
        });
      });

    return functions;
  }

  private extractClasses(module: ParsedModule): ClassInfo[] {
    const classes: ClassInfo[] = [];

    module.chunks
      .filter(c => c.type === 'class')
      .forEach(chunk => {
        const methods = module.chunks
          .filter(c => c.type === 'method' && c.metadata?.className === chunk.metadata?.name)
          .map(c => c.metadata?.methodName || '');

        classes.push({
          name: chunk.metadata?.name || 'anonymous',
          methods,
          properties: this.extractProperties(chunk.content),
          extends: this.extractExtends(chunk.content),
          implements: this.extractImplements(chunk.content),
        });
      });

    return classes;
  }

  private extractParams(content: string): string[] {
    const match = content.match(/\(([^)]*)\)/);
    if (match) {
      return match[1].split(',').map(p => p.trim()).filter(p => p);
    }
    return [];
  }

  private extractReturnType(content: string): string | undefined {
    const match = content.match(/\):\s*([^{]+)/);
    return match ? match[1].trim() : undefined;
  }

  private extractFunctionCalls(content: string): string[] {
    const calls: string[] = [];
    const callRegex = /(\w+)\s*\(/g;
    let match;

    while ((match = callRegex.exec(content)) !== null) {
      const funcName = match[1];
      if (!['function', 'if', 'for', 'while', 'switch', 'catch'].includes(funcName)) {
        calls.push(funcName);
      }
    }

    return [...new Set(calls)];
  }

  private extractProperties(content: string): string[] {
    const properties: string[] = [];
    const propRegex = /(?:public|private|protected)?\s*(\w+)\s*[=:]/g;
    let match;

    while ((match = propRegex.exec(content)) !== null) {
      properties.push(match[1]);
    }

    return properties;
  }

  private extractExtends(content: string): string | undefined {
    const match = content.match(/extends\s+(\w+)/);
    return match ? match[1] : undefined;
  }

  private extractImplements(content: string): string[] {
    const match = content.match(/implements\s+([^{]+)/);
    if (match) {
      return match[1].split(',').map(i => i.trim());
    }
    return [];
  }

  private async traverseDependencies(
    node: FileNode,
    visited: Set<string>,
    depth: number
  ): Promise<void> {
    const deps = this.dependencyGraph.get(node.relativePath);

    if (!deps) return;

    for (const depPath of deps) {
      const fullPath = path.join(this.projectRoot, depPath);
      let depNode: FileNode | undefined = this.fileNodes.get(depPath);

      if (!depNode) {
        depNode = await this.createFileNode(fullPath, depth, visited) || undefined;
      }

      if (depNode) {
        node.dependencies.push(depNode);
        depNode.dependents.push(node);

        if (!visited.has(depPath)) {
          await this.traverseDependencies(depNode, visited, depth + 1);
        }
      }
    }
  }

  private buildExecutionFlow(entryNodes: FileNode[]): ExecutionFlow[] {
    const flow: ExecutionFlow[] = [];
    const visited = new Set<string>();
    let step = 0;

    const traverse = (node: FileNode) => {
      if (visited.has(node.relativePath)) return;

      visited.add(node.relativePath);

      const executionStep: ExecutionFlow = {
        step: step++,
        file: node.relativePath,
        action: this.describeFileAction(node),
        imports: node.imports,
        exports: node.exports,
        nextSteps: node.dependencies.map(d => d.relativePath),
      };

      flow.push(executionStep);

      node.dependencies.forEach(dep => traverse(dep));
    };

    entryNodes.forEach(entry => traverse(entry));

    return flow;
  }

  private describeFileAction(node: FileNode): string {
    switch (node.type) {
      case 'entry':
        return `Entry point - Initializes application and imports core modules`;
      case 'module':
        return `Module - Exports ${node.exports.length} items for use by other modules`;
      case 'component':
        return `Component - Provides UI component with ${node.functions?.length || 0} methods`;
      case 'utility':
        return `Utility - Provides helper functions and utilities`;
      case 'config':
        return `Configuration - Defines settings and environment variables`;
      case 'test':
        return `Test - Contains test cases for validating functionality`;
      default:
        return `File - General purpose module`;
    }
  }

  private async enrichFileNodes(): Promise<void> {
    for (const [filePath, node] of this.fileNodes) {
      node.purpose = this.inferFilePurpose(node);
      node.description = this.generateFileDescription(node);
      console.log(`Enriched file node: ${filePath}`);
    }
  }

  private inferFilePurpose(node: FileNode): string {
    const fileName = path.basename(node.filePath, path.extname(node.filePath));

    // Common patterns
    if (fileName.includes('route') || fileName.includes('router')) {
      return 'Defines application routes and handles HTTP requests';
    }
    if (fileName.includes('controller')) {
      return 'Handles business logic and coordinates between models and views';
    }
    if (fileName.includes('model')) {
      return 'Defines data structure and database interactions';
    }
    if (fileName.includes('service')) {
      return 'Provides business logic and external service integrations';
    }
    if (fileName.includes('middleware')) {
      return 'Processes requests before they reach route handlers';
    }
    if (fileName.includes('auth')) {
      return 'Handles authentication and authorization';
    }
    if (fileName.includes('database') || fileName.includes('db')) {
      return 'Manages database connections and operations';
    }
    if (fileName.includes('api')) {
      return 'Provides API endpoints and handles external requests';
    }

    // Based on exports
    if (node.exports.length > 5) {
      return 'Core module providing multiple exports for application functionality';
    }

    return 'Supporting module for application functionality';
  }

  private generateFileDescription(node: FileNode): string {
    const parts: string[] = [];

    parts.push(`This ${node.type} file is written in ${node.language}.`);

    if (node.isEntryPoint) {
      parts.push(`It serves as an entry point for the application.`);
    }

    if (node.imports.length > 0) {
      parts.push(`It imports ${node.imports.length} modules.`);
    }

    if (node.exports.length > 0) {
      parts.push(`It exports ${node.exports.length} items.`);
    }

    if (node.functions && node.functions.length > 0) {
      parts.push(`Contains ${node.functions.length} functions.`);
    }

    if (node.classes && node.classes.length > 0) {
      parts.push(`Defines ${node.classes.length} classes.`);
    }

    if (node.dependencies.length > 0) {
      parts.push(`Depends on ${node.dependencies.length} other modules.`);
    }

    if (node.dependents.length > 0) {
      parts.push(`Used by ${node.dependents.length} other modules.`);
    }

    return parts.join(' ');
  }
}