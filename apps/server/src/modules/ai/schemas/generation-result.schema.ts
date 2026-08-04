import { z } from "zod";
import { workspaceManifestSchema } from "./workspace-manifest.schema.js";
import { projectPlanSchema } from "./project-plan.schema.js";

export const generationResultSchema = z.object({
  success: z.boolean(),
  projectPlan: projectPlanSchema.optional(),
  workspace: workspaceManifestSchema.optional(),
  error: z.string().optional(),
});
