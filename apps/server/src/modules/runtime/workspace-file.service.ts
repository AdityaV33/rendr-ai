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

export async function writeGeneratedProject(
  projectId: string,
  generatedFiles: { path: string; content: string }[],
): Promise<void> {
  const workspacePath = workspaceService.getWorkspacePath(projectId);

  const allNodes = await filesystemService.listDirectory(workspacePath, workspacePath);
  const templateFilePaths = new Set<string>();

  const normalizePath = (p: string) => p.replace(/\\/g, "/");

  const collectPaths = (nodes: filesystemService.WorkspaceFileNode[]) => {
    for (const node of nodes) {
      if (node.type === "file") {
        templateFilePaths.add(normalizePath(node.path));
      } else if (node.children) {
        collectPaths(node.children);
      }
    }
  };
  collectPaths(allNodes);

  const overwrittenFiles: string[] = [];
  const generatedFilePaths = new Set(generatedFiles.map(f => normalizePath(f.path)));
  const preservedFiles: string[] = [];

  for (const file of generatedFiles) {
    const resolved = resolveWorkspaceFilePath(workspacePath, file.path);
    const normalized = normalizePath(file.path);
    
    if (templateFilePaths.has(normalized)) {
      overwrittenFiles.push(file.path);
    }

    const dir = path.dirname(resolved);
    await filesystemService.createDirectory(dir);
    await filesystemService.writeFile(resolved, file.content);
  }

  for (const tPath of templateFilePaths) {
    if (!generatedFilePaths.has(tPath)) {
      preservedFiles.push(tPath);
    }
  }

  console.log(`[Runtime] Workspace Synchronized: ${generatedFiles.length} generated, ${overwrittenFiles.length} overwritten, ${preservedFiles.length} preserved`);
}