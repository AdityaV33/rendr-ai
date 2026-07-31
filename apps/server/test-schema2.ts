import { projectPlanSchema } from "./src/modules/ai/schemas/project-plan.schema.js";
console.log("Is undefined?", projectPlanSchema === undefined);
console.log("Keys:", Object.keys(projectPlanSchema || {}));
