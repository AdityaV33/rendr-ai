import * as projectService from "../projects/project.service.js";
import { InternalServerError } from "../lib/http-error.js";

import * as runtimeService from "./runtime.service.js";
import * as templateService from "./template.service.js";
import * as workspaceService from "./workspace.service.js";
import * as workspaceFileService from "./workspace-file.service.js";

import { installDependencies } from "./install.service.js";

import {
  startPreview,
  stopPreview,
} from "./preview.service.js";

import {
  RuntimeStatus,
  type RuntimeState,
} from "./runtime.types.js";

export async function startRuntime(
  owner: string,
  projectId: string,
): Promise<RuntimeState> {
  const project =
    await projectService.requireProject(
      owner,
      projectId,
    );

  if (!project.framework) {
    throw new InternalServerError(
      "Project framework has not been determined.",
    );
  }

  console.log(`[Runtime] Framework: ${project.framework}`);

  let workspaceCreated = false;

  if (
    !(
      await workspaceService.workspaceExists(
        projectId,
      )
    )
  ) {
    await workspaceService.createWorkspace(
      projectId,
    );
    console.log("[Runtime] Workspace Created");

    workspaceCreated = true;
  }

  if (workspaceCreated) {
    await templateService.copyTemplate(
      projectId,
      project.framework,
    );
    console.log("[Runtime] Template Synchronized");
  }

  // Always write the latest AI generated files to the workspace, 
  // even if the workspace already existed from a previous run or failed build.
  if (project.generatedProject?.files) {
    await workspaceFileService.writeGeneratedProject(
      projectId,
      project.generatedProject.files,
    );
  }

  if (
    runtimeService.hasRuntime(projectId)
  ) {
    return runtimeService.getRuntimeState(
      projectId,
    )!;
  }

  const runtime =
    runtimeService.initializeRuntime(
      projectId,
    );

  try {
    let tStart = performance.now();
    runtimeService.updateRuntimeStatus(
      projectId,
      RuntimeStatus.INSTALLING,
    );
    console.log("[Runtime] Installing Dependencies");

    const installResult =
      await installDependencies(
        projectId,
        project.generatedProject!.commands.install,
      );

    console.log(`[Runtime] Dependencies Installed (${(performance.now() - tStart).toFixed(0)}ms)`);

    if (!installResult.success) {
      throw new InternalServerError(
        `Failed to install project dependencies.\n\nExit Code: ${installResult.exitCode}\n\nSTDOUT:\n${installResult.stdout}\n\nSTDERR:\n${installResult.stderr}`
      );
    }

    // Skipping build phase for faster preview startup
    // Project compilation will be handled lazily by Vite HMR

    tStart = performance.now();
    runtimeService.updateRuntimeStatus(
      projectId,
      RuntimeStatus.STARTING,
    );
    console.log("[Runtime] Preview Starting");

    const preview = await startPreview(
      projectId,
      project.generatedProject?.commands.dev ?? "npm run dev",
      (code, port) => {
        const current = runtimeService.getRuntimeState(projectId);
        if (current && current.preview && current.preview.port === port) {
          runtimeService.updateRuntime(projectId, { 
            status: RuntimeStatus.STOPPED,
            preview: undefined 
          });
        }
      }
    );

    console.log(`[Runtime] Preview Ready (${(performance.now() - tStart).toFixed(0)}ms)`);

    runtimeService.updateRuntime(
      projectId,
      {
        preview,
      },
    );

    runtimeService.updateRuntimeStatus(
      projectId,
      RuntimeStatus.READY,
    );
    console.log("[Runtime] Preview Ready");

    // Persist project status as ready in the database
    await projectService.updateProjectStatus(
      projectId,
      "ready",
    );

    return (
      runtimeService.getRuntimeState(
        projectId,
      ) ?? runtime
    );
  } catch (error) {
    runtimeService.removeRuntime(
      projectId,
    );

    throw error;
  }
}

export function stopRuntime(
  projectId: string,
): void {
  const runtime =
    runtimeService.getRuntimeState(
      projectId,
    );

  if (!runtime) {
    return;
  }

  if (runtime.preview) {
    stopPreview(runtime.preview);
  }

  runtimeService.updateRuntimeStatus(
    projectId,
    RuntimeStatus.STOPPED,
  );

  runtimeService.removeRuntime(
    projectId,
  );
}

export function getRuntimeState(projectId: string) {
  return runtimeService.getRuntimeState(projectId);
}