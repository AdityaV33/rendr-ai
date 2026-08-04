import { z } from "zod";
import { generatedFileSchema } from "../schemas/generated-file.schema.js";

export type GeneratedFile = z.infer<typeof generatedFileSchema>;
