import path from "node:path";

import {
  WORKSPACES_ROOT,
} from "./runtime.constants.js";

import * as filesystemService from "./filesystem.service.js";

export function getWorkspacePath(
  projectId: string,
): string {
  return path.join(
    process.cwd(),
    WORKSPACES_ROOT,
    projectId,
  );
}

export async function createWorkspace(
  projectId: string,
): Promise<string> {
  const workspacePath = getWorkspacePath(projectId);

  await filesystemService.createDirectory(
    workspacePath,
  );

  return workspacePath;
}

export async function deleteWorkspace(
  projectId: string,
): Promise<void> {
  const workspacePath = getWorkspacePath(
    projectId,
  );

  await filesystemService.removeDirectory(
    workspacePath,
  );
}

export async function workspaceExists(
  projectId: string,
): Promise<boolean> {
  const workspacePath = getWorkspacePath(
    projectId,
  );

  return filesystemService.pathExists(
    workspacePath,
  );
}

export function getValidationWorkspacePath(
  projectId: string,
): string {
  return path.join(
    process.cwd(),
    WORKSPACES_ROOT,
    `${projectId}-validation`,
  );
}

export async function createValidationWorkspace(
  projectId: string,
): Promise<string> {
  const workspacePath = getValidationWorkspacePath(projectId);
  await filesystemService.createDirectory(workspacePath);
  return workspacePath;
}

export async function deleteValidationWorkspace(
  projectId: string,
): Promise<void> {
  const workspacePath = getValidationWorkspacePath(projectId);
  await filesystemService.removeDirectory(workspacePath);
}

export async function validationWorkspaceExists(
  projectId: string,
): Promise<boolean> {
  const workspacePath = getValidationWorkspacePath(projectId);
  return filesystemService.pathExists(workspacePath);
}