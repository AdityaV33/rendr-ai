import type {
  Request,
  Response,
} from "express";

import * as runtimeManagerService from "./runtime-manager.service.js";
import * as workspaceFileService from "./workspace-file.service.js";

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

  await workspaceFileService.updateWorkspaceFile(
    projectId,
    filePath,
    content,
  );

  return res.status(200).json({
    message:
      "File updated successfully.",
  });
}