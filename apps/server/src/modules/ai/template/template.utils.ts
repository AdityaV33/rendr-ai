import { SupportedFramework, SupportedLanguage, PackageManager } from './template.types.js';

const frameworkMap: Record<string, SupportedFramework> = {
  'React': 'react-vite',
  'React + Vite': 'react-vite',
  'React (Vite)': 'react-vite',
  'react': 'react-vite',
  'react-vite': 'react-vite',
  'Vanilla JS': 'vanilla',
  'Vanilla': 'vanilla',
  'vanilla': 'vanilla',
  'HTML/CSS/JS': 'vanilla',
  'HTML/JS/CSS': 'vanilla'
};

export function mapToSupportedFramework(frameworkString: string): SupportedFramework {
  const normalized = frameworkString.trim();
  const mapped = frameworkMap[normalized] || frameworkMap[normalized.toLowerCase()];
  
  if (!mapped) {
    // Default to react-vite if unrecognized, or we could throw. 
    // Given the constraints, defaulting to a known SupportedFramework keeps it strongly typed.
    return 'react-vite'; 
  }
  return mapped;
}

const languageMap: Record<string, SupportedLanguage> = {
  'TypeScript': 'typescript',
  'typescript': 'typescript',
  'JavaScript': 'javascript',
  'javascript': 'javascript',
  'JS': 'javascript',
  'TS': 'typescript'
};

export function mapToSupportedLanguage(languageString: string): SupportedLanguage {
  const normalized = languageString.trim();
  const mapped = languageMap[normalized] || languageMap[normalized.toLowerCase()];
  return mapped || 'typescript';
}

const pmMap: Record<string, PackageManager> = {
  'npm': 'npm',
  'yarn': 'yarn',
  'pnpm': 'pnpm',
  'bun': 'bun'
};

export function mapToPackageManager(pmString: string): PackageManager {
  const normalized = pmString.trim();
  const mapped = pmMap[normalized] || pmMap[normalized.toLowerCase()];
  return mapped || 'npm';
}

/**
 * Normalizes an application type string into a URL-friendly project name.
 * e.g., "SaaS Dashboard" -> "saas-dashboard"
 */
export function slugifyProjectName(applicationType: string): string {
  return applicationType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'my-project';
}
