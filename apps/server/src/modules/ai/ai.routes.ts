import { Router } from "express";
import { generate, refine } from "./ai.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

router.post("/generate", asyncHandler(generate));
router.post("/refine", asyncHandler(refine));

export default router;
