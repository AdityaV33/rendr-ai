import { z } from "zod";

export const generatedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});
