import mongoose from "mongoose";
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env"), override: true });

async function getProj() {
  const { connectDatabase } = await import("./src/config/database.js");
  const { ProjectModel } = await import("./src/modules/projects/project.model.js");
  await connectDatabase();
  let project = await ProjectModel.findById('6a7beac6f83255ce557bf6ea');
  console.log("aiPlan:", project.aiPlan);
  console.log("architecturePlan:", project.architecturePlan);
  process.exit(0);
}
getProj();
