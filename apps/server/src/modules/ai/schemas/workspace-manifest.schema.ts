import { z } from "zod";
import { generatedFileSchema } from "./generated-file.schema.js";

export const workspaceManifestSchema = z.object({
  framework: z.string(),
  entryFile: z.string(),
  dependencies: z.record(z.string(), z.string()),
  scripts: z.record(z.string(), z.string()),
  environmentVariables: z.record(z.string(), z.string()).optional(),
  generatedFiles: z.array(generatedFileSchema),
});
