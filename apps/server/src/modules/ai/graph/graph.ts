import type { GenerationState } from "./state.js";
import type { GraphEvent, GraphEventType } from "./types.js";

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

  public async execute(
    state: GenerationState, 
    onEvent?: (event: GraphEvent) => void
  ): Promise<GenerationState> {
    const emit = (type: GraphEventType, durationMs?: number) => {
      if (onEvent) {
        onEvent({ type, timestamp: Date.now(), durationMs, state: currentState });
      }
    };

    let currentState = state;
    const startGraph = performance.now();
    emit("graph_started");

    let startNode = performance.now();
    emit("planner_started");
    currentState = await this.plannerNode.execute(currentState);
    emit("planner_completed", performance.now() - startNode);

    startNode = performance.now();
    emit("architect_started");
    currentState = await this.architectNode.execute(currentState);
    emit("architect_completed", performance.now() - startNode);

    startNode = performance.now();
    emit("generator_started");
    currentState = await this.generatorNode.execute(currentState);
    emit("generator_completed", performance.now() - startNode);

    startNode = performance.now();
    emit("validator_started");
    currentState = await this.validatorNode.execute(currentState);
    emit("validator_completed", performance.now() - startNode);

    emit("graph_completed", performance.now() - startGraph);

    return currentState;
  }
}
