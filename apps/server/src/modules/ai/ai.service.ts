import { GeminiService } from "./clients/gemini.service.js";
import { PlannerService } from "./planner/planner.service.js";
import { ArchitectService } from "./architect/architect.service.js";
import type { ArchitecturePlan } from "./types/architecture-plan.types.js";
import type { ProjectPlan } from "./types/project-plan.types.js";
import type { GeneratedProject } from "./types/generated-project.types.js";
import { GeneratorService } from "./generator/generator.service.js";
import { TemplateEngine } from "./template/template.engine.js";
import { BadRequestError } from "../lib/http-error.js";

/**
 * AiService is the top-level orchestrator for all AI operations.
 * It owns the shared GeminiService instance and injects it into sub-services.
 */
export class AiService {
  private readonly gemini: GeminiService;
  private readonly planner: PlannerService;
  private readonly architect: ArchitectService;
  private readonly templateEngine: TemplateEngine;
  private readonly generator: GeneratorService;

  constructor() {
    this.gemini = new GeminiService();
    this.planner = new PlannerService(this.gemini);
    this.architect = new ArchitectService(this.gemini);
    this.templateEngine = new TemplateEngine();
    this.generator = new GeneratorService(this.gemini, this.templateEngine);
  }

  async generate(data: { prompt?: string }): Promise<{ projectPlan: ProjectPlan; architecturePlan: ArchitecturePlan; generatedProject: GeneratedProject }> {
    if (!data.prompt) {
      throw new BadRequestError("A prompt is required.");
    }

    const startTotal = performance.now();

    const startPlanner = performance.now();
    const projectPlan = await this.planner.plan(data.prompt);
    console.log(`[Pipeline] Planner Finished (${(performance.now() - startPlanner).toFixed(0)}ms)`);

    const startArchitect = performance.now();
    const architecturePlan = await this.architect.architect(projectPlan);
    console.log(`[Pipeline] Architecture Finished (${(performance.now() - startArchitect).toFixed(0)}ms)`);

    const startGenerator = performance.now();
    const generatedProject = await this.generator.generateProject(projectPlan, architecturePlan);
    console.log(`[Pipeline] Generator Finished (${(performance.now() - startGenerator).toFixed(0)}ms)`);
    
    console.log(`[Pipeline] AI Pipeline Total (${(performance.now() - startTotal).toFixed(0)}ms)`);

    return { projectPlan, architecturePlan, generatedProject };
  }

  async refine(_data: unknown) {
    // Placeholder — will be implemented in a future milestone
    return { status: "placeholder", message: "refine method not implemented" };
  }
}

export const aiService = new AiService();
