import { z } from "zod";
import { projectPlanSchema } from "../schemas/project-plan.schema.js";

export type ProjectPlan = z.infer<typeof projectPlanSchema>;
