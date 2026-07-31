import { GeminiService } from "./clients/gemini.service.js";
import { PlannerService } from "./planner/planner.service.js";
import type { ProjectPlan } from "./types/project-plan.types.js";
import { BadRequestError } from "../lib/http-error.js";

/**
 * AiService is the top-level orchestrator for all AI operations.
 * It owns the shared GeminiService instance and injects it into sub-services.
 */
export class AiService {
  private readonly gemini: GeminiService;
  private readonly planner: PlannerService;

  constructor() {
    this.gemini = new GeminiService();
    this.planner = new PlannerService(this.gemini);
  }

  async generate(data: { prompt?: string }): Promise<ProjectPlan> {
    if (!data.prompt) {
      throw new BadRequestError("A prompt is required.");
    }

    return this.planner.plan(data.prompt);
  }

  async refine(_data: unknown) {
    // Placeholder — will be implemented in a future milestone
    return { status: "placeholder", message: "refine method not implemented" };
  }
}

export const aiService = new AiService();
