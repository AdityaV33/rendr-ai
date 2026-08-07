import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update signature and add incrementalFiles logic
content = content.replace(
    'async execute(state: GenerationState): Promise<ValidationResult> {',
    'async execute(state: GenerationState, incrementalFiles?: string[]): Promise<ValidationResult> {'
)

# 2. Add owner to ValidationIssue and map types
# Replace id: with type:
content = content.replace('id: "missing-generated-project"', 'type: "missing-file", file: "project", owner: "AI"')
content = content.replace('id: "empty-project"', 'type: "missing-file", file: "project", owner: "AI"')
content = content.replace('id: "missing-commands"', 'type: "contract", file: "package.json", owner: "AI"')
content = content.replace('id: "duplicate-path"', 'type: "unexpected-file", owner: "AI"')
content = content.replace('id: "empty-file"', 'type: "contract", owner: "AI"')
content = content.replace('id: "invalid-structure"', 'type: "contract", owner: "AI"')
content = content.replace('id: "missing-root-file"', 'type: "missing-file", owner: "AI"')
content = content.replace('id: "invalid-root-component"', 'type: "contract", owner: "AI"')
content = content.replace('id: "missing-planned-file"', 'type: "missing-file", owner: "AI"')
content = content.replace('id: "unplanned-file"', 'type: "unexpected-file", owner: "AI"')
content = content.replace('id: "missing-export"', 'type: "export", owner: "AI"')
content = content.replace('id: "missing-import-target"', 'type: "import", owner: "AI"')
content = content.replace('id: "missing-imported-symbol"', 'type: "import", owner: "AI"')

# Add stale file cleanup to the start of execute
content = content.replace(
    'const issues: ValidationIssue[] = [];',
    '''const issues: ValidationIssue[] = [];

    // Stale file cleanup
    if (state.project && state.generatedFiles) {
      const workspacePath = workspaceService.getValidationWorkspacePath(state.project.id);
      try {
        const generatedPaths = new Set(state.generatedFiles.files.map(f => normalizePath(f.path)));
        
        // Only clean up src, tests, and playwright.config.ts
        const dirsToCheck = ["src", "tests", "playwright.config.ts"];
        for (const dir of dirsToCheck) {
          const fullPath = path.join(workspacePath, dir);
          if (await filesystemService.pathExists(fullPath)) {
            if ((await fs.stat(fullPath)).isDirectory()) {
              const files = await filesystemService.listAllFiles(fullPath);
              for (const file of files) {
                const relPath = normalizePath(path.relative(workspacePath, file));
                if (!generatedPaths.has(relPath)) {
                  await fs.rm(file, { force: true });
                }
              }
            } else {
              if (!generatedPaths.has(dir)) {
                await fs.rm(fullPath, { force: true });
              }
            }
          }
        }
      } catch (e) {
        console.error("[Validator] Failed to clean up stale files:", e);
      }
    }
'''
)

# Add imports for filesystemService and path if missing
if 'import * as filesystemService' not in content:
    content = content.replace(
        'import * as workspaceService from "../../runtime/workspace.service.js";',
        'import * as workspaceService from "../../runtime/workspace.service.js";\nimport * as filesystemService from "../../runtime/filesystem.service.js";\nimport * as path from "node:path";\nimport fs from "node:fs/promises";'
    )

with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
