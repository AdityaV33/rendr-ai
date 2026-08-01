import { ZodError } from "zod";
import { GeminiService } from "../clients/gemini.service.js";
import { ARCHITECT_SYSTEM_PROMPT } from "../prompts/architect.prompt.js";
import { architecturePlanSchema } from "../schemas/architecture-plan.schema.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import { InternalServerError } from "../../lib/http-error.js";

const MAX_VALIDATION_RETRIES = 1;

/** Pre-computed Gemini-compatible JSON schema — avoids re-converting on every request */
const ARCHITECTURE_PLAN_GEMINI_SCHEMA = zodToGeminiSchema(architecturePlanSchema);

export class ArchitectService {
  private readonly gemini: GeminiService;

  constructor(gemini: GeminiService) {
    this.gemini = gemini;
  }

  /**
   * Receives a validated ProjectPlan and produces a validated ArchitecturePlan.
   * If the first Gemini response fails schema validation, retries exactly once.
   */
  async architect(projectPlan: ProjectPlan): Promise<ArchitecturePlan> {
    const prompt = `Based on the following product requirements (ProjectPlan), design the complete system architecture and file structure.\n\nProjectPlan:\n${JSON.stringify(projectPlan, null, 2)}`;
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
      try {
        const raw = await this.gemini.generateStructured<ArchitecturePlan>(
          prompt,
          ARCHITECTURE_PLAN_GEMINI_SCHEMA,
          ARCHITECT_SYSTEM_PROMPT,
          { temperature: 0.1 } // Very low temperature for architectural consistency
        );

        // Validate with Zod — no raw Gemini response leaves this service
        const result = architecturePlanSchema.parse(raw);
        return result;
      } catch (error) {
        // If it's not a schema validation failure, GeminiService already handled
        // network retries/timeouts. Propagate immediately.
        if (!(error instanceof ZodError)) {
          throw error;
        }

        lastError = error;

        if (attempt < MAX_VALIDATION_RETRIES) {
          console.log("Architect schema validation failed. Retrying once...");
        }
      }
    }

    // If we exhausted schema validation retries, throw a clean application error
    console.error("Architect failed to generate a valid schema after retries", lastError);
    throw new InternalServerError("Failed to generate a valid architecture plan. Please try again.");
  }
}
