import mongoose from "mongoose";
import { config } from "dotenv";
import { ProjectModel } from "./modules/projects/project.model.js";
import { connectDatabase } from "./config/database.js";

import { resolve } from "path";
config({ path: resolve(process.cwd(), "../.env"), override: true });

async function getProj() {
  await connectDatabase();
  let project = await ProjectModel.findOne({ 
    aiPlan: { $exists: true, $ne: null }, 
    architecturePlan: { $exists: true, $ne: null } 
  }).sort({ createdAt: -1 });

  console.log(project?._id, !!project?.aiPlan, !!project?.architecturePlan);
  process.exit(0);
}
getProj();
