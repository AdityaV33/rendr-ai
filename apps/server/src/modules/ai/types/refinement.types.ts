import { z } from "zod";
import { refinementRequestSchema, refinementResultSchema } from "../schemas/refinement.schema.js";

export type RefinementRequest = z.infer<typeof refinementRequestSchema>;
export type RefinementResult = z.infer<typeof refinementResultSchema>;
