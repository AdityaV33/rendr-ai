import { ValidatorService } from "./src/modules/ai/validator/validator.service.js";

async function main() {
  const validator = new ValidatorService();

  const generatedFiles = [
    {
      path: "playwright.config.ts",
      content: `import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
});`
    },
    {
      path: "src/App.tsx",
      content: `import React from "react";
import { Button } from "./components/Button";
import { Missing } from "./components/Missing";

export function App() {
  return <Button />;
}
`
    },
    {
      path: "src/main.tsx",
      content: `import React from "react";
import { App } from "./App";
`
    },
    {
      path: "src/components/Button.tsx",
      content: `import React from "react";
export function Button() { return <button>Click</button>; }
`
    },
    {
      path: "package.json",
      content: `{
  "name": "test-app",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "install": "npm install"
  }
}`
    }
  ];

  const state = {
    generatedFiles: {
      files: generatedFiles,
      commands: { install: "npm i", build: "npm run build", dev: "npm run dev" }
    },
    architecture: {
      stack: { frontendFramework: "vanilla" }
    }
  };

  const result = await validator.execute(state as any);
  
  const playwrightIssues = result.issues.filter(i => i.file === "playwright.config.ts" && i.type === "import");
  if (playwrightIssues.length > 0) {
    console.error("FAIL: 0 import issues expected for playwright.config.ts, got:", playwrightIssues);
    process.exit(1);
  }

  const missingImportIssues = result.issues.filter(i => i.file === "src/App.tsx" && i.type === "import" && i.message.includes("Missing"));
  if (missingImportIssues.length === 0) {
    console.error("FAIL: Expected missing import issue for ./components/Missing in src/App.tsx, got none");
    console.log("All issues:", result.issues);
    process.exit(1);
  }

  console.log("PASS: Validator unit test successful.");
}

main().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});

