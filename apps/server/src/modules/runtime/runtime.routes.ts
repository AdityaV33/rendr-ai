import { Router } from "express";

import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/auth.middleware.js";

import * as runtimeController from "./runtime.controller.js";

const router = Router();

router.post(
  "/:projectId/start",
  requireAuth,
  asyncHandler(
    runtimeController.startRuntime,
  ),
);

router.post(
  "/:projectId/stop",
  requireAuth,
  asyncHandler(
    runtimeController.stopRuntime,
  ),
);

router.get(
  "/:projectId/status",
  requireAuth,
  asyncHandler(
    runtimeController.getRuntimeStatus,
  ),
);

router.get(
  "/:projectId/files",
  requireAuth,
  asyncHandler(
    runtimeController.getWorkspaceTree,
  ),
);

router.get(
  "/:projectId/file",
  requireAuth,
  asyncHandler(
    runtimeController.getWorkspaceFile,
  ),
);

router.put(
  "/:projectId/file",
  requireAuth,
  asyncHandler(
    runtimeController.updateWorkspaceFile,
  ),
);

export default router;