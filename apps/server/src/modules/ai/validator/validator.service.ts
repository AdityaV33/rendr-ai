import type { GenerationState } from "../graph/state.js";
import type { ValidationResult, ValidationIssue } from "../types/validation.types.js";

const normalizePath = (p: string) => p.replace(/\\/g, '/');

export class ValidatorService {
  async execute(state: GenerationState): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    const generatedProject = state.generatedFiles;
    if (!generatedProject) {
      return {
        passed: false,
        issues: [{
          id: "missing-generated-project",
          severity: "critical",
          message: "No generated project was found in the state.",
        }],
      };
    }

    const generatedFiles = generatedProject.files || [];
    
    // Generation Sanity
    if (generatedFiles.length === 0) {
      return {
        passed: false,
        issues: [{
          id: "empty-project",
          severity: "critical",
          message: "The generated project contains no files.",
        }],
      };
    }

    // GeneratedProject Consistency
    const commands = generatedProject.commands || {};
    if (!commands.install || !commands.build || !commands.dev) {
      issues.push({
        id: "missing-commands",
        severity: "critical",
        message: "Generated project is missing required commands (install, build, dev).",
      });
    }

    const generatedPaths = new Map<string, number>();
    for (const file of generatedFiles) {
      const normalizedPath = normalizePath(file.path);
      generatedPaths.set(normalizedPath, (generatedPaths.get(normalizedPath) || 0) + 1);
    }

    // Duplicate File Paths
    for (const [path, count] of generatedPaths.entries()) {
      if (count > 1) {
        issues.push({
          id: "duplicate-path",
          severity: "error",
          message: `File path '${path}' was generated multiple times.`,
          affectedFiles: [path],
        });
      }
    }

    // Empty Files
    for (const file of generatedFiles) {
      const normalizedPath = normalizePath(file.path);
      if (!file.content || file.content.trim().length === 0) {
        issues.push({
          id: "empty-file",
          severity: "error",
          message: `Generated file '${normalizedPath}' is empty.`,
          affectedFiles: [normalizedPath],
        });
      }
    }

    // Invalid Structure
    const hasSrc = generatedFiles.some(f => normalizePath(f.path).startsWith("src/"));
    if (!hasSrc) {
      issues.push({
        id: "invalid-structure",
        severity: "critical",
        message: "Project structure is invalid: missing 'src' directory.",
      });
    }

    // Root Component Presence and React Signature
    const requiredRoots = ["src/App.tsx", "src/main.tsx"];
    for (const root of requiredRoots) {
      const file = generatedFiles.find(f => normalizePath(f.path) === root);
      if (!file) {
        issues.push({
          id: "missing-root-file",
          severity: "critical",
          message: `Required root file '${root}' is missing.`,
          affectedFiles: [root],
        });
      } else if (root === "src/App.tsx") {
        // Broad heuristic: contains the word 'App' (as a distinct identifier) and contains an 'export'
        const hasApp = /\bApp\b/.test(file.content);
        const hasExport = /\bexport\b/.test(file.content);
        if (!hasApp || !hasExport) {
          issues.push({
            id: "invalid-root-component",
            severity: "error",
            message: "src/App.tsx does not appear to contain a valid exported 'App' component.",
            affectedFiles: ["src/App.tsx"],
          });
        }
      }
    }

    const architectureFiles = state.architecture?.fileStructure || [];
    const plannedFilePaths = new Set(
      architectureFiles.filter(f => f.type === "file").map(f => normalizePath(f.path))
    );

    // Missing Planned Files
    for (const path of plannedFilePaths) {
      if (!generatedPaths.has(path)) {
        issues.push({
          id: "missing-planned-file",
          severity: "error",
          message: `File '${path}' was declared in the architecture plan but not generated.`,
          affectedFiles: [path],
        });
      }
    }

    // Unplanned Files
    for (const file of generatedFiles) {
      const normalizedPath = normalizePath(file.path);
      if (!plannedFilePaths.has(normalizedPath) && !requiredRoots.includes(normalizedPath)) {
        issues.push({
          id: "unplanned-file",
          severity: "warning",
          message: `File '${normalizedPath}' was generated but not declared in the architecture plan.`,
          affectedFiles: [normalizedPath],
        });
      }
    }

    // Missing Component Exports
    for (const file of generatedFiles) {
      const normalizedPath = normalizePath(file.path);
      if (
        (normalizedPath.startsWith("src/components/") || 
         normalizedPath.startsWith("src/context/") || 
         normalizedPath.startsWith("src/hooks/")) &&
        (normalizedPath.endsWith(".tsx") || normalizedPath.endsWith(".ts"))
      ) {
        if (!file.content.includes("export ")) {
          issues.push({
            id: "missing-export",
            severity: "error",
            message: `Component, hook, or context file '${normalizedPath}' does not export anything.`,
            affectedFiles: [normalizedPath],
          });
        }
      }
    }

