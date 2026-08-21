import crypto from "node:crypto";
import type { HydratedDocument } from "mongoose";
import { ProjectModel, type Project } from "./project.model.js";
import {
  CreateProjectInput, UpdateProjectInput,} from "./project.validation.js";
import { aiService } from "../ai/index.js";
import { NotFoundError, ConflictError } from "../lib/http-error.js";
import * as workspaceService from "../runtime/workspace.service.js";
import * as runtimeManagerService from "../runtime/runtime-manager.service.js";
import * as workspaceFileService from "../runtime/workspace-file.service.js";
import { pipelineRunContext } from "../ai/utils/run-context.js";


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

export async function cleanupOrphanedProjects() {
  const orphaned = await ProjectModel.updateMany(
    { status: { $in: ["generating", "building", "repairing"] } },
    { $set: { status: "failed", pipelineStage: "Failed (Server Restarted)" } }
  );
  if (orphaned.modifiedCount > 0) {
    console.log(`[ProjectService] Cleaned up ${orphaned.modifiedCount} orphaned projects.`);
  }

  const refining = await ProjectModel.find({ status: "refining" });
  for (const project of refining) {
    if (project.generatedProject?.files) {
      try {
        await workspaceFileService.writeGeneratedProject(project._id.toString(), project.generatedProject.files);
      } catch (err) {
        console.error(`[ProjectService] Failed to restore workspace for orphaned refinement ${project._id}`, err);
      }
    }
    project.status = "ready";
    project.pipelineStage = "Ready";
    await project.save();
    console.log(`[ProjectService] Recovered orphaned refinement for project ${project._id}`);
  }
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
  console.log(`[deleteProject] Attempting to delete project ${projectId} for owner ${owner}`);
  const project = await ProjectModel.findOneAndDelete({
    _id: projectId,
    owner,
  });
  console.log(`[deleteProject] findOneAndDelete result:`, !!project);

  if (project) {
    try {
      runtimeManagerService.stopRuntime(projectId);
      
      // Fire and forget workspace deletion to unblock the API response
      workspaceService.deleteWorkspace(projectId).catch(err => {
        console.error(`[Background Cleanup] Failed to delete workspace for project ${projectId}`, err);
      });
    } catch (err) {
      console.error(`Failed to stop runtime for project ${projectId}`, err);
    }
  }

  return project;
}

export async function startGeneration(owner: string, projectId: string) {
  const project = await ProjectModel.findOneAndUpdate(
    {
      _id: projectId,
      owner,
      status: { $in: ["draft", "ready", "failed"] }
    },
    { $set: { status: "generating", pipelineStage: "Initializing Generation..." } },
    { returnDocument: "after" }
  );

  if (!project) {
    const exists = await ProjectModel.exists({ _id: projectId, owner });
    if (!exists) {
      throw new NotFoundError("Project not found");
    }
    throw new ConflictError("Project is already generating or in an active state.");
  }
  return project;
}

