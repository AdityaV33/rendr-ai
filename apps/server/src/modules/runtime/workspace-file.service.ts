import path from "node:path";

import { BadRequestError } from "../lib/http-error.js";
import * as filesystemService from "./filesystem.service.js";
import * as workspaceService from "./workspace.service.js";

/**
 * Resolve a user-provided file path within a workspace,
 * rejecting any path traversal attempts.
 */
function resolveWorkspaceFilePath(
  workspacePath: string,
  filePath: string,
): string {
  const resolved = path.resolve(
    workspacePath,
    filePath,
  );

  if (!resolved.startsWith(workspacePath)) {
    throw new BadRequestError(
      "Invalid file path.",
    );
  }

  return resolved;
}

export async function getWorkspaceTree(
  projectId: string,
) {
  const workspacePath =
    workspaceService.getWorkspacePath(
      projectId,
    );

  return filesystemService.listDirectory(
    workspacePath,
    workspacePath,
  );
}

export async function getWorkspaceFile(
  projectId: string,
  filePath: string,
): Promise<string> {
  const workspacePath =
    workspaceService.getWorkspacePath(
      projectId,
    );

  const resolved =
    resolveWorkspaceFilePath(
      workspacePath,
      filePath,
    );

  return filesystemService.readFile(
    resolved,
  );
}

export async function updateWorkspaceFile(
  projectId: string,
  filePath: string,
  content: string,
): Promise<void> {
  const workspacePath =
    workspaceService.getWorkspacePath(
      projectId,
    );

  const resolved =
    resolveWorkspaceFilePath(
      workspacePath,
      filePath,
    );

  await filesystemService.writeFile(
    resolved,
    content,
  );
}