import type { ProjectPlan } from "../types/project-plan.types.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { GeneratedProject } from "../types/generated-project.types.js";
import type { GeneratedFile } from "../types/generated-file.types.js";

export interface GenerationProject {
  id: string;
  framework: string;
}
export interface WorkspaceState {}
export interface ValidationState {}

export type GraphStatus = "idle" | "running" | "paused" | "completed" | "failed";

export type GraphNodeName =
  | "planner"
  | "architect"
  | "generator"
  | "validator"
  | "workspace"
  | "build"
  | "errorAnalyzer"
  | "repair"
  | "preview";

export interface GenerationStep {
  node: GraphNodeName;
  status: "pending" | "in_progress" | "success" | "error";
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface Checkpoint {
  id: string;
  timestamp: Date;
  state: unknown; // Will be typed as GenerationState later
}

export interface ExecutionHistoryEvent {
  id: string;
  node: GraphNodeName;
  event: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface BuildResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  diagnostics?: string[];
  durationMs?: number;
}

export interface GenerationArtifact {
  path: string;
  content: string;
  type: "code" | "config" | "asset";
}
