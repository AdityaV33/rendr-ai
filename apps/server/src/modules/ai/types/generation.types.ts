import { z } from "zod";
import { generationResultSchema } from "../schemas/generation-result.schema.js";

export type GenerationResult = z.infer<typeof generationResultSchema>;
