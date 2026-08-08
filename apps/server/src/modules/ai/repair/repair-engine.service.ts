import type { GeminiService } from "../clients/gemini.service.js";
import type { GenerationState } from "../graph/state.js";
import { buildGateRepairPrompt } from "../prompts/repair.prompt.js";
import { env } from "../../../config/env.js";
import { z } from "zod";
import type { ParsedDiagnostic, RepairContext } from "./repair.types.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";

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
  ): Promise<void> {
    if (!state.generatedFiles || !state.architecture) return;

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
    
    // --- NEW BOUNDED REPAIR CONTEXT BUDGET ---
    const contextFiles = new Set<string>();
    
    // 1. Broken files
    for (const path of affectedFilePaths) {
      if (contextFiles.size < 4) contextFiles.add(path);
    }
    
    // 2. Parent Importer & Imported Interfaces
    for (const brokenPath of affectedFilePaths) {
      const brokenFile = files.find(f => f.path === brokenPath);
      if (!brokenFile) continue;
      
      const basename = brokenPath.split('/').pop()!.replace(/\.[^.]+$/, '');
      
      // Parent importer
      for (const f of files) {
        if (contextFiles.size >= 4) break;
        if (f.content.includes(`/${basename}`) || f.content.includes(`./${basename}`)) {
          contextFiles.add(f.path);
        }
      }
      
      // Imported interfaces
      const importMatches = [...brokenFile.content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g)];
      for (const match of importMatches) {
        if (contextFiles.size >= 4) break;
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const importBasename = importPath.split('/').pop()!;
          const importedFile = files.find(f => f.path.includes(`/${importBasename}.`) || f.path.includes(`/${importBasename}`) || f.path === importBasename);
          if (importedFile) contextFiles.add(importedFile.path);
        }
      }
    }

    const affectedFiles = files.filter(f => contextFiles.has(f.path));

    // Cluster error messages
    const clusteredDiagnostics = diagnostics; // Passed directly in context

    const repairContext: RepairContext = {
      diagnostics: clusteredDiagnostics,
      affectedFiles,
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
    
    if (repairResult && repairResult.files) {
      for (const file of repairResult.files) {
        const filePath = file.path;
        const newContent = file.content;
        
        const existingFileIndex = files.findIndex(f => f.path === filePath);
        if (existingFileIndex >= 0) {
          files[existingFileIndex].content = newContent;
        } else {
          files.push({
            path: filePath,
            content: newContent
          });
        }
        console.log(`[RepairEngine] Repaired file: ${filePath}`);
        filesUpdated++;
      }
    }

    if (filesUpdated === 0) {
      console.warn(`[RepairEngine] Warning: LLM returned no valid file blocks for ${gateName} repair.`);
    }
  }
}
