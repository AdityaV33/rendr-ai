import { z } from "zod";

export const runtimeParamsSchema = z.object({
  projectId: z
    .string()
    .trim()
    .min(
      1,
      "Project ID is required.",
    ),
});

export type RuntimeParams = z.infer<
  typeof runtimeParamsSchema
>;