import { ProjectModel } from "./project.model.js";
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

export async function cleanupOrphanedProjects() {
  const orphaned = await ProjectModel.updateMany(
    { status: { $in: ["generating", "building", "repairing"] } },
    { $set: { status: "failed", pipelineStage: "Failed (Server Restarted)" } }
  );
  if (orphaned.modifiedCount > 0) {
    console.log(`[ProjectService] Cleaned up ${orphaned.modifiedCount} orphaned projects.`);
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

  let runtimeTime = 0;
  const startOverall = performance.now();

  let saveQueue = Promise.resolve<any>(null);
  const safeSave = async () => {
    const currentSave = saveQueue
      .catch(() => {}) // Prevent previous failures from poisoning this execution
      .then(() => project.save());
    
    saveQueue = currentSave;
    return currentSave;
  };

  console.log("\n===================================");
  console.log("Parallel Execution Started");
  console.log("===================================");

  try {
    const { projectPlan, architecturePlan, generatedProject, metrics } = await aiService.generate({ 
      prompt: project.prompt,
      projectId: projectId,
      onEvent: (event) => {
        // Fire-and-forget DB update for live status tracking
        const updatePromise = (async () => {
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

    const aiTime = performance.now() - startOverall;

    console.log("\n-----------------------------------");
    console.log("Generation Complete");
    console.log("-----------------------------------");

    console.log("\n[Pipeline] Synchronizing Runtime Workspace");

    const startSync = performance.now();

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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