import { architecturePlanSchema } from "./src/modules/ai/schemas/architecture-plan.schema.js";
import { zodToGeminiSchema } from "./src/modules/ai/utils/schema.utils.js";
const geminiSchema: any = zodToGeminiSchema(architecturePlanSchema);

console.log("Root required fields:", geminiSchema.required);

const fileStructureItem = geminiSchema.properties.fileStructure.items;
console.log("fileStructure item required fields:", fileStructureItem.required);

console.log("componentContracts required fields:", geminiSchema.properties.componentContracts ? "exists" : "missing");

