import * as projectService from "../projects/project.service.js";
import { InternalServerError } from "../lib/http-error.js";

import * as runtimeService from "./runtime.service.js";
import * as templateService from "./template.service.js";
import * as workspaceService from "./workspace.service.js";

import { installDependencies } from "./install.service.js";
import { buildProject } from "./build.service.js";
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

    workspaceCreated = true;
  }

  if (workspaceCreated) {
    await templateService.copyTemplate(
      projectId,
      project.framework,
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
    runtimeService.updateRuntimeStatus(
      projectId,
      RuntimeStatus.INSTALLING,
    );

    const installResult =
      await installDependencies(
        projectId,
      );

    if (!installResult.success) {
      throw new InternalServerError(
        "Failed to install project dependencies.",
      );
    }

    runtimeService.updateRuntimeStatus(
      projectId,
      RuntimeStatus.BUILDING,
    );

    const buildResult =
      await buildProject(projectId);

    runtimeService.updateRuntime(
      projectId,
      {
        build: {
          success:
            buildResult.success,
          logs:
            buildResult.stdout
              ? buildResult.stdout.split(
                  "\n",
                )
              : [],
          errors:
            buildResult.stderr
              ? buildResult.stderr.split(
                  "\n",
                )
              : [],
        },
      },
    );

    if (!buildResult.success) {
      throw new InternalServerError(
        "Project build failed.",
      );
    }

    runtimeService.updateRuntimeStatus(
      projectId,
      RuntimeStatus.STARTING,
    );

    const preview =
      await startPreview(projectId);

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