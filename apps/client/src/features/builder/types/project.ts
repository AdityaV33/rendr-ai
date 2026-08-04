export interface Project {
  id: string;
  owner: string;
  name: string;
  prompt: string;
  framework: string;
  status: string;
  aiPlan: unknown;
  architecturePlan: unknown | null;
  generatedProject: unknown | null;
  files: unknown[];
  createdAt: string;
  updatedAt: string;
}