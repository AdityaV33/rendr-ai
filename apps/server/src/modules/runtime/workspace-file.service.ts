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

  await filesystemService.createDirectory(path.dirname(resolved));

  await filesystemService.writeFile(
    resolved,
    content,
  );
}

async function writeProjectFiles(
  workspacePath: string,
  generatedFiles: { path: string; content: string }[],
): Promise<void> {
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
    
    let isChanged = true;
    try {
      const existingContent = await filesystemService.readFile(resolved);
      if (existingContent === file.content) {
        isChanged = false;
      }
    } catch (e) {
      // File doesn't exist yet
    }

    if (isChanged) {
      await filesystemService.writeFile(resolved, file.content);
    }
  }

  const deletedFiles: string[] = [];

  for (const tPath of templateFilePaths) {
    if (!generatedFilePaths.has(tPath)) {
      if (tPath.startsWith("src/") || tPath.startsWith("tests/") || tPath === "playwright.config.ts") {
        const resolved = resolveWorkspaceFilePath(workspacePath, tPath);
        await filesystemService.removeFile(resolved);
        deletedFiles.push(tPath);
      } else {
        preservedFiles.push(tPath);
      }
    }
  }

  console.log(`[Runtime] Workspace Synchronized: ${generatedFiles.length} generated, ${overwrittenFiles.length} overwritten, ${preservedFiles.length} preserved`);
  
  if (deletedFiles.length > 0) {
    console.log(`[Runtime] Cleanup: Deleted ${deletedFiles.length} stale generated files`);
    deletedFiles.forEach(f => console.log(`  - ${f}`));
  }
}

export async function writeGeneratedProject(
  projectId: string,
  generatedFiles: { path: string; content: string }[],
): Promise<void> {
  const workspacePath = workspaceService.getWorkspacePath(projectId);
  await writeProjectFiles(workspacePath, generatedFiles);
}

export async function writeValidationProject(
  projectId: string,
  generatedFiles: { path: string; content: string }[],
): Promise<void> {
  const workspacePath = workspaceService.getValidationWorkspacePath(projectId);
  await writeProjectFiles(workspacePath, generatedFiles);
}