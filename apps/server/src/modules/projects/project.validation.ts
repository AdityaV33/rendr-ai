import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must not exceed 100 characters"),

  prompt: z
    .string()
    .trim()
    .min(1, "Project prompt is required")
    .max(5000, "Project prompt must not exceed 5000 characters"),
});

export type CreateProjectInput = z.infer<
  typeof createProjectSchema
>;

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Project name must not be empty")
      .max(100, "Project name must not exceed 100 characters")
      .optional(),

    prompt: z
      .string()
      .trim()
      .min(1, "Project prompt must not be empty")
      .max(5000, "Project prompt must not exceed 5000 characters")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update"
  );

export type UpdateProjectInput = z.infer<
  typeof updateProjectSchema
>;