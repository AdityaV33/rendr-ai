import type { ProjectPlan } from "../types/project-plan.types.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { GeneratedProject } from "../types/generated-project.types.js";
import type {
  GraphStatus,
  GraphNodeName,
  GenerationProject,
  WorkspaceState,
  ValidationState,
  Checkpoint,
  ExecutionHistoryEvent,
  BuildResult,
} from "./types.js";

/**
 * GenerationState represents the core execution state for the LangGraph orchestrator.
 * It is passed between nodes as the workflow executes.
 */
export interface GenerationState {
  prompt: string;
  project: GenerationProject;
  plan?: ProjectPlan;
  architecture?: ArchitecturePlan;
  generatedFiles?: GeneratedProject;
  validationResult?: ValidationState;
  workspace?: WorkspaceState;
  buildResult?: BuildResult;
  repairAttempts: number;
  currentStep: GraphNodeName;
  status: GraphStatus;
  previewUrl?: string;
  errors: string[];
  executionHistory: ExecutionHistoryEvent[];
  checkpoints: Checkpoint[];
}
