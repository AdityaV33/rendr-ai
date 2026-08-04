import type { ProjectPlan } from "../types/project-plan.types.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";

export interface ContextBuilderOptions {
  agent: "generator" | "autofix" | "refinement" | string;
  projectPlan: ProjectPlan;
  architecturePlan: ArchitecturePlan;
  currentBatch?: {
    files: ArchitecturePlan["fileStructure"];
  };
}

export interface ApplicationSummary {
  applicationType: string;
  purpose: string;
  theme?: ProjectPlan["theme"];
  stack: ArchitecturePlan["stack"];
  strategies: ArchitecturePlan["strategies"];
}

export type ComponentPropType = "string" | "number" | "boolean" | "() => void" | "ReactNode" | "string[]" | "number[]" | "boolean[]";

export interface ComponentContract {
  name: string;
  description: string;
  exportType: "default" | "named";
  props: Array<{
    name: string;
    type: ComponentPropType;
    required: boolean;
  }>;
}

export interface CompositionTarget extends Omit<ComponentContract, "description"> {
  importPath: string;
}

export interface GeneratorContext {
  applicationSummary: ApplicationSummary;
  batchResponsibilities: string[];
  relevantFeatures: string[];
  relevantPages: ProjectPlan["pages"];
  relevantComponents: ProjectPlan["components"];
  compositionTargets?: CompositionTarget[];
  componentContracts?: Record<string, Omit<ComponentContract, "description">>;
  architectureNotes?: string;
  currentBatch: ArchitecturePlan["fileStructure"];
}
