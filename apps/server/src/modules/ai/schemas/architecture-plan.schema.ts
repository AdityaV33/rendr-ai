import { z } from "zod";

export const architecturePlanSchema = z.object({
  patterns: z.array(z.string()), // e.g., "MVC", "Repository", "CQRS"
  stateManagement: z.string().optional(),
  dataFetching: z.string().optional(),
  styling: z.string().optional(),
  apiDesign: z.string().optional(),
  testingStrategy: z.string().optional(),
});
