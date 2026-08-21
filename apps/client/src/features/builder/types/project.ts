export interface Project {
  id: string;
  owner: string;
  name: string;
  prompt: string;
  framework: string;
  status:
    | "draft"
    | "planning"
    | "generating"
    | "building"
    | "repairing"
    | "ready"
    | "failed"
    | "refining"
    | "pending_changes";
  aiPlan: unknown;
  architecturePlan: unknown | null;
  generatedProject: unknown | null;
  files: unknown[];
  pipelineStage?: string | null;
  history?: unknown[];
  historyCount?: number;
  hasPendingChanges?: boolean;
  createdAt: string;
  updatedAt: string;
}