import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ParsedModule, CodeChunk } from '../../types';

const execAsync = promisify(exec);

export interface DiagramOptions {
  format: 'png' | 'svg' | 'pdf';
  theme: 'default' | 'dark' | 'forest' | 'base';
  width: number;
  height: number;
  backgroundColor: string;
}

export interface DiagramResult {
  imagePath: string;
  mermaidCode: string;
  htmlPath?: string;
  success: boolean;
  error?: string;
}

export class VisualDiagramGenerator {
  private outputDir: string;
  private diagramsDir: string;
  private tempDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.diagramsDir = path.join(outputDir, 'diagrams');
    this.tempDir = path.join(outputDir, '.temp');
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.diagramsDir);
    await fs.ensureDir(this.tempDir);

    // Check if we can generate images
    const canGenerateImages = await this.checkDiagramGenerationCapability();
    if (!canGenerateImages) {
      console.warn('⚠️ Image generation not available, will create interactive HTML diagrams instead');
    }
  }

  async generateProjectStructureDiagram(modules: ParsedModule[], options: Partial<DiagramOptions> = {}): Promise<DiagramResult> {
    const opts = this.mergeDefaultOptions(options);

    // Group modules by directory
    const directoryMap = new Map<string, ParsedModule[]>();

    for (const module of modules) {
      const dir = path.dirname(module.path);
      if (!directoryMap.has(dir)) {
        directoryMap.set(dir, []);
      }
      directoryMap.get(dir)!.push(module);
    }

    const mermaidCode = this.generateProjectStructureMermaid(directoryMap);

    return await this.createDiagram(
      'project-structure',
      mermaidCode,
      'Project Structure Overview',
      opts
    );
  }

  async generateDependencyDiagram(modules: ParsedModule[], options: Partial<DiagramOptions> = {}): Promise<DiagramResult> {
    const opts = this.mergeDefaultOptions(options);
    const mermaidCode = this.generateDependencyMermaid(modules);

    return await this.createDiagram(
      'dependency-graph',
      mermaidCode,
      'Module Dependency Graph',
      opts
    );
  }

  async generateClassDiagram(module: ParsedModule, options: Partial<DiagramOptions> = {}): Promise<DiagramResult> {
    const opts = this.mergeDefaultOptions(options);
    const classes = module.chunks.filter(chunk => chunk.type === 'class');

    if (classes.length === 0) {
      return {
        imagePath: '',
        mermaidCode: '',
        success: false,
        error: 'No classes found in module'
      };
    }

    const mermaidCode = this.generateClassMermaid(classes);

    return await this.createDiagram(
      `class-diagram-${this.sanitizeFileName(module.name)}`,
      mermaidCode,
      `Class Diagram - ${module.name}`,
      opts
    );
  }

  async generateFunctionFlowDiagram(module: ParsedModule, options: Partial<DiagramOptions> = {}): Promise<DiagramResult> {
    const opts = this.mergeDefaultOptions(options);
    const functions = module.chunks.filter(chunk => chunk.type === 'function');

    if (functions.length === 0) {
      return {
        imagePath: '',
        mermaidCode: '',
        success: false,
        error: 'No functions found in module'
      };
    }

    const mermaidCode = this.generateFunctionFlowMermaid(functions);

    return await this.createDiagram(
      `function-flow-${this.sanitizeFileName(module.name)}`,
      mermaidCode,
      `Function Flow - ${module.name}`,
      opts
    );
  }

  async generateDatabaseERDiagram(sqlModules: ParsedModule[], options: Partial<DiagramOptions> = {}): Promise<DiagramResult> {
    const opts = this.mergeDefaultOptions(options);
    const tables = sqlModules.flatMap(m => m.chunks.filter(c => c.type === 'database_table'));

    if (tables.length === 0) {
      return {
        imagePath: '',
        mermaidCode: '',
        success: false,
        error: 'No database tables found'
      };
    }

    const mermaidCode = this.generateDatabaseERMermaid(tables);

    return await this.createDiagram(
      'database-er-diagram',
      mermaidCode,
      'Database Entity Relationship Diagram',
      opts
    );
  }

  async generateSystemArchitectureDiagram(modules: ParsedModule[], options: Partial<DiagramOptions> = {}): Promise<DiagramResult> {
    const opts = this.mergeDefaultOptions(options);
    const mermaidCode = this.generateSystemArchitectureMermaid(modules);

    return await this.createDiagram(
      'system-architecture',
      mermaidCode,
      'System Architecture Overview',
      opts
    );
  }

  private async createDiagram(name: string, mermaidCode: string, title: string, options: DiagramOptions): Promise<DiagramResult> {
    const diagramId = this.sanitizeFileName(name);
    const mermaidFile = path.join(this.tempDir, `${diagramId}.mmd`);
    const imageFile = path.join(this.diagramsDir, `${diagramId}.${options.format}`);
    const htmlFile = path.join(this.diagramsDir, `${diagramId}.html`);

    try {
      // Write mermaid code to file
      await fs.writeFile(mermaidFile, mermaidCode, 'utf8');

      let success = false;
      let error = '';

      // Try to generate image using mermaid CLI
      try {
        await this.generateImageWithMermaidCLI(mermaidFile, imageFile, options);
        success = true;
        console.log(`✅ Generated diagram image: ${path.basename(imageFile)}`);
      } catch (cliError) {
        console.warn(`⚠️ Mermaid CLI failed: ${cliError instanceof Error ? cliError.message : String(cliError)}`);

        // Fallback to Puppeteer if available
        try {
          await this.generateImageWithPuppeteer(mermaidCode, imageFile, options);
          success = true;
          console.log(`✅ Generated diagram image with Puppeteer: ${path.basename(imageFile)}`);
        } catch (puppeteerError) {
          console.warn(`⚠️ Puppeteer fallback failed: ${puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError)}`);
          error = `Both Mermaid CLI and Puppeteer failed`;
        }
      }

      // Always create interactive HTML version
      const htmlContent = this.generateInteractiveHTML(mermaidCode, title, options);
      await fs.writeFile(htmlFile, htmlContent, 'utf8');
      console.log(`✅ Generated interactive diagram: ${path.basename(htmlFile)}`);

      return {
        imagePath: success ? imageFile : '',
        mermaidCode,
        htmlPath: htmlFile,
        success,
        error: success ? undefined : error
      };

    } catch (error) {
      console.error(`❌ Failed to create diagram ${name}:`, error);
      return {
        imagePath: '',
        mermaidCode,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async generateImageWithMermaidCLI(mermaidFile: string, outputFile: string, options: DiagramOptions): Promise<void> {
    const configFile = path.join(this.tempDir, 'mermaid-config.json');
    const config = {
      theme: options.theme,
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor
    };

    await fs.writeFile(configFile, JSON.stringify(config, null, 2));

    const command = `npx @mermaid-js/mermaid-cli -i "${mermaidFile}" -o "${outputFile}" -t ${options.theme} -w ${options.width} -H ${options.height} -b "${options.backgroundColor}"`;

    try {
      await execAsync(command, { timeout: 30000 });
    } catch {
      // Try alternative command format
      const altCommand = `mmdc -i "${mermaidFile}" -o "${outputFile}" -t ${options.theme}`;
      await execAsync(altCommand, { timeout: 30000 });
    }
  }

  private async generateImageWithPuppeteer(mermaidCode: string, outputFile: string, options: DiagramOptions): Promise<void> {
    // This would require puppeteer to be installed
    const puppeteerScript = `
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width: ${options.width}, height: ${options.height} });

  const html = \`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    </head>
    <body style="background-color: ${options.backgroundColor};">
      <div class="mermaid">
        \${mermaidCode}
      </div>
      <script>
        mermaid.initialize({ theme: '${options.theme}' });
      </script>
    </body>
    </html>
  \`;

  await page.setContent(html);
  await page.waitForSelector('.mermaid svg');
  await page.screenshot({ path: '${outputFile}', type: '${options.format}' });

  await browser.close();
})();
`;

    const scriptFile = path.join(this.tempDir, 'generate-diagram.js');
    const scriptContent = puppeteerScript.replace('${mermaidCode}', mermaidCode.replace(/`/g, '\\`'));

    await fs.writeFile(scriptFile, scriptContent);
    await execAsync(`node "${scriptFile}"`, { timeout: 30000 });
  }

  private generateInteractiveHTML(mermaidCode: string, title: string, options: DiagramOptions): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: ${options.backgroundColor};
            color: ${options.theme === 'dark' ? '#ffffff' : '#000000'};
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
        }
        .diagram-container {
            text-align: center;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px 0;
        }
        .controls {
            text-align: center;
            margin: 20px 0;
        }
        button {
            background: #007acc;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 0 5px;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: #005a9e;
        }
        .mermaid {
            overflow: auto;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .diagram-container { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>

        <div class="controls">
            <button onclick="zoomIn()">Zoom In</button>
            <button onclick="zoomOut()">Zoom Out</button>
            <button onclick="resetZoom()">Reset</button>
            <button onclick="downloadSVG()">Download SVG</button>
        </div>

        <div class="diagram-container">
            <div class="mermaid" id="diagram">
${mermaidCode}
            </div>
        </div>
    </div>

    <script>
        mermaid.initialize({
            theme: '${options.theme}',
            startOnLoad: true,
            securityLevel: 'loose',
            flowchart: { useMaxWidth: false },
            sequence: { useMaxWidth: false }
        });

        let currentScale = 1;

        function zoomIn() {
            currentScale += 0.2;
            applyZoom();
        }

        function zoomOut() {
            currentScale = Math.max(0.2, currentScale - 0.2);
            applyZoom();
        }

        function resetZoom() {
            currentScale = 1;
            applyZoom();
        }

        function applyZoom() {
            const diagram = document.getElementById('diagram');
            diagram.style.transform = \`scale(\${currentScale})\`;
        }

        function downloadSVG() {
            const svg = document.querySelector('#diagram svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                const svgUrl = URL.createObjectURL(svgBlob);
                const downloadLink = document.createElement('a');
                downloadLink.href = svgUrl;
                downloadLink.download = '${this.sanitizeFileName(title)}.svg';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
        }
    </script>
</body>
</html>`;
  }

  private generateProjectStructureMermaid(directoryMap: Map<string, ParsedModule[]>): string {
    let mermaid = `graph TD\n`;
    let nodeId = 0;

    for (const [directory, modules] of directoryMap.entries()) {
      const dirId = `dir${nodeId++}`;
      const dirName = directory === '.' ? 'Root' : path.basename(directory);
      mermaid += `    ${dirId}["📁 ${dirName}"]\n`;

      for (const module of modules.slice(0, 8)) { // Limit for readability
        const moduleId = `mod${nodeId++}`;
        const icon = this.getFileIcon(module.language);
        mermaid += `    ${moduleId}["${icon} ${module.name}"]\n`;
        mermaid += `    ${dirId} --> ${moduleId}\n`;
      }

      if (modules.length > 8) {
        const moreId = `more${nodeId++}`;
        mermaid += `    ${moreId}["... ${modules.length - 8} more files"]\n`;
        mermaid += `    ${dirId} --> ${moreId}\n`;
      }
    }

    return mermaid;
  }

  private generateDependencyMermaid(modules: ParsedModule[]): string {
    let mermaid = `graph LR\n`;
    const addedNodes = new Set<string>();

    for (const module of modules.slice(0, 20)) { // Limit for readability
      const moduleId = this.sanitizeNodeId(module.name);

      if (!addedNodes.has(moduleId)) {
        const icon = this.getFileIcon(module.language);
        mermaid += `    ${moduleId}["${icon} ${module.name}"]\n`;
        addedNodes.add(moduleId);
      }

      for (const dep of module.dependencies.slice(0, 3)) {
        const targetModule = modules.find(m => m.path === dep.target);
        if (targetModule) {
          const targetId = this.sanitizeNodeId(targetModule.name);

          if (!addedNodes.has(targetId)) {
            const targetIcon = this.getFileIcon(targetModule.language);
            mermaid += `    ${targetId}["${targetIcon} ${targetModule.name}"]\n`;
            addedNodes.add(targetId);
          }

          const edgeStyle = dep.type === 'import' ? '' : '-.';
          mermaid += `    ${moduleId} ${edgeStyle}-> ${targetId}\n`;
        }
      }
    }

    return mermaid;
  }

  private generateClassMermaid(classes: CodeChunk[]): string {
    let mermaid = `classDiagram\n`;

    for (const cls of classes) {
      const className = cls.id.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaid += `    class ${className} {\n`;

      // Try to extract methods from class content
      const methods = this.extractMethodsFromClass(cls.content);
      for (const method of methods) {
        mermaid += `        ${method}\n`;
      }

      mermaid += `    }\n`;
    }

    // Add relationships if we can detect them
    for (let i = 0; i < classes.length - 1; i++) {
      const class1 = classes[i].id.replace(/[^a-zA-Z0-9_]/g, '_');
      const class2 = classes[i + 1].id.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaid += `    ${class1} --|> ${class2} : extends\n`;
    }

    return mermaid;
  }

  private generateFunctionFlowMermaid(functions: CodeChunk[]): string {
    let mermaid = `flowchart TD\n`;
    let nodeId = 0;

    for (const func of functions.slice(0, 15)) { // Limit for readability
      const funcId = `fn${nodeId++}`;
      mermaid += `    ${funcId}["🔧 ${func.id}"]\n`;

      // Connect functions that might call each other
      for (const other of functions) {
        if (func !== other && func.content.includes(other.id)) {
          const otherId = `fn${functions.indexOf(other)}`;
          mermaid += `    ${funcId} --> ${otherId}\n`;
        }
      }
    }

    return mermaid;
  }

  private generateDatabaseERMermaid(tables: CodeChunk[]): string {
    let mermaid = `erDiagram\n`;

    for (const table of tables.slice(0, 10)) { // Limit for readability
      const tableName = table.id.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      mermaid += `    ${tableName} {\n`;
      mermaid += `        id int PK "Primary Key"\n`;
      mermaid += `        name string\n`;
      mermaid += `        created_at datetime\n`;
      mermaid += `        updated_at datetime\n`;
      mermaid += `    }\n`;
    }

    // Add some example relationships
    for (let i = 0; i < Math.min(tables.length - 1, 3); i++) {
      const table1 = tables[i].id.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      const table2 = tables[i + 1].id.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      mermaid += `    ${table1} ||--o{ ${table2} : "has many"\n`;
    }

    return mermaid;
  }

  private generateSystemArchitectureMermaid(modules: ParsedModule[]): string {
    // Group modules into layers
    const layers = {
      presentation: modules.filter(m => m.path.includes('ui') || m.path.includes('component') || m.path.includes('view')),
      business: modules.filter(m => m.path.includes('service') || m.path.includes('logic') || m.path.includes('core')),
      data: modules.filter(m => m.path.includes('data') || m.path.includes('db') || m.path.includes('model')),
      api: modules.filter(m => m.path.includes('api') || m.path.includes('route') || m.path.includes('controller'))
    };

    let mermaid = `graph TB\n`;
    mermaid += `    subgraph "Presentation Layer"\n`;
    for (const module of layers.presentation.slice(0, 3)) {
      mermaid += `        P${layers.presentation.indexOf(module)}["📱 ${module.name}"]\n`;
    }
    mermaid += `    end\n`;

    mermaid += `    subgraph "API Layer"\n`;
    for (const module of layers.api.slice(0, 3)) {
      mermaid += `        A${layers.api.indexOf(module)}["🌐 ${module.name}"]\n`;
    }
    mermaid += `    end\n`;

    mermaid += `    subgraph "Business Layer"\n`;
    for (const module of layers.business.slice(0, 3)) {
      mermaid += `        B${layers.business.indexOf(module)}["⚙️ ${module.name}"]\n`;
    }
    mermaid += `    end\n`;

    mermaid += `    subgraph "Data Layer"\n`;
    for (const module of layers.data.slice(0, 3)) {
      mermaid += `        D${layers.data.indexOf(module)}["🗄️ ${module.name}"]\n`;
    }
    mermaid += `    end\n`;

    // Add connections between layers
    if (layers.presentation.length > 0 && layers.api.length > 0) {
      mermaid += `    P0 --> A0\n`;
    }
    if (layers.api.length > 0 && layers.business.length > 0) {
      mermaid += `    A0 --> B0\n`;
    }
    if (layers.business.length > 0 && layers.data.length > 0) {
      mermaid += `    B0 --> D0\n`;
    }

    return mermaid;
  }

  private async checkDiagramGenerationCapability(): Promise<boolean> {
    try {
      // Check if mermaid CLI is available
      await execAsync('npx @mermaid-js/mermaid-cli --version', { timeout: 5000 });
      return true;
    } catch {
      try {
        // Check alternative command
        await execAsync('mmdc --version', { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  private mergeDefaultOptions(options: Partial<DiagramOptions>): DiagramOptions {
    return {
      format: options.format || 'png',
      theme: options.theme || 'default',
      width: options.width || 1200,
      height: options.height || 800,
      backgroundColor: options.backgroundColor || '#ffffff',
      ...options
    };
  }

  private getFileIcon(language: string): string {
    const icons: { [key: string]: string } = {
      javascript: '📄',
      typescript: '📘',
      python: '🐍',
      java: '☕',
      go: '🐹',
      rust: '🦀',
      sql: '🗄️',
      cpp: '⚡',
      unknown: '📄'
    };
    return icons[language.toLowerCase()] || icons.unknown;
  }

  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/--+/g, '-');
  }

  private sanitizeNodeId(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/__+/g, '_');
  }

  private extractMethodsFromClass(classContent: string): string[] {
    const methods: string[] = [];

    // Simple regex to find method-like patterns
    const methodRegex = /(?:public|private|protected)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)/g;
    let match;

    while ((match = methodRegex.exec(classContent)) !== null && methods.length < 5) {
      methods.push(`+${match[1]}()`);
    }

    if (methods.length === 0) {
      methods.push('+method()');
    }

    return methods;
  }
}