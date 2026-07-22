import { Router } from "express";

import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import * as projectController from "./project.controller.js";

import {
  createProjectSchema,
  updateProjectSchema,
} from "./project.validation.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(createProjectSchema),
  asyncHandler(projectController.createProject),
);

router.get(
  "/",
  requireAuth,
  asyncHandler(projectController.getProjects),
);

router.get(
  "/:projectId",
  requireAuth,
  asyncHandler(projectController.getProjectById),
);

router.patch(
  "/:projectId",
  requireAuth,
  validate(updateProjectSchema),
  asyncHandler(projectController.updateProject),
);
router.post(
  "/:projectId/generate",
  requireAuth,
  asyncHandler(projectController.generateProjectController),
);

router.delete(
  "/:projectId",
  requireAuth,
  asyncHandler(projectController.deleteProject),
);


export default router;