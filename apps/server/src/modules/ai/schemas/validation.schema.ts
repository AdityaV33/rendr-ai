import { z } from "zod";

export const validationIssueSchema = z.object({
  id: z.string().describe("Machine-readable ID, e.g., 'missing-root-file'"),
  severity: z.enum(["critical", "error", "warning", "info"]).describe("Severity level"),
  message: z.string().describe("Human-readable message describing the issue"),
  affectedFiles: z.array(z.string()).optional().describe("List of file paths affected"),
});

export const validationResultSchema = z.object({
  passed: z.boolean().describe("True if no critical or error issues were found"),
  issues: z.array(validationIssueSchema).describe("List of validation issues"),
});
