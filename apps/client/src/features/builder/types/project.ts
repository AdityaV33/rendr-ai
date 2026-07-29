export interface Project {
  id: string;
  owner: string;
  name: string;
  prompt: string;
  framework: string;
  status: string;
  aiPlan: unknown;
  files: unknown[];
  createdAt: string;
  updatedAt: string;
}