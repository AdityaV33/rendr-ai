import type { GenerationState } from "../state.js";
import type { GeneratorV2Service } from "../../generator/generator-v2.service.js";

/**
 * GeneratorNode: Responsible for generating the actual source code
 * based on the plan and architecture.
 */
export class GeneratorNode {
  constructor(
    private readonly generatorV2Service: GeneratorV2Service,
  ) {}

  async execute(state: GenerationState): Promise<GenerationState> {
    if (!state.plan || !state.architecture) {
      throw new Error("GeneratorNode requires state.plan and state.architecture");
    }

    const generatedFiles = await this.generatorV2Service.generateProject(
      state.project.id,
      state.plan,
      state.architecture
    );

    return {
      ...state,
      generatedFiles,
    };
  }

  public identifyOversizedFiles(
    _files: Array<{ path: string; purpose: string; complexity?: "low" | "medium" | "high" }>
  ): string[] {
    return [];
  }
}
