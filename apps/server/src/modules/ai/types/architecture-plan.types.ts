import { z } from "zod";
import { architecturePlanSchema } from "../schemas/architecture-plan.schema.js";

/**
 * Type definition for ArchitecturePlan derived directly from the Zod schema.
 */
export type ArchitecturePlan = z.infer<typeof architecturePlanSchema>;
