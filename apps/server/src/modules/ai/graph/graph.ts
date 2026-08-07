import type { GenerationState } from "./state.js";
import type { GraphEvent, GraphEventType } from "./types.js";

import type { PlannerNode } from "./nodes/planner.node.js";
import type { ArchitectNode } from "./nodes/architect.node.js";
import type { GeneratorNode } from "./nodes/generator.node.js";
import type { GateRunnerNode } from "./nodes/gate-runner.node.js";

export class GenerationGraph {
  constructor(
    private readonly plannerNode: PlannerNode,
    private readonly architectNode: ArchitectNode,
    private readonly generatorNode: GeneratorNode,
    private readonly gateRunnerNode: GateRunnerNode
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
    currentState.metrics.plannerMs = performance.now() - startNode;
    emit("planner_completed", currentState.metrics.plannerMs);

    let architectAttempts = 0;
    while (architectAttempts < 3) {
      architectAttempts++;
      
      startNode = performance.now();
      emit("architect_started");
      currentState = await this.architectNode.execute(currentState);
      currentState.metrics.architectMs += (performance.now() - startNode);
      emit("architect_completed", performance.now() - startNode);

      const oversized = this.generatorNode.identifyOversizedFiles(currentState.architecture!.fileStructure);
      
      if (oversized.length > 0 && architectAttempts < 3) {
        const feedback = `The following files are predicted to be too large to generate in a single response (exceeding maximum token limits): ${oversized.join(", ")}. You MUST decompose them into smaller, independent components.`;
        currentState.architectFeedback = feedback;
        console.warn(`[Pipeline] Architect generated oversized files. Retrying... (${oversized.join(", ")})`);
      } else {
        if (oversized.length > 0) {
          console.error(`[Pipeline] Architect still generating oversized files after 3 attempts. Proceeding with caution...`);
        }
        break;
      }
    }

    startNode = performance.now();
    emit("generator_started");
    currentState = await this.generatorNode.execute(currentState);
    currentState.metrics.generatorMs = performance.now() - startNode;
    emit("generator_completed", currentState.metrics.generatorMs);

    startNode = performance.now();
    emit("gate_runner_started");
    currentState = await this.gateRunnerNode.execute(currentState, onEvent);
    currentState.metrics.validationMs = performance.now() - startNode;
    emit("gate_runner_completed", currentState.metrics.validationMs);

    currentState.metrics.totalMs = performance.now() - startGraph;
    emit("graph_completed", currentState.metrics.totalMs);

    return currentState;
  }
}