export async function generateProject(project: HydratedDocument<Project>) {
  const projectId = project._id.toString();

  let runtimeTime = 0;
  const startOverall = performance.now();

  let saveQueue = Promise.resolve<unknown>(null);
  const safeSave = async () => {
    const currentSave = saveQueue
      .catch(() => {}) // Prevent previous failures from poisoning this execution
      .then(() => project.save());
    
    saveQueue = currentSave;
    return currentSave;
  };

  console.log("\n===================================");
  console.log("Parallel Execution Started");
  // Absolute safety timeout to prevent hanging generations
  const abortController = new AbortController();
  const masterDeadline = setTimeout(() => {
    abortController.abort(new Error("Master pipeline deadline exceeded (8 minutes)"));
  }, 8 * 60 * 1000);

  try {
    const { projectPlan, architecturePlan, generatedProject, metrics } = await pipelineRunContext.run(
      {
        blacklistedModels: new Set<string>(),
        groqExcludedModels: new Set<string>(),
        groqModelCooldowns: new Map<string, number>(),
        abortSignal: abortController.signal
      },
      async () => {
        return aiService.generate({ 
      prompt: project.prompt,
      projectId: projectId,
      onEvent: (event) => {
        // Fire-and-forget DB update for live status tracking
        void (async () => {
          let stage: string | null = null;
          let timestampKey: string | null = null;

          switch (event.type) {
            case "planner_started":
              stage = "Planning...";
              timestampKey = "planningStartedAt";
              break;
            case "architect_started":
              stage = "Designing Architecture...";
              timestampKey = "architectStartedAt";
              break;
            case "generator_started":
              stage = "Generating Files...";
              timestampKey = "generationStartedAt";
              break;
            case "install_started":
              stage = "Installing Dependencies...";
              break;
            case "build_started":
              stage = "Building Application...";
              break;
            case "preview_started":
              stage = "Starting Preview...";
              timestampKey = "previewStartedAt";
              break;
            case "verify_started":
              stage = "Verifying Preview...";
              break;
            case "repair_started":
              project.status = "generating"; // In case it was previously ready/failed? Wait, it's always generating.
              stage = "Repairing...";
              break;
          }

          if (stage) {
            project.pipelineStage = stage;
            
            if (timestampKey) {
              if (!project.pipelineTimestamps) project.pipelineTimestamps = {};
              project.pipelineTimestamps[timestampKey] = new Date();
              project.markModified('pipelineTimestamps');
            }
            await safeSave();
          }
        })().catch(err => console.error("[Pipeline DB Error]", err));
        
        if (event.type === "architect_completed" && event.state.architecture) {
          console.log("\n-----------------------------------");
          console.log("Runtime Branch Started");
          console.log("-----------------------------------");
          
          const startRuntime = performance.now();
          runtimeTime = performance.now() - startRuntime;
        }
      }
    });
  });

    const aiTime = performance.now() - startOverall;

    console.log("\n-----------------------------------");
    console.log("Generation Complete");
    console.log("-----------------------------------");

    console.log("\n[Pipeline] Synchronizing Runtime Workspace");

    const startSync = performance.now();

    try {
      const allFiles = await workspaceFileService.collectAllFiles(projectId);
      if (allFiles.length > 0) {
        generatedProject.files = allFiles;
      }
    } catch (err) {
      console.error("[Pipeline] Failed to collect final workspace files", err);
    }

    project.aiPlan = projectPlan;
    project.architecturePlan = architecturePlan;
    project.generatedProject = generatedProject;
    
    project.files = generatedProject.files.map(f => f.path);
    project.framework = generatedProject.project.framework as import("./project.model.js").ProjectFramework;
    project.status = "ready";
    project.pipelineStage = "Ready";
    if (!project.pipelineTimestamps) project.pipelineTimestamps = {};
    project.pipelineTimestamps["completedAt"] = new Date();
    project.markModified('pipelineTimestamps');

    await safeSave();
    
    const syncTime = performance.now() - startSync;

    // The GateRunnerNode will exclusively handle starting the preview and populating runtimeState.
    const runtimeState = runtimeManagerService.getRuntimeState(projectId);
    if (runtimeState?.preview) {
      console.log("[Runtime] Preview Started");
    } else {
      console.log("[Runtime] Preview Failed to Start");
    }

    const totalTime = performance.now() - startOverall;
    
    // Telemetry Calculations
    const aiFiles = generatedProject.files.filter(f => !f.path.includes('node_modules') && f.content && f.content.length > 0);
    const aiFileCount = aiFiles.length;
     
    const largestFile = aiFiles.reduce((max, f) => f.content!.length > (max.content?.length || 0) ? f : max, {} as any);
    const avgFileSize = aiFiles.reduce((sum, f) => sum + f.content!.length, 0) / (aiFileCount || 1);
    const requestedFeatures = projectPlan.features.length;
    const implementedWorkflows = projectPlan.pages.length;
    const deferredWorkflows = projectPlan.deferredWorkflows?.length || 0;

    console.log("\n===================================");
    console.log("Telemetry & Benchmarks");
    console.log("===================================");
    console.log(`Architecture Complexity: ${projectPlan.complexity}`);
    console.log(`Requested features: ${requestedFeatures}`);
    console.log(`Implemented workflows: ${implementedWorkflows}`);
    console.log(`Deferred workflows: ${deferredWorkflows}`);
    console.log(`AI file count: ${aiFileCount}`);
    console.log(`Average file size: ${(avgFileSize / 1024).toFixed(1)} KB`);
    console.log(`Largest generated file: ${largestFile.path} (${((largestFile.content?.length || 0) / 1024).toFixed(1)} KB)`);
    type PipelineMetrics = {
      architectRetries?: number;
    };
    const typedMetrics = metrics as PipelineMetrics;
    console.log(`Architecture retries: ${typedMetrics?.architectRetries || 0}`);
    console.log("\n===================================");
    console.log(`AI Branch: ${aiTime.toFixed(0)}ms`);
    console.log(`Runtime Prep: ${runtimeTime.toFixed(0)}ms`);
    console.log(`Synchronization & Install: ${syncTime.toFixed(0)}ms`);
    console.log(`Total Pipeline: ${totalTime.toFixed(0)}ms`);
    console.log("===================================\n");

    return project;
  } catch (error) {
    project.status = "failed";
    project.pipelineStage = "Failed";
    await safeSave();
    
    // AI Failure / Runtime Failure Cleanup
    try {
      runtimeManagerService.stopRuntime(projectId);
      await workspaceService.deleteWorkspace(projectId);
    } catch (cleanupErr) {
      console.error(`[Pipeline] Failed to clean up workspace after error:`, cleanupErr);
    }

    throw error;
  } finally {
    clearTimeout(masterDeadline);
  }
}

export async function startRefinement(owner: string, projectId: string) {
  const existing = await ProjectModel.findOne({ owner, _id: projectId });
  if (existing && existing.status === "pending_changes") {
    throw new Error("Cannot start refinement while there are pending changes. Apply or undo them first.");
  }
  const project = await ProjectModel.findOneAndUpdate(
    { owner, _id: projectId, status: { $in: ["ready", "failed"] } },
    { $set: { status: "refining", pipelineStage: "Initializing Refinement..." } },
    { returnDocument: "after" }
  );
  
  if (!project) {
    throw new Error("Project not found, or is not in a safe state to be refined (must be ready or failed)");
  }
  
  return project;
}

