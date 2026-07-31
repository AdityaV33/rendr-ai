import { z } from "zod";
import { workspaceManifestSchema } from "../schemas/workspace-manifest.schema.js";

export type WorkspaceManifest = z.infer<typeof workspaceManifestSchema>;
