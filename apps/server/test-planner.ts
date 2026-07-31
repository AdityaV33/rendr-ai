import { config } from "dotenv";
config();
import { PlannerService } from "./src/modules/ai/planner/planner.service.js";
import { GeminiService } from "./src/modules/ai/clients/gemini.service.js";

async function run() {
  const gemini = new GeminiService();
  const planner = new PlannerService(gemini);
  try {
    const result = await planner.plan("Build a modern SaaS dashboard with authentication.");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("TEST FAILED:", error);
  }
}
run();
