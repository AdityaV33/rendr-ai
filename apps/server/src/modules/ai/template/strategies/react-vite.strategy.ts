import { GeneratedFile } from '../../types/generated-file.types.js';
import { FrameworkTemplateStrategy } from '../template.interface.js';
import { SupportedFramework, TemplateContext } from '../template.types.js';

export class ReactViteStrategy implements FrameworkTemplateStrategy {
  readonly framework: SupportedFramework = 'react-vite';

  generatePackageJson(context: TemplateContext): GeneratedFile[] {
    const pkg = {
      name: context.projectName,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc -b && vite build",
        lint: "eslint .",
        preview: "vite preview"
      },
      dependencies: {
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        ...context.dependencies
      },
      devDependencies: {
        "@eslint/js": "^9.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.0.0",
        "eslint": "^9.0.0",
        "eslint-plugin-react-hooks": "^5.0.0",
        "eslint-plugin-react-refresh": "^0.4.0",
        "globals": "^15.0.0",
        "typescript": "^5.0.0",
        "vite": "^6.0.0",
        "tailwindcss": "^4.0.0",
        "@tailwindcss/vite": "^4.0.0",
        ...context.devDependencies
      }
    };

    return [
      {
        path: "package.json",
        content: JSON.stringify(pkg, null, 2)
      }
    ];
  }

  generateTsConfig(_context: TemplateContext): GeneratedFile[] {
    return [
      {
        path: "tsconfig.json",
        content: `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}`
      },
      {
        path: "tsconfig.app.json",
        content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client", "react", "react-dom"],
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src"]
}`
      },
      {
        path: "tsconfig.node.json",
        content: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}`
      }
    ];
  }

  generateFrameworkConfigs(_context: TemplateContext): GeneratedFile[] {
    return [
      {
        path: "vite.config.ts",
        content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});`
      },
      {
        path: "eslint.config.js",
        content: `import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);`
      }
    ];
  }

  generateBoilerplate(context: TemplateContext): GeneratedFile[] {
    return [
      {
        path: ".gitignore",
        content: `node_modules/
dist/
dist-ssr/
*.local
.env
.env.*
!.env.example
.DS_Store
Thumbs.db`
      },
      {
        path: "README.md",
        content: `# ${context.projectName}

This is a generated frontend MVP built with React, TypeScript, Vite, and Tailwind CSS.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   ${context.packageManager} install
   \`\`\`
2. Run the development server:
   \`\`\`bash
   ${context.packageManager} run dev
   \`\`\``
      },
      {
        path: ".env.example",
        content: `# Public API Keys (must be prefixed with VITE_)
VITE_API_URL=http://localhost:3000`
      }
    ];
  }

  generateEntryFiles(_context: TemplateContext): GeneratedFile[] {
    return [
      {
        path: "index.html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
      },
      {
        path: "src/main.tsx",
        content: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);`
      },
      {
        path: "src/index.css",
        content: `@import "tailwindcss";

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f9fafb;
  color: #111827;
}`
      }
    ];
  }
}
