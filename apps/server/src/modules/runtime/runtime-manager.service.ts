import * as projectService from "../projects/project.service.js";
import * as runtimeService from "./runtime.service.js";
import * as templateService from "./template.service.js";
import * as workspaceService from "./workspace.service.js";

import type { RuntimeState } from "./runtime.types.js";

export async function startRuntime(
  owner: string,
  projectId: string,
): Promise<RuntimeState> {
  await projectService.requireProject(
    owner,
    projectId,
  );

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
  }

  await templateService.copyTemplate(
    projectId,
  );

  if (
    runtimeService.hasRuntime(projectId)
  ) {
    return runtimeService.getRuntimeState(
      projectId,
    )!;
  }

  return runtimeService.initializeRuntime(
    projectId,
  );
}