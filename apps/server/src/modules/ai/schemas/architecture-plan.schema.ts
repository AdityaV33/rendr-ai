import { z } from "zod";

/**
 * ArchitecturePlan Schema
 *
 * Represents the output of the Architect — the engineering and structural decisions.
 * The Architect thinks like a Staff Software Engineer. It receives the WHAT
 * (ProjectPlan) and determines the HOW.
 *
 * This contract contains NO generated source code or implementation details
 * (such as component props, state, or hooks). It only contains the blueprints,
 * technology choices, file structures, tooling, and dependencies that the 
 * Generator will use to produce the final project files.
 */
export const architecturePlanSchema = z.object({
  /** Core technology stack decisions */
  stack: z.object({
    language: z.string().describe("e.g., 'TypeScript', 'JavaScript'"),
    frontendFramework: z.string().describe("e.g., 'React', 'Vue', 'Vanilla JS'"),
    buildTool: z.string().describe("e.g., 'Vite', 'Next.js', 'Webpack'"),
    packageManager: z.string().describe("e.g., 'npm', 'yarn', 'pnpm'"),
  }),

  /** High-level architectural strategies */
  strategies: z.array(z.string()).describe("List of styling, state, or routing choices. e.g., ['Tailwind CSS', 'React Router', 'Zustand']"),

  /** Specific NPM dependencies required for the project */
  dependencies: z.array(
    z.object({
      name: z.string(),
      version: z.string().optional().describe("Can be 'latest' or a specific version like '^18.2.0'"),
      isDev: z.boolean().default(false),
      reason: z.string().describe("Why this dependency is needed for the architecture"),
    })
  ),

  /** The exact physical file and directory structure to be generated */
  fileStructure: z.array(
    z.object({
      path: z.string().describe("Relative path from project root, e.g., 'src/components/Button.tsx'"),
      purpose: z.string().describe("High-level instructions for the Generator on what this file should contain. NO props or state details."),
      type: z.enum(["file", "directory"]),
      allowedImports: z.array(z.string()).optional().describe("Strict list of other generated files (by name) or npm dependencies this file is allowed to import. e.g., ['CalculatorContext', 'react']"),
    })
  ),

  /** The single source of truth for component APIs. Must be generated for EVERY component in the file structure (excluding root/pages). */
  componentContracts: z.array(
    z.object({
      name: z.string().describe("The exact name of the component, e.g. 'MessageCard'"),
      importPath: z.string().describe("The relative import path from src root, e.g. './components/Display' or './context/CalculatorContext'"),
      exportType: z.enum(["default", "named"]),
      exports: z.array(z.string()).describe("The exact exported symbol names this file MUST export. e.g. for a Context: ['CalculatorProvider', 'useCalculator']. For a component: ['Display']. Every consumer will import these exact names."),
      publicAPI: z.array(z.string()).optional().describe("For hooks/contexts: the exact property names returned. e.g. ['result', 'history', 'calculate', 'clear']. Omit for simple components."),
      props: z.array(
        z.object({
          name: z.string(),
          type: z.enum([
            "string",
            "number",
            "boolean",
            "() => void",
            "ReactNode",
            "string[]",
            "number[]",
            "boolean[]"
          ]).describe("Strictly constrained type to prevent API hallucination."),
          required: z.boolean(),
        })
      )
    })
  ).describe("Required array containing the API contract for EVERY component you create."),

  /** Behavioral contracts defining interactions and derived state */
  behavioralContracts: z.array(
    z.object({
      file: z.string().describe("Must exactly match a fileStructure path."),
      responsibilities: z.array(z.string()).describe(
        "Explicit logical responsibilities this file owns. Use imperative language like 'Own calculator state', 'Evaluate expressions'."
      ),
      behaviorRules: z.array(
        z.object({
          trigger: z.string().describe("e.g. 'Click number', 'Component mounts'"),
          preconditions: z.array(z.string()).default([]).describe("e.g. ['Expression is non-empty']"),
          action: z.string().describe("e.g. 'Append digit to currentInput', 'Fetch user data'"),
          assertions: z.array(z.string()).default([]).describe("e.g. ['Display shows result', 'History length increases by 1']"),
        })
      ).describe("Strict mapping of interactions to expected behaviors. Machine-oriented and concise."),
      acceptanceCriteria: z.array(z.string()).describe("Defines exactly what 'finished' looks like. e.g. ['2 + 3 = 5', 'History is updated']"),
    })
  ).describe("Required array containing the behavioral contract for EVERY interactive component or page."),

  /** Extensibility for future phases */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
