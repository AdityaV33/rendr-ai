import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { projectPlanSchema } from "./src/modules/ai/schemas/project-plan.schema.js";
import { zodToGeminiSchema } from "./src/modules/ai/utils/schema.utils.js";

const raw = zodToJsonSchema(projectPlanSchema, { target: "openApi3" });
console.log("RAW zodToJsonSchema:");
console.log(JSON.stringify(raw, null, 2));

console.log("\nGEMINI SCHEMA:");
console.log(JSON.stringify(zodToGeminiSchema(projectPlanSchema), null, 2));
