import type {
  Request,
  Response,
} from "express";

import * as runtimeManagerService from "./runtime-manager.service.js";

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

  return res.status(200).json(
    runtime,
  );
}