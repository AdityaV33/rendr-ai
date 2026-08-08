import { z } from "zod";
import { validationResultSchema, validationIssueSchema } from "../schemas/validation.schema.js";

export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
