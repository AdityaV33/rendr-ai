import { z } from "zod";
import { generatedProjectSchema } from "../schemas/generated-project.schema.js";

/**
 * Type definition for GeneratedProject derived directly from the Zod schema.
 */
export type GeneratedProject = z.infer<typeof generatedProjectSchema>;
