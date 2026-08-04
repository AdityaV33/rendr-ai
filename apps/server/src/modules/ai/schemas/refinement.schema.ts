import { z } from "zod";
import { projectPlanSchema } from "./project-plan.schema.js";
import { generatedFileSchema } from "./generated-file.schema.js";

export const refinementRequestSchema = z.object({
  existingContext: z.record(z.string(), z.unknown()).optional(),
  projectPlan: projectPlanSchema,
  refinementPrompt: z.string(),
});

export const refinementResultSchema = z.object({
  createdFiles: z.array(generatedFileSchema),
  modifiedFiles: z.array(generatedFileSchema),
  deletedFiles: z.array(z.string()), // Array of file paths
});
