import type { GenerationState } from "../state.js";
import type { PlannerService } from "../../planner/planner.service.js";

/**
 * PlannerNode: Responsible for creating the high-level project plan
 * from a natural language prompt.
 */
export class PlannerNode {
  constructor(private readonly plannerService: PlannerService) {}

  async execute(state: GenerationState): Promise<GenerationState> {
    const plan = await this.plannerService.plan(state.prompt);
    
    return {
      ...state,
      plan,
    };
  }
}
