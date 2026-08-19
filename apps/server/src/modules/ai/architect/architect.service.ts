import { ZodError } from "zod";
import { GroqService } from "../clients/groq.service.js";
import { ARCHITECT_SYSTEM_PROMPT } from "../prompts/architect.prompt.js";
import { architecturePlanSchema } from "../schemas/architecture-plan.schema.js";
import { GroqSchedulerService } from "../scheduler/groq-scheduler.service.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import { InternalServerError } from "../../lib/http-error.js";

const MAX_VALIDATION_RETRIES = 1;

export class ArchitectService {
  constructor(private readonly groqScheduler: GroqSchedulerService) {}

  /**
   * Receives a validated ProjectPlan and produces a validated ArchitecturePlan.
   * If the first Groq response fails schema validation, retries exactly once.
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
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
      try {
        const raw = await this.groqScheduler.generateStructured<ArchitecturePlan>(
          prompt,
          architecturePlanSchema,
          ARCHITECT_SYSTEM_PROMPT,
          { taskName: "Architect" }
        );

        // Validate with Zod — no raw Groq response leaves this service
        const result = architecturePlanSchema.parse(raw);
        return result;
      } catch (error) {
        if (!(error instanceof ZodError)) {
          throw error;
        }

        lastError = error;

        if (attempt < MAX_VALIDATION_RETRIES) {
          console.log("[Architect] Schema validation failed. Retrying...");
        }
      }
    }

    // If we exhausted schema validation retries, throw a clean application error
    console.error("[Architect] Failed to generate valid schema after retries.", lastError);
    throw new InternalServerError("Failed to generate a valid architecture plan. Please try again.");
  }
}
