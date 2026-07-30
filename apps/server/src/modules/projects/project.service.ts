import { ProjectModel } from "./project.model.js";
import {
  CreateProjectInput, UpdateProjectInput,} from "./project.validation.js";
import { planProject } from "../ai/index.js";
import type { ProjectPlan } from "../ai/index.js";
import { NotFoundError } from "../lib/http-error.js";
import * as workspaceService from "../runtime/workspace.service.js";
import * as runtimeManagerService from "../runtime/runtime-manager.service.js";


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
  const project = await ProjectModel.findOneAndDelete({
    _id: projectId,
    owner,
  });

  if (project) {
    try {
      runtimeManagerService.stopRuntime(projectId);
      await workspaceService.deleteWorkspace(projectId);
    } catch (err) {
      console.error(`Failed to clean up resources for project ${projectId}`, err);
    }
  }

  return project;
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
export async function requireProject(
  owner: string,
  projectId: string,
) {
  const project = await getProjectById(
    owner,
    projectId,
  );

  if (!project) {
    throw new NotFoundError(
      "Project not found.",
    );
  }

  return project;
}

export async function updateProjectStatus(
  projectId: string,
  status: import("./project.model.js").ProjectStatus,
) {
  return ProjectModel.findByIdAndUpdate(
    projectId,
    { status },
    {
      new: true,
      runValidators: true,
    },
  );
}