import { projectPlanSchema } from "./src/modules/ai/schemas/project-plan.schema.js";
console.log(JSON.stringify(projectPlanSchema.toJSONSchema ? projectPlanSchema.toJSONSchema() : "No method", null, 2));
