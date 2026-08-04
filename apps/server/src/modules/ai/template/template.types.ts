export type SupportedFramework = 'react-vite' | 'vanilla';
export type SupportedLanguage = 'typescript' | 'javascript';
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface TemplateContext {
  projectName: string;
  framework: SupportedFramework;
  language: SupportedLanguage;
  packageManager: PackageManager;
  features: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}
