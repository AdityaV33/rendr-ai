import { z } from "zod";

export const projectPlanSchema = z.object({
  applicationType: z.string(),
  framework: z.string(),
  theme: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
  }).optional(),
  pages: z.array(
    z.object({
      route: z.string(),
      name: z.string(),
      description: z.string(),
    })
  ),
  layouts: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    })
  ).optional(),
  components: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    })
  ),
  dependencies: z.record(z.string(), z.string()), // package name -> version
  projectStructure: z.array(z.string()), // list of intended file paths
  routing: z.object({
    type: z.string(),
    routes: z.array(
      z.object({
        path: z.string(),
        component: z.string(),
      })
    ),
  }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
