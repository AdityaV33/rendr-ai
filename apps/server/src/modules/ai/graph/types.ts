// Imports removed as requested

export interface GenerationProject {
  readonly id: string;
  readonly framework: string;
}
export interface WorkspaceState {
  readonly workspaceId?: string;
}

export type GraphStatus = "idle" | "running" | "paused" | "completed" | "failed";

export type GraphEventType = 
  | "planner_started" | "planner_completed"
  | "architect_started" | "architect_completed"
  | "generator_started" | "generator_completed"
  | "validator_started" | "validator_completed"
  | "graph_started" | "graph_completed";
import type { GenerationState } from "./state.js";

export interface GraphEvent {
  type: GraphEventType;
  timestamp: number;
  durationMs?: number;
  state: GenerationState;
}

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
