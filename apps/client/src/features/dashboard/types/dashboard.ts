export interface Project {
  id: string;
  name: string;
  prompt: string;
  framework: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  prompt: string;
}