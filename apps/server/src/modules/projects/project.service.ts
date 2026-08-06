import { ProjectModel, ProjectFramework } from "./project.model.js";
import {
  CreateProjectInput, UpdateProjectInput,} from "./project.validation.js";
import { aiService } from "../ai/index.js";
import { NotFoundError } from "../lib/http-error.js";
import * as workspaceService from "../runtime/workspace.service.js";
import * as runtimeManagerService from "../runtime/runtime-manager.service.js";

import * as workspaceFileService from "../runtime/workspace-file.service.js";

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

export async function generateProject(owner: string, projectId: string) {
  const project = await ProjectModel.findOne({ owner, _id: projectId });
  if (!project) {
    throw new NotFoundError("Project not found");
  }

  project.status = "generating";
  await project.save();

  let runtimePrepPromise: Promise<void> | null = null;
  let runtimeTime = 0;
  const startOverall = performance.now();

  console.log("\n===================================");
  console.log("Parallel Execution Started");
  console.log("===================================");

  try {
    const { projectPlan, architecturePlan, generatedProject } = await aiService.generate({ 
      prompt: project.prompt,
      onEvent: (event) => {
        if (event.type === "architect_completed" && event.state.architecture) {
          console.log("\n-----------------------------------");
          console.log("Runtime Branch Started");
          console.log("-----------------------------------");
          
          const framework = event.state.architecture.stack.frontendFramework;
          const packageManager = event.state.architecture.stack.packageManager ?? "npm";
          const installCommand = `${packageManager} install`;
          
          const startRuntime = performance.now();
          runtimePrepPromise = runtimeManagerService.prepareWorkspace(
            projectId, 
            framework,
            installCommand
          ).then(() => {
            runtimeTime = performance.now() - startRuntime;
            console.log("\n-----------------------------------");
            console.log("Dependencies Installed");
            console.log("Waiting for AI generation...");
            console.log("-----------------------------------");
          });
        }
      }
    });

    const aiTime = performance.now() - startOverall;

    console.log("\n-----------------------------------");
    console.log("Generation Complete");
    console.log("-----------------------------------");

    console.log("\n[Pipeline] Synchronizing Runtime Workspace");

    if (runtimePrepPromise) {
      await runtimePrepPromise; // If runtime failed, this will throw
    }

    const startSync = performance.now();

    project.aiPlan = projectPlan;
    project.architecturePlan = architecturePlan;
    project.generatedProject = generatedProject;
    
    project.files = generatedProject.files.map(f => f.path);
    project.framework = generatedProject.project.framework as ProjectFramework;
    project.status = "ready";

    await project.save();

    await workspaceFileService.writeGeneratedProject(projectId, generatedProject.files);
    
    const syncTime = performance.now() - startSync;

    console.log("[Runtime] Preview Started");
    await runtimeManagerService.startPreviewOnly(projectId, generatedProject.commands.dev);

    const totalTime = performance.now() - startOverall;

    console.log("\n===================================");
    console.log(`AI Branch: ${aiTime.toFixed(0)}ms`);
    console.log(`Runtime Branch: ${runtimeTime.toFixed(0)}ms`);
    console.log(`Synchronization: ${syncTime.toFixed(0)}ms`);
    console.log(`Total Pipeline: ${totalTime.toFixed(0)}ms`);
    console.log("===================================\n");

    return project;
  } catch (error) {
    project.status = "failed";
    await project.save();
    
    // AI Failure / Runtime Failure Cleanup
    try {
      runtimeManagerService.stopRuntime(projectId);
      await workspaceService.deleteWorkspace(projectId);
    } catch (cleanupErr) {
      console.error(`[Pipeline] Failed to clean up workspace after error:`, cleanupErr);
    }

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