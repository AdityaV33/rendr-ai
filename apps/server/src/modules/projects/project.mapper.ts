import type { HydratedDocument } from "mongoose";

import type { Project } from "./project.model.js";

export interface ProjectResponse {
  id: string;
  owner: string;
  name: string;
  prompt: string;
  framework: Project["framework"];
  status: Project["status"];
  aiPlan: Project["aiPlan"];
  files: Project["files"];
  createdAt: Project["createdAt"];
  updatedAt: Project["updatedAt"];
  generatedProject?: Project["generatedProject"];
  architecturePlan?: Project["architecturePlan"];
}

export function toProjectResponse(
  project: HydratedDocument<Project>,
): ProjectResponse {
  return {
    id: project._id.toString(),
    owner: project.owner.toString(),
    name: project.name,
    prompt: project.prompt,
    framework: project.framework,
    status: project.status,
    aiPlan: project.aiPlan,
    files: project.files,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    generatedProject: project.generatedProject,
    architecturePlan: project.architecturePlan,
  };
}