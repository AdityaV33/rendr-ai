import { ProjectModel, ProjectFramework } from "./project.model.js";
import {
  CreateProjectInput, UpdateProjectInput,} from "./project.validation.js";
import { aiService } from "../ai/index.js";
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
      returnDocument: "after",
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

  project.status = "generating";
  await project.save();

  try {
    console.log("\n[Pipeline] Planner Started");
    console.log("[Pipeline] Architecture Generation Started");
    console.log("[Pipeline] Generator Started");

    const { projectPlan, architecturePlan, generatedProject } = await aiService.generate({ prompt: project.prompt });

    console.log("[Pipeline] Generator Finished");
    console.log("[Pipeline] Persisting to Database");

    project.aiPlan = projectPlan;
    project.architecturePlan = architecturePlan;
    project.generatedProject = generatedProject;
    
    // Convert GeneratedProject files[] to string[] for the Project.files schema
    project.files = generatedProject.files.map(f => f.path);
    project.framework = generatedProject.project.framework as ProjectFramework;

    console.log(`[Pipeline] Resolved Framework: ${project.framework} | Language: ${generatedProject.project.language}`);

    project.status = "ready";

    await project.save();

    console.log("[Pipeline] Project Saved");
    console.log("[Pipeline] Runtime Starting");

    return project;
  } catch (error) {
    project.status = "failed";
    await project.save();
    throw error;
  }
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
      returnDocument: "after",
      runValidators: true,
    },
  );
}