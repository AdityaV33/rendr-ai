import type { GenerationState } from "../state.js";
import type { GeneratorService } from "../../generator/generator.service.js";

/**
 * GeneratorNode: Responsible for generating the actual source code
 * based on the plan and architecture.
 */
export class GeneratorNode {
  constructor(private readonly generatorService: GeneratorService) {}

  async execute(state: GenerationState): Promise<GenerationState> {
    if (!state.plan || !state.architecture) {
      throw new Error("GeneratorNode requires state.plan and state.architecture");
    }

    const generatedFiles = await this.generatorService.generateProject(
      state.plan,
      state.architecture
    );
    
    return {
      ...state,
      generatedFiles,
    };
  }
}
