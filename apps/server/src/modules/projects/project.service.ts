import { ProjectModel } from "./project.model.js";
import {
  CreateProjectInput, UpdateProjectInput,} from "./project.validation.js";
import { planProject } from "../ai/index.js";
import type { ProjectPlan } from "../ai/index.js";
import { NotFoundError } from "../lib/http-error.js";


export async function createProject(
  owner: string,
  data: CreateProjectInput,
) {
  return ProjectModel.create({
    owner,
    name: data.name,
    prompt: data.prompt,
  });
}

export async function getProjects(owner: string) {
  return ProjectModel.find({ owner }).sort({
    updatedAt: -1,
  });
}

export async function getProjectById(
  owner: string,
  projectId: string
) {
  return ProjectModel.findOne({
    _id: projectId,
    owner,
  });
}

export async function updateProject(
  owner: string,
  projectId: string,
  data: UpdateProjectInput,
) {
  return ProjectModel.findOneAndUpdate(
    {
      _id: projectId,
      owner,
    },
    data,
    {
      new: true,
      runValidators: true,
    }
  );
}

export async function deleteProject(
  owner: string,
  projectId: string
) {
  return ProjectModel.findOneAndDelete({
    _id: projectId,
    owner,
  });
}
export async function generateProject(
  owner: string,
  projectId: string,
  
) {
  const project = await ProjectModel.findOne({
    owner,
    _id: projectId,
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const plan: ProjectPlan = await planProject(
  project.prompt,
);

project.framework = plan.framework;
project.aiPlan = plan;
project.status = "planning";

await project.save();

return project;
}