import { ZodError } from "zod";
import { PLANNER_SYSTEM_PROMPT } from "../prompts/planner.prompt.js";
import { projectPlanSchema } from "../schemas/project-plan.schema.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import { GroqSchedulerService } from "../scheduler/groq-scheduler.service.js";
import { BadRequestError, InternalServerError } from "../../lib/http-error.js";

const MAX_VALIDATION_RETRIES = 1;

export class PlannerService {
  constructor(private readonly groqScheduler: GroqSchedulerService) {}

  /**
   * Receives a user prompt and produces a validated ProjectPlan.
   * If the first Groq response fails schema validation, retries exactly once.
   */
  async plan(prompt: string): Promise<ProjectPlan> {
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestError("A prompt is required to generate a project plan.");
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
      try {
        const raw = await this.groqScheduler.generateStructured<ProjectPlan>(
          prompt,
          projectPlanSchema,
          PLANNER_SYSTEM_PROMPT,
          { taskName: "Planner" }
        );

        // Validate with Zod — no raw Groq response leaves this service
        const result = projectPlanSchema.parse(raw);
        return result;
      } catch (error) {
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