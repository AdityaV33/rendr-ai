import type { ProjectPlan } from "../types/project-plan.types.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { GeneratedProject } from "../types/generated-project.types.js";
import type { ValidationResult } from "../types/validation.types.js";
import type {
  GraphStatus,
  GraphNodeName,
  GenerationProject,
  WorkspaceState,
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
  architectFeedback?: string;
  generatedFiles?: GeneratedProject;
  validationResult?: ValidationResult;
  workspace?: WorkspaceState;
  buildResult?: BuildResult;
  gateAttempts?: Record<string, number>;
  currentStep: GraphNodeName;
  status: GraphStatus;
  previewUrl?: string;
  errors: string[];
  executionHistory: ExecutionHistoryEvent[];
  checkpoints: Checkpoint[];
  metrics: {
    plannerMs: number;
    architectMs: number;
    generatorMs: number;
    validationMs: number; // accumulated
    repairMs: number; // accumulated
    totalMs: number;
  };
}
