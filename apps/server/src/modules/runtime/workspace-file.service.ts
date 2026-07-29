import path from "node:path";

import * as filesystemService from "./filesystem.service.js";
import * as workspaceService from "./workspace.service.js";

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

  return filesystemService.readFile(
    path.join(
      workspacePath,
      filePath,
    ),
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

  await filesystemService.writeFile(
    path.join(
      workspacePath,
      filePath,
    ),
    content,
  );
}