export async function refineProject(project: HydratedDocument<Project>, prompt: string) {
  const projectId = project._id.toString();

  const rollbackFiles = JSON.parse(JSON.stringify(project.generatedProject?.files || []));

  try {
    await aiService.refine({
      project,
      prompt,
      onEvent: (event) => {
        // Fire-and-forget DB update for live status tracking (optional for refinement)
        void (async () => {
          let stage: string | null = null;
          switch (event.type) {
            case "planner_started": stage = "Analyzing request..."; break;
            case "generator_started": stage = "Modifying files..."; break;
            case "build_started": stage = "Building..."; break;
            case "repair_started": stage = "Repairing..."; break;
            case "verify_started": stage = "Verifying preview..."; break;
          }
          if (stage) {
            await ProjectModel.updateOne({ _id: projectId }, { $set: { pipelineStage: stage } });
          }
        })().catch(() => {});
      }
    });

    project.status = "pending_changes";
    project.pipelineStage = "Pending Changes";
    
    // 3. One safeSave
    await project.save();
    return project;

  } catch (error) {
    console.error(`[Refinement] Failed for project ${projectId}. Rolling back.`, error);
    
    // Automatic Rollback
    project.status = "failed";
    project.pipelineStage = "Failed";

    try {
      await workspaceFileService.writeGeneratedProject(projectId, rollbackFiles);
    } catch (rollbackErr) {
      console.error(`[Refinement Rollback] Failed to restore workspace`, rollbackErr);
    }

    await project.save();
    throw error;
  }
}

export async function applyProject(owner: string, projectId: string) {
  const project = await ProjectModel.findOne({ owner, _id: projectId });
  if (!project) throw new NotFoundError("Project not found");
  if (project.status !== "pending_changes") {
    throw new Error("Cannot apply changes unless project is in pending_changes state");
  }
  if (!project.pendingProject) {
    throw new Error("No pending project found to apply");
  }

  // 1. Snapshot the current canonical state for Undo
  const rollbackFiles = JSON.parse(JSON.stringify(project.generatedProject?.files || []));
  const snapshot = {
    refinementId: crypto.randomUUID(),
    prompt: project.prompt,
    createdAt: new Date(),
    files: rollbackFiles
  };
  project.history = [snapshot];
  project.markModified('history');

  // 2. Commit pending to generated
  project.generatedProject = project.pendingProject;
  project.markModified('generatedProject');
  if (project.generatedProject?.files) {
    project.files = project.generatedProject.files.map((f: { path: string }) => f.path);
  }

  // 3. Clear pending state
  project.pendingProject = null;
  project.status = "ready";
  project.pipelineStage = "Ready";

  await project.save();
  return project;
}

export async function undoProject(owner: string, projectId: string) {
  const project = await ProjectModel.findOne({ owner, _id: projectId });
  if (!project) throw new NotFoundError("Project not found");

  if (project.status === "pending_changes") {
    // Mode A: Discard pending changes (Undo refinement before applying)
    if (project.generatedProject && project.generatedProject.files) {
      await workspaceFileService.writeGeneratedProject(projectId, project.generatedProject.files);
    }
    project.pendingProject = null;
    project.status = "ready";
    project.pipelineStage = "Ready";
    
    try {
      const runtimeState = runtimeManagerService.getRuntimeState(projectId);
      if (runtimeState?.preview) {
         const devCmd = project.generatedProject?.commands?.dev ?? "npm run dev";
         await runtimeManagerService.startPreviewOnly(projectId, devCmd);
      }
    } catch (err) {
      console.error("[Undo] Failed to restart preview", err);
    }
    await project.save();
    return project;
  }

  if (project.status !== "ready") {
    throw new Error("Cannot undo while project is refining or not ready");
  }
  if (!project.history || project.history.length === 0) {
    throw new Error("No history to undo");
  }

  // Pop the last snapshot
  const lastSnapshot = project.history.pop();
  project.markModified('history');
  
  if (lastSnapshot && lastSnapshot.files) {
    await workspaceFileService.writeGeneratedProject(projectId, lastSnapshot.files);
    
    if (project.generatedProject) {
      project.generatedProject.files = lastSnapshot.files;
      project.files = lastSnapshot.files.map((f: { path: string }) => f.path);
      project.markModified('generatedProject');
    }

    try {
      const runtimeState = runtimeManagerService.getRuntimeState(projectId);
      if (runtimeState?.preview) {
         // Stop and start the preview to ensure it picks up the rolled-back files
         const devCmd = project.generatedProject?.commands?.dev ?? "npm run dev";
         await runtimeManagerService.startPreviewOnly(projectId, devCmd);
      }
    } catch (err) {
      console.error("[Undo] Failed to restart preview", err);
    }
  }

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
      returnDocument: "after",
      runValidators: true,
    },
  );
}