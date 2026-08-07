import crypto from "node:crypto";
import { GeminiService } from "./clients/gemini.service.js";
import type { ArchitecturePlan } from "./types/architecture-plan.types.js";
import type { ProjectPlan } from "./types/project-plan.types.js";
import type { GeneratedProject } from "./types/generated-project.types.js";
import { BadRequestError, InternalServerError } from "../lib/http-error.js";
import { createGenerationGraph } from "./graph/factory.js";
import type { GenerationGraph } from "./graph/graph.js";
import type { GenerationState } from "./graph/state.js";
import { ModelSchedulerService } from "./scheduler/index.js";
import { devServerManager } from "../runtime/dev-server.manager.js";

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

  async generate(data: { prompt?: string, onEvent?: (event: import("./graph/types.js").GraphEvent) => void }): Promise<{ projectPlan: ProjectPlan; architecturePlan: ArchitecturePlan; generatedProject: GeneratedProject }> {
    if (!data.prompt) {
      throw new BadRequestError("A prompt is required.");
    }


    const initialState: GenerationState = {
      prompt: data.prompt,
      project: {
        id: crypto.randomUUID(),
        framework: "",
      },
      gateAttempts: {},
      currentStep: "planner",
      status: "idle",
      errors: [],
      executionHistory: [],
      checkpoints: [],
      metrics: {
        plannerMs: 0,
        architectMs: 0,
        generatorMs: 0,
        validationMs: 0,
        repairMs: 0,
        totalMs: 0,
      }
    };

    const finalState = await this.graph.execute(initialState, (event) => {
      // 1. Log the event internally
      if (event.type.endsWith("_started") && event.type !== "repair_started") {
        const node = event.type.split("_")[0];
        console.log(`[Pipeline] ${node.charAt(0).toUpperCase() + node.slice(1)} Started`);
      } else if (event.type === "repair_started") {
        console.log(`[Pipeline] Gate Repair Cycle Started`);
      } else if (event.type.endsWith("_completed")) {
        const node = event.type.split("_")[0];
        const duration = event.durationMs ? `(${event.durationMs.toFixed(0)}ms)` : "";
        console.log(`[Pipeline] ${node.charAt(0).toUpperCase() + node.slice(1)} Finished ${duration}`);
      }
      
      // 2. Forward to external listener if provided
      if (data.onEvent) {
        data.onEvent(event);
      }
    });
    
    // Stop the dev server if it was started during validation
    devServerManager.stopServer(initialState.project.id);

    if (finalState.validationResult && !finalState.validationResult.passed) {
      const issues = JSON.stringify(finalState.validationResult.issues, null, 2);
      throw new InternalServerError(`Pipeline execution failed validation after max repair attempts.\n\nValidation Report:\n${issues}`);
    }

    if (!finalState.plan || !finalState.architecture || !finalState.generatedFiles) {
      throw new InternalServerError("Pipeline execution failed to generate required artifacts.");
    }

    const schedulerMetrics = this.gemini.getSchedulerMetrics();
    const repairAttempts = Object.values(finalState.gateAttempts || {}).reduce((a, b) => a + b, 0);

console.log(`
========================================
[BENCHMARK] Phase 7 Pipeline Complete
========================================
Gate Repairs:           ${repairAttempts}
Total Time:             ${(finalState.metrics.totalMs / 1000).toFixed(1)} s
========================================
[BENCHMARK] Pipeline Breakdown
========================================
Planner:                ${(finalState.metrics.plannerMs / 1000).toFixed(1)} s
Architect:              ${(finalState.metrics.architectMs / 1000).toFixed(1)} s
Generator:              ${(finalState.metrics.generatorMs / 1000).toFixed(1)} s
GateRunner:             ${(finalState.metrics.validationMs / 1000).toFixed(1)} s
========================================
`);

    return { 
      projectPlan: finalState.plan, 
      architecturePlan: finalState.architecture, 
      generatedProject: finalState.generatedFiles 
    };
  }

  async refine(_data: unknown) {
    return { status: "placeholder", message: "refine method not implemented" };
  }
}

export const aiService = new AiService();
