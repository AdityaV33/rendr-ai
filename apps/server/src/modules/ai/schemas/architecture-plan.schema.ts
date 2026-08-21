import { z } from "zod";
import { validateArchitectureIntegrity } from "../validation/architecture-integrity.js";

/**
 * ArchitecturePlan Schema
 */
export const architecturePlanSchema = z.object({
  stack: z.object({
    language: z.string(),
    frontendFramework: z.enum(["react-vite", "vanilla-js"]),
    buildTool: z.string(),
    packageManager: z.string(),
  }),
  strategies: z.array(z.string()).describe("Styling/state/routing choices (e.g. ['Tailwind CSS', 'Zustand'])."),
  dependencies: z.array(
    z.object({
      name: z.string(),
      version: z.string().optional(),
      isDev: z.boolean().default(false),
      reason: z.string(),
    })
  ),
  fileStructure: z.array(
    z.object({
      path: z.string().describe("Relative path (e.g., 'src/components/Button.tsx')"),
      purpose: z.string().describe("High-level purpose. NO props or state details."),
      type: z.enum(["file", "directory"]),
      allowedImports: z.array(z.string()).optional().describe("Strict list of local files/npm dependencies allowed to be imported."),
    })
  ),
  componentContracts: z.array(
    z.object({
      name: z.string(),
      importPath: z.string().describe("Relative import path (e.g. './components/Display')"),
      exportType: z.enum(["default", "named"]),
      exports: z.array(z.string()).describe("Exported symbol names (e.g. ['Display'])."),
      publicAPI: z.array(z.string()).optional().describe("Returned property names for hooks/contexts."),
      props: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean(),
        })
      )
    })
  ),
  behavioralContracts: z.array(
    z.object({
      file: z.string(),
      responsibilities: z.array(z.string()),
      behaviorRules: z.array(
        z.object({
          trigger: z.string(),
          preconditions: z.array(z.string()).default([]),
          action: z.string(),
          assertions: z.array(z.string()).default([]),
        })
      ),
      acceptanceCriteria: z.array(z.string()),
    })
  ),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).superRefine((plan, ctx) => {
  try {
    validateArchitectureIntegrity(plan as any);
  } catch (error: any) {
    if (error.name === "ArchitectureValidationError") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `ARCHITECTURE INTEGRITY ERROR: ${error.message}\n\nYou MUST fix this in your next response.`,
      });
    } else {
      throw error;
    }
  }
});

/**
 * ArchitecturePatch Schema used for Targeted LLM Retry
 */
export const architecturePatchSchema = z.object({
  addedFiles: z.array(
    z.object({
      path: z.string().describe("Relative path (e.g., 'src/components/Button.tsx')"),
      purpose: z.string().describe("High-level purpose. NO props or state details."),
      type: z.enum(["file", "directory"]),
      allowedImports: z.array(z.string()).optional().describe("Strict list of local files/npm dependencies allowed to be imported."),
    })
  ).default([]),
  modifiedComponentContracts: z.array(
    z.object({
      name: z.string(),
      importPath: z.string().describe("Relative import path (e.g. './components/Display')")
    })
  ).default([])
});
