import mongoose from "mongoose";
import "dotenv/config";
import dns from "node:dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { createProject } from "./src/modules/projects/project.service";
import { startRuntime } from "./src/modules/runtime/runtime-manager.service";

async function verifyReactFramework() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const owner = new mongoose.Types.ObjectId().toString();

  try {
    const project = await createProject(owner, { name: "ReactTest", prompt: "Test react-ts" });
    project.framework = "react-ts";
    await project.save();

    console.log(`Starting runtime for ${project.id}...`);
    await startRuntime(owner, project.id);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

verifyReactFramework();
