import type { GeminiService } from "../clients/gemini.service.js";
import type { GenerationState } from "../graph/state.js";
import { buildGateRepairPrompt } from "../prompts/repair.prompt.js";
import { env } from "../../../config/env.js";
import { z } from "zod";
import type { ParsedDiagnostic, RepairContext } from "./repair.types.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";
import { ContractGate } from "../generator/contract.gate.js";

const repairResponseSchema = z.object({
  files: z.array(z.object({
    path: z.string().describe("The file path, e.g. 'src/components/Display.tsx'"),
    content: z.string().describe("The complete repaired file content"),
  }))
});
const REPAIR_RESPONSE_GEMINI_SCHEMA = zodToGeminiSchema(repairResponseSchema);

export class RepairEngineService {
  constructor(private readonly gemini: GeminiService) {}

  async executeGateRepair(
    state: GenerationState,
    gateName: string,
    rawErrorOutput: string,
    diagnostics: ParsedDiagnostic[],
    escalationMessage?: string
  ): Promise<{ path: string, content: string }[]> {
    if (!state.generatedFiles || !state.architecture) return [];

    const files = state.generatedFiles.files;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allContracts: Record<string, any> = {};
    
    if (state.architecture.componentContracts) {
      for (const contract of state.architecture.componentContracts) {
        allContracts[contract.name] = contract;
      }
    }

    // Extract unique affected file paths
    const affectedFilePaths = Array.from(new Set(diagnostics.map(d => d.file).filter(Boolean))) as string[];
    
    // --- BOUNDED REPAIR CONTEXT BUDGET ---
    const MAX_CONTEXT_FILES = 8;
    const editablePaths = new Set<string>();
    const readonlyPaths = new Set<string>();
    
    // 1. Broken files directly mentioned in diagnostics
    for (const path of affectedFilePaths) {
      if (editablePaths.size < MAX_CONTEXT_FILES) editablePaths.add(path);
    }
    
    // 2. Imported dependencies & interfaces from broken files (highest priority for type mismatch repairs)
    for (const brokenPath of affectedFilePaths) {
      const brokenFile = files.find(f => f.path === brokenPath);
      if (!brokenFile) continue;
      
      const importMatches = [...brokenFile.content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g)];
      for (const match of importMatches) {
        if (editablePaths.size + readonlyPaths.size >= MAX_CONTEXT_FILES) break;
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const importBasename = importPath.split('/').pop()!;
          const importedFile = files.find(f => f.path.includes(`/${importBasename}.`) || f.path.includes(`/${importBasename}`) || f.path === importBasename);
          if (importedFile && !editablePaths.has(importedFile.path)) {
            readonlyPaths.add(importedFile.path);
          }
        }
      }
    }

    // 4. Parent Importers (now context-only)
    for (const brokenPath of affectedFilePaths) {
      if (editablePaths.size + readonlyPaths.size >= MAX_CONTEXT_FILES) break;
      const basename = brokenPath.split('/').pop()!.replace(/\.[^.]+$/, '');
      for (const f of files) {
        if (editablePaths.size + readonlyPaths.size >= MAX_CONTEXT_FILES) break;
        if (f.content.includes(`/${basename}`) || f.content.includes(`./${basename}`)) {
          if (!editablePaths.has(f.path)) {
            readonlyPaths.add(f.path);
          }
        }
      }
    }

    // 3. Files matching diagnostic symbols (e.g. context only)
    for (const diag of diagnostics) {
      if (editablePaths.size + readonlyPaths.size >= MAX_CONTEXT_FILES) break;
      const symbols = diag.message.match(/[A-Z][a-zA-Z0-9]+/g) || [];
      for (const sym of symbols) {
        const matchingFile = files.find(f => f.path.includes(`/${sym}.`) || f.content.includes(`interface ${sym}`) || f.content.includes(`type ${sym}`));
        if (matchingFile && !editablePaths.has(matchingFile.path)) {
          readonlyPaths.add(matchingFile.path);
        }
      }
    }

    const editableFiles = files.filter(f => editablePaths.has(f.path));
    const contextOnlyFiles = files.filter(f => readonlyPaths.has(f.path));

    console.log(`[RepairEngine] Editable targets: ${Array.from(editablePaths).join(", ") || "None"}`);
    if (readonlyPaths.size > 0) {
      console.log(`[RepairEngine] Context-only files: ${Array.from(readonlyPaths).join(", ")}`);
    }

    // Cluster error messages
    const clusteredDiagnostics = diagnostics; // Passed directly in context

    const repairContext: RepairContext = {
      diagnostics: clusteredDiagnostics,
      editableFiles,
      contextOnlyFiles,
      architecture: state.architecture,
      contracts: allContracts,
      buildCommand: state.generatedFiles.commands.build,
      framework: state.architecture.stack.frontendFramework,
      rawErrorOutput
    };

    const prompt = buildGateRepairPrompt(gateName, repairContext, escalationMessage);

    const repairResult = await this.gemini.generateStructured<{ files: { path: string, content: string }[] }>(
      prompt.prompt,
      REPAIR_RESPONSE_GEMINI_SCHEMA,
      prompt.system,
      { timeoutMs: env.GEMINI_REPAIR_TIMEOUT_MS, taskName: `Repair ${gateName} Gate` }
    );

    let filesUpdated = 0;
    
    const repairedFiles: { path: string, content: string }[] = [];
    
    if (repairResult && repairResult.files) {
      for (const file of repairResult.files) {
        const filePath = file.path;
        const newContent = file.content;
        
        // ContractGate Verification
        const violations = ContractGate.verify(
          newContent,
          allContracts,
          filePath,
          state.architecture.stack.frontendFramework,
          true // strictExports flag for repair
        );

        if (violations.length > 0) {
          console.error(`[RepairEngine] ContractGate rejected repair for ${filePath}:\n- ${violations.join('\n- ')}`);
          throw new Error(`Repair for ${filePath} was rejected by Contract Gate: ${violations.join(', ')}`);
        }
        
        const existingFileIndex = files.findIndex(f => f.path === filePath);
        if (existingFileIndex >= 0) {
          files[existingFileIndex].content = newContent;
        } else {
          files.push({
            path: filePath,
            content: newContent
          });
        }
        repairedFiles.push({ path: filePath, content: newContent });
        console.log(`[RepairEngine] Repaired file: ${filePath}`);
        filesUpdated++;
      }
    }

    if (filesUpdated === 0) {
      console.warn(`[RepairEngine] Warning: LLM returned no valid file blocks for ${gateName} repair.`);
    }
    
    return repairedFiles;
  }
}
