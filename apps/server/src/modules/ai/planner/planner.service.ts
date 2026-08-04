import { ZodError } from "zod";
import { GeminiService } from "../clients/gemini.service.js";
import { PLANNER_SYSTEM_PROMPT } from "../prompts/planner.prompt.js";
import { projectPlanSchema } from "../schemas/project-plan.schema.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import { BadRequestError, InternalServerError } from "../../lib/http-error.js";

const MAX_VALIDATION_RETRIES = 1;

/** Pre-computed Gemini-compatible JSON schema — avoids re-converting on every request */
const PROJECT_PLAN_GEMINI_SCHEMA = zodToGeminiSchema(projectPlanSchema);

export class PlannerService {
  private readonly gemini: GeminiService;

  constructor(gemini: GeminiService) {
    this.gemini = gemini;
  }

  /**
   * Receives a user prompt and produces a validated ProjectPlan.
   * If the first Gemini response fails schema validation, retries exactly once.
   */
  async plan(prompt: string): Promise<ProjectPlan> {
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestError("A prompt is required to generate a project plan.");
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
      try {
        const raw = await this.gemini.generateStructured<ProjectPlan>(
          prompt,
          PROJECT_PLAN_GEMINI_SCHEMA,
          PLANNER_SYSTEM_PROMPT,
          { temperature: 0.2 } // Lower temperature for more deterministic product planning
        );

        // Validate with Zod — no raw Gemini response leaves this service
        const result = projectPlanSchema.parse(raw);
        return result;
      } catch (error) {
        // If it's not a schema validation failure, GeminiService already handled
        // network retries/timeouts. Propagate immediately.
        if (!(error instanceof ZodError)) {
          throw error;
        }

        lastError = error;

        if (attempt < MAX_VALIDATION_RETRIES) {
          console.log("[Planner] Schema validation failed. Retrying...");
        }
      }
    }

    // If we exhausted schema validation retries, throw a clean application error
    console.error("[Planner] Failed to generate valid schema after retries.", lastError);
    throw new InternalServerError("Failed to generate a valid project plan. Please try again.");
  }
}