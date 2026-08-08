import { z } from "zod";

/**
 * ProjectPlan Schema
 *
 * Represents the output of the Planner — a pure product requirements document.
 * The Planner thinks like a Senior Product Architect. It identifies WHAT
 * the application should be, not HOW it should be built.
 *
 * Implementation decisions (framework, dependencies, folder structure, routing
 * implementation, state management) belong to the Architect service.
 */
export const projectPlanSchema = z.object({
  /** High-level application category (e.g., "SaaS Dashboard", "E-commerce Store") */
  applicationType: z.string(),

  /** Framework selection (Defaults to React) */
  frontendFramework: z.enum(["react-vite", "vanilla-js"]).describe("The framework the application must be built in. ALWAYS use 'react-vite'. // TODO (Vanilla JS Re-enablement): Restore the following instruction: Use 'react-vite' by default, or 'vanilla-js' if the user explicitly requests Vanilla JavaScript."),

  /** One-sentence purpose statement */
  purpose: z.string(),

  /** Who the application is built for */
  targetAudience: z.string(),

  /** Core product features */
  features: z.array(z.string()),

  futureRefinements: z
    .array(z.string())
    .describe(
      "Potential features or improvements that are not required for this MVP, but may be added later",
    ),

  deferredWorkflows: z
    .array(z.string())
    .describe(
      "High-level workflows or pages explicitly requested by the user that were intentionally deferred to respect the core MVP and architectural budget",
    )
    .optional(),

  /** Pages the application needs */
  pages: z.array(
    z.object({
      name: z.string(),
      route: z.string(),
      description: z.string(),
    })
  ),

  /** Reusable UI components the application needs */
  components: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    })
  ),

  /** Visual theme direction */
  theme: z
    .object({
      style: z.string().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      fontFamily: z.string().optional(),
    })
    .optional(),

  /** Whether the application requires user authentication */
  requiresAuth: z.boolean(),

  /** Whether the application must be responsive across devices */
  responsive: z.boolean(),

  /** Whether the application should meet accessibility standards */
  accessible: z.boolean(),

  /** Whether the application explicitly requested testing/unit tests */
  requiresTests: z.boolean().describe("True ONLY if the user explicitly mentions testing, unit tests, Jest, Playwright, etc."),

  /** Overall complexity assessment */
  complexity: z.enum(["low", "medium"]),

  /** Optional additional metadata for extensibility */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