    // Missing Imported Files
    const importRegex = /(?:import|export)[^'"]*?['"](\.[^'"]+)['"]/g;
    const dynamicImportRegex = /import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    
    // Polyfill a simple posix join/dirname since we don't want to import Node's path if we don't have to,
    // or we can use it. It's safer to just implement a small posix resolver.
    const posixDirname = (p: string) => {
      const parts = p.split('/');
      parts.pop();
      return parts.length === 0 ? '.' : parts.join('/');
    };
    const posixJoin = (dir: string, rel: string) => {
      const parts = dir.split('/');
      const relParts = rel.split('/');
      for (const part of relParts) {
        if (part === '.') continue;
        if (part === '..') {
          if (parts.length > 0 && parts[parts.length - 1] !== '..') {
            parts.pop();
          } else {
            parts.push('..');
          }
        } else {
          parts.push(part);
        }
      }
      return parts.filter(p => p !== '.' && p !== '').join('/');
    };

    for (const file of generatedFiles) {
      const normalizedPath = normalizePath(file.path);
      if (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) {
        const matches = [
          ...Array.from(file.content.matchAll(importRegex)),
          ...Array.from(file.content.matchAll(dynamicImportRegex))
        ];

        for (const match of matches) {
          const importPath = match[1];
          if (!importPath) continue;

          const dir = posixDirname(normalizedPath);
          const targetPath = posixJoin(dir, importPath);

          const possibleTargets = [
            targetPath,
            `${targetPath}.ts`,
            `${targetPath}.tsx`,
            `${targetPath}/index.ts`,
            `${targetPath}/index.tsx`
          ];

          if (!possibleTargets.some(pt => generatedPaths.has(pt))) {
            issues.push({
              id: "missing-import-target",
              severity: "error",
              message: "Imported file does not exist.",
              affectedFiles: [normalizedPath, targetPath],
            });
          }
        }
      }
    }

    // Missing Imported Symbols
    const getExportedSymbols = (content: string): Set<string> => {
      const exports = new Set<string>();
      const declRegex = /export\s+(?:default\s+)?(?:(?:async\s+)?function|const|let|var|class|interface|type|enum)\s+([a-zA-Z0-9_$]+)/g;
      for (const match of content.matchAll(declRegex)) {
        exports.add(match[1]);
      }
      const blockRegex = /export\s+\{([^}]+)\}/g;
      for (const match of content.matchAll(blockRegex)) {
        const items = match[1].split(',');
        for (const item of items) {
          const trimmed = item.trim();
          if (!trimmed) continue;
          const parts = trimmed.split(/\s+as\s+/);
          if (parts.length === 2) {
            exports.add(parts[1].trim());
          } else {
            exports.add(parts[0].trim());
          }
        }
      }
      return exports;
    };

    const namedImportExportRegex = /(?:import|export)\s+[^'"]*?\{([^}]+)\}[^'"]*?['"](\.[^'"]+)['"]/g;
    for (const file of generatedFiles) {
      const normalizedPath = normalizePath(file.path);
      if (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) {
        const matches = Array.from(file.content.matchAll(namedImportExportRegex));
        for (const match of matches) {
          const block = match[1];
          const importPath = match[2];
          
          const dir = posixDirname(normalizedPath);
          const targetPath = posixJoin(dir, importPath);
          
          let matchedTargetFile = null;
          const possibleTargets = [
            targetPath,
            `${targetPath}.ts`,
            `${targetPath}.tsx`,
            `${targetPath}/index.ts`,
            `${targetPath}/index.tsx`
          ];

          for (const pt of possibleTargets) {
            const found = generatedFiles.find(f => normalizePath(f.path) === pt);
            if (found) {
              matchedTargetFile = found;
              break;
            }
          }

          if (matchedTargetFile) {
            const exportedSymbols = getExportedSymbols(matchedTargetFile.content);
            const items = block.split(',');
            for (const item of items) {
              const trimmed = item.trim();
              if (!trimmed) continue;
              const parts = trimmed.split(/\s+as\s+/);
              const requestedSymbol = parts[0].trim().replace(/^type\s+/, "");
              
              if (!exportedSymbols.has(requestedSymbol)) {
                issues.push({
                  id: "missing-imported-symbol",
                  severity: "error",
                  message: `Imported symbol '${requestedSymbol}' does not exist in ${matchedTargetFile.path}`,
                  affectedFiles: [normalizedPath, matchedTargetFile.path],
                });
              }
            }
          }
        }
      }
    }

    const passed = !issues.some(i => i.severity === "error" || i.severity === "critical");

    return {
      passed,
      issues,
    };
  }
}
