import { z } from "zod";

export const validationIssueSchema = z.object({
  file: z.string().describe("The file path affected by this issue"),
  type: z.enum([
    "contract",
    "import",
    "export",
    "missing-file",
    "typecheck"
  ]).describe("The type of validation issue"),
  severity: z.enum(["critical", "error", "warning", "info"]).describe("Severity level"),
  message: z.string().describe("Human-readable message describing the issue"),
  expected: z.string().optional().describe("The expected value or behavior"),
  actual: z.string().optional().describe("The actual value or behavior found"),
  repairStrategy: z.enum(["modify-file", "regenerate-file"]).describe("Recommended strategy for repairing the file"),
  owner: z.enum(["AI", "Template", "Runtime"]).optional().describe("The owner of the file"),
});

export const validationResultSchema = z.object({
  passed: z.boolean().describe("True if no critical or error issues were found"),
  issues: z.array(validationIssueSchema).describe("List of validation issues"),
  metrics: z.object({
    workspaceCreateMs: z.number().default(0),
    installMs: z.number().default(0),
    typecheckMs: z.number().default(0),
    buildMs: z.number().default(0),
    totalMs: z.number().default(0),
  }).optional().describe("Performance metrics for validation stages"),
});
