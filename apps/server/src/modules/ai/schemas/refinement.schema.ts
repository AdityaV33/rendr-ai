import { z } from "zod";

export const refinementPlannerSchema = z.object({
  isSupported: z.boolean().describe("Whether the refinement request is supported. Must be false if it exceeds 2 logical changes, attempts to change the framework/language, or is otherwise invalid."),
  reasoning: z.string().describe("Explanation for why the request is supported or rejected."),
  affectedFiles: z.array(
    z.object({
      path: z.string().describe("The exact path of the file to modify, create, or delete."),
      reason: z.string().describe("Why this file needs to be modified or deleted."),
      action: z.enum(["create", "modify", "delete"]).describe("The exact action to perform on this file.")
    })
  ).describe("List of files that need to be modified, created, or deleted to fulfill the refinement."),
  logicalChanges: z.array(z.string()).describe("A list of explicit logical changes requested by the user. Must not exceed 2."),
  instructions: z.string().describe("Detailed instructions for the Targeted Generator on what exactly to change in the affected files. Skip for files being deleted.")
});

export type RefinementPlan = z.infer<typeof refinementPlannerSchema>;
