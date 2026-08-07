import { GeneratedFile } from '../../types/generated-file.types.js';
import { FrameworkTemplateStrategy } from '../template.interface.js';
import { SupportedFramework, TemplateContext } from '../template.types.js';

export class VanillaStrategy implements FrameworkTemplateStrategy {
  readonly framework: SupportedFramework = 'vanilla';

  generatePackageJson(context: TemplateContext): GeneratedFile[] {
    const pkg = {
      name: context.projectName,
      version: "0.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: {
        ...context.dependencies
      },
      devDependencies: {
        "vite": "^6.0.0",
        "@playwright/test": "^1.40.0",
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
    return [];
  }

  generateFrameworkConfigs(_context: TemplateContext): GeneratedFile[] {
    return [];
  }

  generateBoilerplate(context: TemplateContext): GeneratedFile[] {
    return [
      {
        path: ".gitignore",
        content: `node_modules/
dist/
.env
.env.*
!.env.example
.DS_Store
Thumbs.db`
      },
      {
        path: "README.md",
        content: `# ${context.projectName}

This is a generated frontend MVP built with Vanilla HTML/CSS/JS and Vite.

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
    <title>Vanilla JS App</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="app">
      <h1>Hello from Vanilla JS!</h1>
    </div>
    <script type="module" src="/script.js"></script>
  </body>
</html>`
      },
      {
        path: "styles.css",
        content: `body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f9fafb;
  color: #111827;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

#app {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}`
      },
      {
        path: "script.js",
        content: `console.log('Vanilla application initialized.');`
      }
    ];
  }
}
