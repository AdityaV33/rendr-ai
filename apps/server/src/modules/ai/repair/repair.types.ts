import type { ArchitecturePlan } from "../types/architecture-plan.types.js";

export interface ParsedDiagnostic {
  tool: "tsc" | "vite" | "eslint" | "unknown";
  category: "infrastructure" | "localized_logic" | "contract" | "runtime" | "unknown";
  code: string;
  file?: string;
  line?: number;
  column?: number;
  message: string;
}

export interface RepairContext {
  diagnostics: ParsedDiagnostic[];
  editableFiles: { path: string; content: string }[];
  contextOnlyFiles: { path: string; content: string }[];
  architecture: ArchitecturePlan;
   
  contracts: Record<string, any>;
  buildCommand?: string;
  framework: string;
  rawErrorOutput: string;
}
