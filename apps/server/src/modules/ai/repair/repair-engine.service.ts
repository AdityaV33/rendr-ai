import type { GeminiService } from "../clients/gemini.service.js";
import type { GenerationState } from "../graph/state.js";
import { buildGateRepairPrompt } from "../prompts/repair.prompt.js";
import { env } from "../../../config/env.js";
import { z } from "zod";
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
    errors: string,
    escalationMessage?: string
  ): Promise<void> {
    if (!state.generatedFiles || !state.architecture) return;

    const files = state.generatedFiles.files;
    const allContracts: Record<string, any> = {};
    
    if (state.architecture.componentContracts) {
      for (const contract of state.architecture.componentContracts) {
        allContracts[contract.name] = contract;
      }
    }

    const prompt = buildGateRepairPrompt(
      gateName,
      errors,
      state.architecture,
      allContracts,
      files,
      escalationMessage
    );

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
