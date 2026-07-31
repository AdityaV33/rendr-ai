import { z } from "zod";
import { architecturePlanSchema } from "../schemas/architecture-plan.schema.js";

export type ArchitecturePlan = z.infer<typeof architecturePlanSchema>;
