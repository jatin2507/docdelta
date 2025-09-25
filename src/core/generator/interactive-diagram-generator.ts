import * as fs from 'fs-extra';
import * as path from 'path';
import { ParsedModule } from '../../types';

export interface InteractiveDiagramOptions {
  theme: 'light' | 'dark';
  width: string;
  height: string;
  animated: boolean;
}

export interface InteractiveDiagramResult {
  htmlPath: string;
  mermaidCode: string;
  success: boolean;
  error?: string;
}

export class InteractiveDiagramGenerator {
  private outputDir: string;
  private diagramsDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.diagramsDir = path.join(outputDir, 'diagrams');
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.diagramsDir);
  }

  async generateProjectStructureDiagram(
    modules: ParsedModule[],
    options: Partial<InteractiveDiagramOptions> = {}
  ): Promise<InteractiveDiagramResult> {
    const opts = this.mergeDefaultOptions(options);

    try {
      // Generate Mermaid code for project structure
      const mermaidCode = this.generateProjectStructureMermaid(modules);

      // Create interactive HTML with embedded Mermaid
      const htmlContent = this.createInteractiveHTML(
        mermaidCode,
        'Project Structure',
        'This diagram shows the overall project structure and module relationships.',
        opts
      );

      const htmlPath = path.join(this.diagramsDir, 'project-structure.html');
      await fs.writeFile(htmlPath, htmlContent);

      console.log('✅ Generated interactive diagram: project-structure.html');

      return {
        htmlPath,
        mermaidCode,
        success: true
      };
    } catch (error) {
      console.error('Failed to generate project structure diagram:', error);
      return {
        htmlPath: '',
        mermaidCode: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async generateDependencyDiagram(
    modules: ParsedModule[],
    options: Partial<InteractiveDiagramOptions> = {}
  ): Promise<InteractiveDiagramResult> {
    const opts = this.mergeDefaultOptions(options);

    try {
      const mermaidCode = this.generateDependencyMermaid(modules);

      const htmlContent = this.createInteractiveHTML(
        mermaidCode,
        'Dependency Graph',
        'This diagram shows the dependencies between different modules in the project.',
        opts
      );

      const htmlPath = path.join(this.diagramsDir, 'dependency-graph.html');
      await fs.writeFile(htmlPath, htmlContent);

      console.log('✅ Generated interactive diagram: dependency-graph.html');

      return {
        htmlPath,
        mermaidCode,
        success: true
      };
    } catch (error) {
      console.error('Failed to generate dependency diagram:', error);
      return {
        htmlPath: '',
        mermaidCode: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async generateSystemArchitectureDiagram(
    modules: ParsedModule[],
    options: Partial<InteractiveDiagramOptions> = {}
  ): Promise<InteractiveDiagramResult> {
    const opts = this.mergeDefaultOptions(options);

    try {
      const mermaidCode = this.generateSystemArchitectureMermaid(modules);

      const htmlContent = this.createInteractiveHTML(
        mermaidCode,
        'System Architecture',
        'This diagram illustrates the high-level system architecture and component relationships.',
        opts
      );

      const htmlPath = path.join(this.diagramsDir, 'system-architecture.html');
      await fs.writeFile(htmlPath, htmlContent);

      console.log('✅ Generated interactive diagram: system-architecture.html');

      return {
        htmlPath,
        mermaidCode,
        success: true
      };
    } catch (error) {
      console.error('Failed to generate system architecture diagram:', error);
      return {
        htmlPath: '',
        mermaidCode: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private generateProjectStructureMermaid(modules: ParsedModule[]): string {
    if (modules.length === 0) {
      return `graph TD
    A[Empty Project] --> B[No Modules Found]
    B --> C[Add Code Files]
    C --> D[Generate Documentation]`;
    }

    // Group modules by directory
    const directoryMap = new Map<string, ParsedModule[]>();

    for (const module of modules) {
      const dir = path.dirname(module.path);
      if (!directoryMap.has(dir)) {
        directoryMap.set(dir, []);
      }
      directoryMap.get(dir)!.push(module);
    }

    let mermaid = 'graph TD\n';
    let nodeCounter = 0;

    // Create nodes for directories and modules
    for (const [dir, dirModules] of directoryMap) {
      const dirNodeId = `DIR_${nodeCounter++}`;
      const cleanDirName = this.sanitizeNodeName(dir);
      mermaid += `    ${dirNodeId}["📁 ${cleanDirName}"]\n`;

      for (const module of dirModules) {
        const moduleNodeId = `MOD_${nodeCounter++}`;
        const cleanModuleName = this.sanitizeNodeName(path.basename(module.name));
        const fileIcon = this.getFileIcon(module.path);
        mermaid += `    ${moduleNodeId}["${fileIcon} ${cleanModuleName}"]\n`;
        mermaid += `    ${dirNodeId} --> ${moduleNodeId}\n`;
      }
    }

    return mermaid;
  }

  private generateDependencyMermaid(modules: ParsedModule[]): string {
    if (modules.length === 0) {
      return `graph TD
    A[No Dependencies] --> B[Empty Project]`;
    }

    let mermaid = 'graph TD\n';
    let nodeCounter = 0;
    const moduleNodes = new Map<string, string>();

    // Create nodes for all modules
    for (const module of modules) {
      const nodeId = `M_${nodeCounter++}`;
      const cleanName = this.sanitizeNodeName(path.basename(module.name));
      moduleNodes.set(module.name, nodeId);
      mermaid += `    ${nodeId}["${cleanName}"]\n`;
    }

    // Add dependencies
    for (const module of modules) {
      const sourceNodeId = moduleNodes.get(module.name);
      if (!sourceNodeId) continue;

      if (module.imports && module.imports.length > 0) {
        for (const importPath of module.imports) {
          const targetNodeId = moduleNodes.get(importPath);
          if (targetNodeId) {
            mermaid += `    ${sourceNodeId} --> ${targetNodeId}\n`;
          }
        }
      }
    }

    return mermaid;
  }

  private generateSystemArchitectureMermaid(modules: ParsedModule[]): string {
    if (modules.length === 0) {
      return `graph TD
    A[System] --> B[No Architecture Available]
    B --> C[Add Components]`;
    }

    // Categorize modules by type
    const layers = {
      presentation: modules.filter(m =>
        m.path.includes('component') ||
        m.path.includes('view') ||
        m.path.includes('ui') ||
        m.path.includes('frontend')
      ),
      api: modules.filter(m =>
        m.path.includes('api') ||
        m.path.includes('route') ||
        m.path.includes('controller') ||
        m.path.includes('endpoint')
      ),
      business: modules.filter(m =>
        m.path.includes('service') ||
        m.path.includes('business') ||
        m.path.includes('logic') ||
        m.path.includes('core')
      ),
      data: modules.filter(m =>
        m.path.includes('data') ||
        m.path.includes('repository') ||
        m.path.includes('database') ||
        m.path.includes('model')
      )
    };

    let mermaid = 'graph TD\n';

    // Add layer nodes
    if (layers.presentation.length > 0) {
      mermaid += '    P["🖼️ Presentation Layer"]\n';
    }
    if (layers.api.length > 0) {
      mermaid += '    A["🔌 API Layer"]\n';
    }
    if (layers.business.length > 0) {
      mermaid += '    B["⚙️ Business Logic"]\n';
    }
    if (layers.data.length > 0) {
      mermaid += '    D["💾 Data Layer"]\n';
    }

    // Add connections between layers
    if (layers.presentation.length > 0 && layers.api.length > 0) {
      mermaid += '    P --> A\n';
    }
    if (layers.api.length > 0 && layers.business.length > 0) {
      mermaid += '    A --> B\n';
    }
    if (layers.business.length > 0 && layers.data.length > 0) {
      mermaid += '    B --> D\n';
    }

    return mermaid;
  }

  private createInteractiveHTML(
    mermaidCode: string,
    title: string,
    description: string,
    options: InteractiveDiagramOptions
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Interactive Diagram</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.0.2/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: ${options.theme === 'dark' ? '#1a1a1a' : '#f8f9fa'};
            color: ${options.theme === 'dark' ? '#e9ecef' : '#333'};
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: ${options.theme === 'dark' ? '#2d2d2d' : 'white'};
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: ${options.theme === 'dark' ? '#4fc3f7' : '#0066cc'};
        }
        .diagram-container {
            background: ${options.theme === 'dark' ? '#2d2d2d' : 'white'};
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            min-height: ${options.height};
        }
        .controls {
            text-align: center;
            margin: 20px 0;
        }
        .controls button {
            background: ${options.theme === 'dark' ? '#4fc3f7' : '#0066cc'};
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 0 5px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        .controls button:hover {
            opacity: 0.8;
        }
        .mermaid-code {
            background: ${options.theme === 'dark' ? '#1a1a1a' : '#f8f9fa'};
            border: 1px solid ${options.theme === 'dark' ? '#555' : '#ddd'};
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            overflow-x: auto;
            display: none;
        }
        #diagram {
            text-align: center;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background: ${options.theme === 'dark' ? '#2d2d2d' : 'white'};
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-size: 14px;
            color: ${options.theme === 'dark' ? '#adb5bd' : '#666'};
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <p>${description}</p>
        </div>

        <div class="controls">
            <button onclick="zoomIn()">🔍 Zoom In</button>
            <button onclick="zoomOut()">🔍 Zoom Out</button>
            <button onclick="resetZoom()">↻ Reset</button>
            <button onclick="toggleCode()">📝 Show/Hide Code</button>
            <button onclick="downloadSVG()">💾 Download SVG</button>
        </div>

        <div class="diagram-container">
            <div id="diagram">
                ${mermaidCode}
            </div>
        </div>

        <div class="mermaid-code" id="code-section">
${mermaidCode}
        </div>

        <div class="footer">
            <p>Generated by ScribeVerse - Interactive Documentation Generator</p>
            <p>This diagram is fully interactive. You can zoom, pan, and interact with elements.</p>
        </div>
    </div>

    <script>
        // Configure Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: '${options.theme === 'dark' ? 'dark' : 'default'}',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            },
            themeVariables: {
                primaryColor: '${options.theme === 'dark' ? '#4fc3f7' : '#0066cc'}',
                primaryTextColor: '${options.theme === 'dark' ? '#ffffff' : '#000000'}',
                primaryBorderColor: '${options.theme === 'dark' ? '#4fc3f7' : '#0066cc'}',
                lineColor: '${options.theme === 'dark' ? '#6c757d' : '#333333'}',
                background: '${options.theme === 'dark' ? '#2d2d2d' : '#ffffff'}'
            }
        });

        let currentZoom = 1;
        const diagram = document.getElementById('diagram');

        function zoomIn() {
            currentZoom += 0.1;
            diagram.style.transform = \`scale(\${currentZoom})\`;
        }

        function zoomOut() {
            currentZoom = Math.max(0.5, currentZoom - 0.1);
            diagram.style.transform = \`scale(\${currentZoom})\`;
        }

        function resetZoom() {
            currentZoom = 1;
            diagram.style.transform = 'scale(1)';
        }

        function toggleCode() {
            const codeSection = document.getElementById('code-section');
            codeSection.style.display = codeSection.style.display === 'none' ? 'block' : 'none';
        }

        function downloadSVG() {
            const svg = diagram.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = '${title.toLowerCase().replace(/\\s+/g, '-')}.svg';
                link.click();
                URL.revokeObjectURL(url);
            }
        }

        // Add pan functionality
        let isPanning = false;
        let startX, startY;

        diagram.addEventListener('mousedown', (e) => {
            if (e.button === 1 || e.ctrlKey) { // Middle mouse button or Ctrl+click
                isPanning = true;
                startX = e.clientX;
                startY = e.clientY;
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                diagram.style.transform = \`scale(\${currentZoom}) translate(\${deltaX}px, \${deltaY}px)\`;
            }
        });

        document.addEventListener('mouseup', () => {
            isPanning = false;
        });
    </script>
</body>
</html>`;
  }

  private mergeDefaultOptions(options: Partial<InteractiveDiagramOptions>): InteractiveDiagramOptions {
    return {
      theme: options.theme || 'light',
      width: options.width || '100%',
      height: options.height || '600px',
      animated: options.animated !== undefined ? options.animated : true
    };
  }

  private sanitizeNodeName(name: string): string {
    // Remove special characters and make safe for Mermaid
    return name.replace(/[^a-zA-Z0-9\s\-_.]/g, '').substring(0, 30);
  }

  private getFileIcon(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const icons: Record<string, string> = {
      '.js': '📄',
      '.ts': '📘',
      '.py': '🐍',
      '.java': '☕',
      '.cpp': '⚙️',
      '.cs': '🔷',
      '.php': '🐘',
      '.rb': '💎',
      '.go': '🐹',
      '.rs': '🦀',
      '.sql': '🗄️',
      '.json': '📋',
      '.xml': '📊',
      '.html': '🌐',
      '.css': '🎨',
      '.md': '📝'
    };
    return icons[ext] || '📄';
  }
}