import type { SupportedFramework } from './template.types.js';

export class TemplateRegistry {
  private static readonly MANIFESTS: Record<SupportedFramework, string[]> = {
    'react-vite': [
      'package.json',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'vite.config.ts',
      'eslint.config.js',
      '.gitignore',
      'README.md',
      '.env.example',
      'index.html',
      'src/main.tsx',
      'src/index.css'
    ],
    'vanilla': [
      'package.json',
      'vite.config.ts',
      '.gitignore',
      'README.md',
      '.env.example',
      'index.html',
      'src/main.ts',
      'src/style.css'
    ]
  };

  /**
   * Checks if a file is owned by the template.
   * If framework is provided, checks against that framework's specific manifest.
   * Otherwise, checks if it's a known template file across any framework.
   */
  public static owns(filePath: string, framework?: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    
    if (framework && this.MANIFESTS[framework as SupportedFramework]) {
      return this.MANIFESTS[framework as SupportedFramework].includes(normalized);
    }
    
    return Object.values(this.MANIFESTS).some(manifest => manifest.includes(normalized));
  }
}
