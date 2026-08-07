import mongoose from "mongoose";
import { env } from "./src/config/env.js";
import { createProject, generateProject } from "./src/modules/projects/project.service.js";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected.");

  const owner = "test-owner";
  
  const prompt = `Project Management System
  
Requirements:
* Dashboard
* Projects
* Tasks
* Team
* Settings
* CRUD
* Search
* Filters
* LocalStorage
* Charts
* React Router`;

  console.log("Creating project...");
  const project = await createProject(owner, { name: "Test PM System", prompt });
  console.log(`Project created: ${project._id}`);

  console.log("Generating project...");
  await generateProject(owner, project._id.toString());
  console.log("Generation complete!");
  
  process.exit(0);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
