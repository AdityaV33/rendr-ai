import type {
  Request,
  Response,
} from "express";

import * as runtimeManagerService from "./runtime-manager.service.js";
import * as workspaceFileService from "./workspace-file.service.js";
import * as projectService from "../projects/project.service.js";

export async function startRuntime(
  req: Request,
  res: Response,
) {
  const projectId = req.params
    .projectId as string;

  const runtime =
    await runtimeManagerService.startRuntime(
      req.user.id,
      projectId,
    );

  return res.status(200).json(runtime);
}

export async function stopRuntime(
  req: Request,
  res: Response,
) {
  const projectId = req.params
    .projectId as string;

  runtimeManagerService.stopRuntime(
    projectId,
  );

  return res.status(200).json({
    message:
      "Runtime stopped successfully.",
  });
}

export async function getWorkspaceTree(
  req: Request,
  res: Response,
) {
  const projectId = req.params
    .projectId as string;

  const files =
    await workspaceFileService.getWorkspaceTree(
      projectId,
    );

  return res.status(200).json(files);
}

export async function getWorkspaceFile(
  req: Request,
  res: Response,
) {
  const projectId = req.params
    .projectId as string;

  const filePath = req.query
    .path as string;

  const content =
    await workspaceFileService.getWorkspaceFile(
      projectId,
      filePath,
    );

  return res.status(200).json({
    path: filePath,
    content,
  });
}

export async function updateWorkspaceFile(
  req: Request,
  res: Response,
) {
  const projectId = req.params
    .projectId as string;

  const {
    path: filePath,
    content,
  } = req.body;

  if (
    !filePath ||
    typeof filePath !== "string" ||
    typeof content !== "string"
  ) {
    return res.status(400).json({
      message:
        "path and content are required.",
    });
  }

  console.log(`\n[Runtime] Received file update: ${filePath}`);


  // Validate project ownership
  const project = await projectService.requireProject(
    req.user.id,
    projectId,
  );

  // Update physical workspace file
  await workspaceFileService.updateWorkspaceFile(
    projectId,
    filePath,
    content,
  );

  const diskContent = await workspaceFileService.getWorkspaceFile(projectId, filePath);
  if (diskContent !== content) {
    console.error(`[Runtime Error] Workspace file on disk DOES NOT match expected content!`);
  }

  // Sync to database
  if (project.generatedProject) {
    const normalizedFilePath = filePath.replace(/\\/g, "/");
    const fileIndex = project.generatedProject.files.findIndex(
      f => f.path.replace(/\\/g, "/") === normalizedFilePath
    );
    if (fileIndex >= 0) {
      project.generatedProject.files[fileIndex].content = content;
      project.markModified("generatedProject");
      await project.save();
      console.log(`[Runtime] Workspace file updated and persisted: ${normalizedFilePath}`);
    } else {
      console.log(`[Runtime] Workspace file updated: ${normalizedFilePath} (Template file)`);
    }
  }

  return res.status(200).json({
    message:
      "File saved successfully.",
  });
}

export async function getRuntimeStatus(
  req: Request,
  res: Response,
) {
  const projectId = req.params
    .projectId as string;

  const runtime =
    runtimeManagerService.getRuntimeState(
      projectId,
    );

  return res.status(200).json(runtime || null);
}