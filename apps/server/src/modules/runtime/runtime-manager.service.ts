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

export { installDependencies } from "./install.service.js";

export async function prepareWorkspace(
  projectId: string,
  framework: string,
): Promise<void> {
  console.log(`[Runtime] Framework: ${framework}`);

  let workspaceCreated = false;

  if (!(await workspaceService.workspaceExists(projectId))) {
    await workspaceService.createWorkspace(projectId);
    console.log("[Runtime] Workspace Created");
    workspaceCreated = true;
  }

  if (workspaceCreated) {
    await templateService.copyTemplate(projectId, framework);
    console.log("[Runtime] Template Synchronized");
  }

  if (!runtimeService.hasRuntime(projectId)) {
    runtimeService.initializeRuntime(projectId);
  }
}

export async function startPreviewOnly(
  projectId: string,
  devCommand: string
): Promise<RuntimeState> {
  try {
    const tStart = performance.now();
    runtimeService.updateRuntimeStatus(projectId, RuntimeStatus.STARTING);
    console.log("[Runtime] Preview Starting");

    const existingRuntime = runtimeService.getRuntimeState(projectId);
    if (existingRuntime?.preview) {
      console.log("[Runtime] Stopping existing preview before starting new one");
      stopPreview(existingRuntime.preview);
    }

    const preview = await startPreview(
      projectId,
      devCommand,
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

    runtimeService.updateRuntime(projectId, { preview });
    runtimeService.updateRuntimeStatus(projectId, RuntimeStatus.READY);
    console.log("[Runtime] Preview Ready");

    return runtimeService.getRuntimeState(projectId)!;
  } catch (error) {
    runtimeService.removeRuntime(projectId);
    throw error;
  }
}

export async function startRuntime(
  owner: string,
  projectId: string,
): Promise<RuntimeState> {
  const project = await projectService.requireProject(owner, projectId);

  if (!project.framework) {
    throw new InternalServerError("Project framework has not been determined.");
  }

  await prepareWorkspace(projectId, project.framework);

  if (project.generatedProject?.files) {
    await workspaceFileService.writeGeneratedProject(
      projectId,
      project.generatedProject.files,
    );
  }
  
  try {
    const installCommand = project.generatedProject?.commands.install ?? "npm install";
    const tStart = performance.now();
    runtimeService.updateRuntimeStatus(projectId, RuntimeStatus.INSTALLING);
    console.log("[Runtime] Installing Dependencies");

    const installResult = await installDependencies(projectId, installCommand);

    console.log(`[Runtime] Dependencies Installed (${(performance.now() - tStart).toFixed(0)}ms)`);

    if (!installResult.success) {
      throw new InternalServerError(
        `Failed to install project dependencies.\n\nExit Code: ${installResult.exitCode}\n\nSTDOUT:\n${installResult.stdout}\n\nSTDERR:\n${installResult.stderr}`
      );
    }
  } catch (error) {
    runtimeService.removeRuntime(projectId);
    throw error;
  }

  return startPreviewOnly(projectId, project.generatedProject?.commands.dev ?? "npm run dev");
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