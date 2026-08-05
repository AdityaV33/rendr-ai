import type { GenerationState } from "../state.js";
import type { ArchitectService } from "../../architect/architect.service.js";

/**
 * ArchitectNode: Responsible for defining the file structure and
 * technical architecture based on the project plan.
 */
export class ArchitectNode {
  constructor(private readonly architectService: ArchitectService) {}

  async execute(state: GenerationState): Promise<GenerationState> {
    if (!state.plan) {
      throw new Error("ArchitectNode requires state.plan");
    }

    const architecture = await this.architectService.architect(state.plan);
    
    return {
      ...state,
      architecture,
    };
  }
}
