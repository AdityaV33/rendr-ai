import { z } from "zod";
import { validationResultSchema } from "../schemas/validation.schema.js";

export type ValidationResult = z.infer<typeof validationResultSchema>;
