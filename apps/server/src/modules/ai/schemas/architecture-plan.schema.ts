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
  strategies: z.object({
    styling: z.string().describe("e.g., 'Tailwind CSS', 'Vanilla CSS', 'CSS Modules'"),
    routing: z.string().describe("e.g., 'React Router', 'Next.js App Router', 'None'"),
    stateManagement: z.string().describe("e.g., 'Zustand', 'React Context', 'Redux', 'None'"),
    authentication: z.string().describe("e.g., 'JWT', 'NextAuth', 'Supabase', 'None'"),
    designSystem: z.string().describe("e.g., 'Shadcn UI', 'Material UI', 'Custom'"),
  }),

  /** Developer tooling and configuration */
  tooling: z.object({
    linting: z.string().describe("e.g., 'ESLint'"),
    formatting: z.string().describe("e.g., 'Prettier'"),
    testing: z.string().describe("e.g., 'Vitest + React Testing Library', 'Jest', 'None'"),
  }),

  /** Required environment variables for the project */
  environmentVariables: z.array(
    z.object({
      key: z.string().describe("The environment variable name, e.g., 'DATABASE_URL'"),
      description: z.string().describe("What this variable is used for"),
      required: z.boolean().default(true),
    })
  ),

  /** Standard scripts for package.json */
  scripts: z.record(z.string(), z.string()).describe("Key-value pair of npm scripts, e.g., { 'dev': 'vite' }"),

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
    })
  ),

  /** Optional build or deployment configurations */
  buildConfiguration: z.object({
    outputDirectory: z.string().describe("e.g., 'dist', '.next'"),
    nodeVersion: z.string().optional().describe("e.g., '>= 18.0.0'"),
  }).optional(),

  /** The single source of truth for component APIs. Must be generated for EVERY component in the file structure (excluding root/pages). */
  componentContracts: z.array(
    z.object({
      name: z.string().describe("The exact name of the component, e.g. 'MessageCard'"),
      description: z.string().describe("One-sentence description to disambiguate similarly named components. NO implementation details."),
      exportType: z.enum(["default", "named"]),
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
      ),
    })
  ).describe("Required array containing the API contract for EVERY component you create."),

  /** Extensibility for future phases */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
