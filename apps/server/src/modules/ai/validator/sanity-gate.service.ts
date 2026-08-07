import { ValidationResult, ValidationIssue } from "../types/validation.types.js";
import type { GenerationState } from "../graph/state.js";

const normalizePath = (p: string) => p.replace(/\\/g, '/');

export class SanityGateService {
  execute(state: GenerationState): ValidationResult {
    const issues: ValidationIssue[] = [];
    const generatedProject = state.generatedFiles;
    
    if (!generatedProject || !generatedProject.files || generatedProject.files.length === 0) {
      return {
        passed: false,
        issues: [{
          type: "missing-file",
          file: "project",
          repairStrategy: "regenerate-file",
          severity: "critical",
          message: "The generated project contains no files.",
        }],
      };
    }

    const commands = generatedProject.commands || {};
    if (!commands.install) commands.install = "npm install";
    if (!commands.build) commands.build = "npm run build";
    if (!commands.dev) commands.dev = "npm run dev";
    
    let files = generatedProject.files;

    // 1. Remove truly empty files
    const originalFileCount = files.length;
    files = files.filter(f => f.content && f.content.trim().length > 0);
    if (files.length < originalFileCount) {
      console.log(`[SanityGate] Removed ${originalFileCount - files.length} empty files.`);
    }

    // 2. Deduplicate files (keep last)
    const fileMap = new Map<string, { path: string; content: string }>();
    for (const f of files) {
      fileMap.set(normalizePath(f.path), f);
    }
    if (fileMap.size < files.length) {
      console.log(`[SanityGate] Removed ${files.length - fileMap.size} duplicate file paths.`);
      files = Array.from(fileMap.values());
    }

    generatedProject.files = files;

    // 3. Blocking checks
    const hasSrc = files.some(f => normalizePath(f.path).startsWith("src/"));
    if (!hasSrc) {
      issues.push({
        type: "missing-file",
        severity: "critical",
        message: "Project structure is invalid: missing 'src' directory.",
        file: "src",
        repairStrategy: "regenerate-file"
      });
    }

    const requiredRoots = ["src/App.tsx", "src/main.tsx"];
    for (const root of requiredRoots) {
      const exists = files.some(f => normalizePath(f.path) === root);
      if (!exists) {
        issues.push({
          type: "missing-file",
          severity: "critical",
          message: `Required root file '${root}' is missing.`,
          file: root,
          repairStrategy: "regenerate-file"
        });
      }
    }

    const passed = issues.length === 0;

    return {
      passed,
      issues,
    };
  }
}
