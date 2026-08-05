import type { GenerationState } from "./state.js";

import type { PlannerNode } from "./nodes/planner.node.js";
import type { ArchitectNode } from "./nodes/architect.node.js";
import type { GeneratorNode } from "./nodes/generator.node.js";
import type { ValidatorNode } from "./nodes/validator.node.js";

/**
 * LangGraph Orchestration Foundation
 */
export class GenerationGraph {
  constructor(
    private readonly plannerNode: PlannerNode,
    private readonly architectNode: ArchitectNode,
    private readonly generatorNode: GeneratorNode,
    private readonly validatorNode: ValidatorNode
  ) {}

  public async execute(state: GenerationState): Promise<GenerationState> {
    let currentState = state;

    currentState = await this.plannerNode.execute(currentState);
    currentState = await this.architectNode.execute(currentState);
    currentState = await this.generatorNode.execute(currentState);
    currentState = await this.validatorNode.execute(currentState);

    return currentState;
  }
}
