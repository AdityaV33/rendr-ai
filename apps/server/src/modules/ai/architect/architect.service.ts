import { ZodError } from "zod";
import { GeminiService } from "../clients/gemini.service.js";
import { ARCHITECT_SYSTEM_PROMPT } from "../prompts/architect.prompt.js";
import { architecturePlanSchema, architecturePatchSchema } from "../schemas/architecture-plan.schema.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import { InternalServerError } from "../../lib/http-error.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";
import { repairArchitectureIntegrity } from "../validation/architecture-integrity.js";

export class ArchitectService {
  constructor(private readonly gemini: GeminiService) {}

  /**
   * Receives a validated ProjectPlan and produces a validated ArchitecturePlan.
   * Employs a dual-layer repair strategy:
   * 1. Deterministic Integrity Repair (0 API calls)
   * 2. Targeted LLM Retry (1 small API call)
   */
  public async designArchitecture(
    projectPlan: ProjectPlan,
    feedback?: string
  ): Promise<ArchitecturePlan> {
    let prompt = `Based on the following ProjectPlan, design the software architecture and component hierarchy.
Return the output ONLY as valid JSON matching the schema.

ProjectPlan:
${JSON.stringify(projectPlan, null, 2)}`;

    if (feedback) {
      prompt += `\n\nCRITICAL FEEDBACK FROM PREVIOUS ATTEMPT:\n${feedback}\n\nYou MUST fix this in your new architecture.`;
    }

    const geminiSchema = zodToGeminiSchema(architecturePlanSchema);

    let raw: ArchitecturePlan;
    try {
      raw = await this.gemini.generateStructured<ArchitecturePlan>(
        prompt,
        geminiSchema,
        ARCHITECT_SYSTEM_PROMPT,
        { taskName: "Architect" }
      );
    } catch (error) {
      console.error("[Architect] Initial generation failed:", error);
      throw new InternalServerError("Failed to generate architecture plan.");
    }

    // 1. Deterministic Repair Layer
    const repaired = repairArchitectureIntegrity(raw);

    try {
      return architecturePlanSchema.parse(repaired);
    } catch (error) {
      if (!(error instanceof ZodError)) {
        throw error;
      }

      console.log(`[Architect] Deterministic repair failed. Attempting targeted LLM retry...`);

      // 2. Targeted LLM Retry Layer
      const patchSchema = zodToGeminiSchema(architecturePatchSchema);
      const patchPrompt = `You are repairing an ArchitecturePlan.
The current fileStructure is:
${JSON.stringify(repaired.fileStructure, null, 2)}

The validation failed with the following error:
${error.message}

Respond with a JSON patch to fix this: either add the missing file to fileStructure, or correct the importPath of the broken contract.`;

      try {
        const patch = await this.gemini.generateStructured<any>(
          patchPrompt,
          patchSchema,
          "You are an expert software architect fixing a structural invariant. Return ONLY the JSON patch matching the schema.",
          { taskName: "Architect Retry" }
        );

        const validPatch = architecturePatchSchema.parse(patch);

        // Apply Patch
        if (validPatch.addedFiles && validPatch.addedFiles.length > 0) {
          repaired.fileStructure.push(...validPatch.addedFiles);
        }

        if (validPatch.modifiedComponentContracts && validPatch.modifiedComponentContracts.length > 0) {
          for (const mod of validPatch.modifiedComponentContracts) {
            const existing = repaired.componentContracts.find(c => c.name === mod.name);
            if (existing) {
              existing.importPath = mod.importPath;
            }
          }
        }

        // Final validation
        return architecturePlanSchema.parse(repaired);
      } catch (retryError) {
        console.error("[Architect] Targeted LLM repair failed or produced invalid patch.", retryError);
        throw new InternalServerError("Failed to generate a valid architecture plan after targeted repair. Please try again.");
      }
    }
  }
}
