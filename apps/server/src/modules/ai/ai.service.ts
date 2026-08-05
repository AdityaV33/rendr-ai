import { GeminiService } from "./clients/gemini.service.js";
import type { ArchitecturePlan } from "./types/architecture-plan.types.js";
import type { ProjectPlan } from "./types/project-plan.types.js";
import type { GeneratedProject } from "./types/generated-project.types.js";
import { BadRequestError, InternalServerError } from "../lib/http-error.js";
import { createGenerationGraph } from "./graph/factory.js";
import type { GenerationGraph } from "./graph/graph.js";
import type { GenerationState } from "./graph/state.js";
import { ModelSchedulerService } from "./scheduler/index.js";

/**
 * AiService is the top-level orchestrator for all AI operations.
 * It owns the shared GeminiService instance and injects it into sub-services.
 */
export class AiService {
  private readonly gemini: GeminiService;
  private readonly graph: GenerationGraph;

  constructor() {
    const scheduler = new ModelSchedulerService();
    this.gemini = new GeminiService(scheduler);
    this.graph = createGenerationGraph(this.gemini);
  }

  async generate(data: { prompt?: string }): Promise<{ projectPlan: ProjectPlan; architecturePlan: ArchitecturePlan; generatedProject: GeneratedProject }> {
    if (!data.prompt) {
      throw new BadRequestError("A prompt is required.");
    }


    const initialState: GenerationState = {
      prompt: data.prompt,
      project: {
        id: "",
        framework: "",
      },
      repairAttempts: 0,
      currentStep: "planner",
      status: "idle",
      errors: [],
      executionHistory: [],
      checkpoints: []
    };

    const finalState = await this.graph.execute(initialState, (event) => {
      if (event.type.endsWith("_started")) {
        const node = event.type.split("_")[0];
        console.log(`[Pipeline] ${node.charAt(0).toUpperCase() + node.slice(1)} Started`);
      } else if (event.type.endsWith("_completed")) {
        const node = event.type.split("_")[0];
        const duration = event.durationMs ? `(${event.durationMs.toFixed(0)}ms)` : "";
        console.log(`[Pipeline] ${node.charAt(0).toUpperCase() + node.slice(1)} Finished ${duration}`);
      }
    });

    if (!finalState.plan || !finalState.architecture || !finalState.generatedFiles) {
      throw new InternalServerError("Pipeline execution failed to generate required artifacts.");
    }

    return { 
      projectPlan: finalState.plan, 
      architecturePlan: finalState.architecture, 
      generatedProject: finalState.generatedFiles 
    };
  }

  async refine(_data: unknown) {
    // Placeholder — will be implemented in a future milestone
    return { status: "placeholder", message: "refine method not implemented" };
  }
}

export const aiService = new AiService();
