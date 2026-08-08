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
      
      // Calculate AI File Budget (files that don't exist in templates)
      const aiFiles = currentState.architecture!.fileStructure.filter(f => f.type === 'file' && f.purpose).length;
      const budgetExceeded = aiFiles > 10;
      
      // Calculate Generation Unit Complexity
      let largestPlannedFile = "";
      let largestResponsibilities = 0;
      let rejectedReason = "";
      let hasViolation = false;

      currentState.architecture!.fileStructure.forEach(f => {
         const behavior = currentState.architecture!.behavioralContracts?.find(b => b.file === f.path);
         
         const responsibilitiesCount = behavior?.responsibilities?.length || 0;
         const rulesCount = behavior?.behaviorRules?.length || 0;
         
         let violation = "";
         if (responsibilitiesCount > 5) violation = `Contains >5 responsibilities (${responsibilitiesCount})`;
         else if (rulesCount > 7) violation = `Contains >7 behavior rules (${rulesCount})`;
         else if (behavior?.responsibilities) {
           const text = behavior.responsibilities.join(" ").toLowerCase();
           const keywords = ["chart", "table", "modal", "form", "crud", "analytics", "dashboard", "list", "filter", "search"];
           const found = keywords.filter(k => text.includes(k));
           if (found.length >= 4) {
             violation = `Contains conflicting/excessive responsibilities (${found.join(" + ")})`;
           }
         }
         
         if (violation && !hasViolation) {
           hasViolation = true;
           rejectedReason = violation;
           largestPlannedFile = f.path;
           largestResponsibilities = responsibilitiesCount;
         } else if (!hasViolation && responsibilitiesCount > largestResponsibilities) {
           largestPlannedFile = f.path;
           largestResponsibilities = responsibilitiesCount;
         }
      });
      
      console.log(`\nArchitecture Summary\n\nAI Files: ${aiFiles}\n\nLargest Planned Generation Unit:\n${largestPlannedFile || "None"}\n\nPrimary Responsibilities: ${largestResponsibilities}\n\nRisk:\n${hasViolation ? "HIGH" : "LOW"}`);
      if (hasViolation) {
        console.log(`\nReason:\n${rejectedReason}\n\nDecision:\nRejecting architecture and requesting decomposition.\n`);
      }
      
      if ((oversized.length > 0 || budgetExceeded || hasViolation) && architectAttempts < 3) {
        let feedback = "";
        if (oversized.length > 0) {
          feedback += `The following files are predicted to be too large to generate in a single response (exceeding maximum token limits): ${oversized.join(", ")}. You MUST decompose them into smaller, independent components. `;
        }
        if (budgetExceeded) {
          feedback += `You generated ${aiFiles} AI files, which exceeds the strict maximum budget of 10 files. You MUST completely defer the lowest-priority workflows to respect this limit instead of merging logic.`;
        }
        if (hasViolation) {
          feedback += `The file ${largestPlannedFile} is too monolithic and violates the Generation Unit limits (${rejectedReason}). You MUST split this logic into smaller, cohesive helper components (e.g. separate the modal, table, or charts). Do not generate "god components".`;
        }
        
        currentState.architectFeedback = feedback;
        currentState.metrics.architectRetries++;
        console.warn(`[Pipeline] Architect generated invalid architecture: ${oversized.length > 0 ? 'Oversized files' : ''} ${budgetExceeded ? `Budget exceeded (${aiFiles} files)` : ''} ${hasViolation ? `Complexity violation` : ''}. Retrying...`);
      } else {
        if (oversized.length > 0 || budgetExceeded || hasViolation) {
          console.error(`[Pipeline] Architect still generating invalid architecture after 3 attempts. Proceeding with caution...`);
        }
        break;
      }
    }

    let generatorAttempts = 0;
    while (generatorAttempts < 2) {
      generatorAttempts++;
      try {
        startNode = performance.now();
        emit("generator_started");
        currentState = await this.generatorNode.execute(currentState);
        currentState.metrics.generatorMs = performance.now() - startNode;
        emit("generator_completed", currentState.metrics.generatorMs);
        break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.message === "MAX_TOKENS_EXCEEDED" && generatorAttempts < 2) {
          console.warn("[Pipeline] Generator hit MAX_TOKENS_EXCEEDED. Returning to Planner to reduce scope...");
          // If the architecture is too complex, tell the planner to reduce scope and restart the graph
          currentState.plannerFeedback = "The previous architectural plan resulted in a 'MAX_TOKENS_EXCEEDED' error during generation because it was too large. You MUST significantly reduce the scope of the MVP by dropping the lowest priority workflows and deferring more features.";
          
          emit("planner_started");
          currentState = await this.plannerNode.execute(currentState);
          emit("planner_completed", performance.now() - startNode);
          
          // Reset architect feedback and rerun architect
          currentState.architectFeedback = undefined;
          emit("architect_started");
          currentState = await this.architectNode.execute(currentState);
          emit("architect_completed", performance.now() - startNode);
          continue; // Try generator again
        } else {
          throw err;
        }
      }
    }

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
