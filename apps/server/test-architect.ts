import { GeminiService } from "./src/modules/ai/clients/gemini.service.js";
import { ModelSchedulerService } from "./src/modules/ai/scheduler/model-scheduler.service.js";
import { architecturePlanSchema } from "./src/modules/ai/schemas/architecture-plan.schema.js";
import { ARCHITECT_SYSTEM_PROMPT } from "./src/modules/ai/prompts/architect.prompt.js";
import { zodToGeminiSchema } from "./src/modules/ai/utils/schema.utils.js";
import * as fs from "fs";

async function main() {
  const scheduler = new ModelSchedulerService();
  const gemini = new GeminiService(scheduler);
  
  const projectPlan = {
    applicationType: "Expense Tracker",
    purpose: "A personal finance dashboard to track income, expenses, and current balance.",
    targetAudience: "Individuals",
    features: ["Add transaction", "Delete transaction", "Filter by category", "View balance"],
    pages: [{ name: "Dashboard", route: "/", description: "Main view" }],
    components: [{ name: "TransactionList", description: "List of transactions" }, { name: "AddTransactionForm", description: "Form" }],
    requiresAuth: false,
    responsive: true,
    accessible: true,
    requiresTests: false,
    complexity: "medium" as any
  };

  const prompt = `Based on the following ProjectPlan, design the software architecture and component hierarchy.\nReturn the output ONLY as valid JSON matching the schema.\n\nProjectPlan:\n${JSON.stringify(projectPlan, null, 2)}`;
  
  const ARCHITECTURE_PLAN_GEMINI_SCHEMA = zodToGeminiSchema(architecturePlanSchema);
  
  console.log("=== RUN: Generating Architecture ===");
  try {
    const output = await gemini.generateStructured(
      prompt,
      ARCHITECTURE_PLAN_GEMINI_SCHEMA,
      ARCHITECT_SYSTEM_PROMPT,
      { timeoutMs: 60000, taskName: "Architect Test" }
    );
    
    fs.writeFileSync("output_schema_update.json", JSON.stringify(output, null, 2));
    console.log("Run completed. Wrote output_schema_update.json");
    
    const contracts = output.behavioralContracts || [];
    console.log(`Run: ${contracts.length} files with behavioral contracts`);
  } catch (err: any) {
    console.error("Run failed", err.message);
  }
}

main().catch(console.error);
