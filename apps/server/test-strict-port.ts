import mongoose from "mongoose";
import "dotenv/config";
import dns from "node:dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { createProject, deleteProject } from "./src/modules/projects/project.service";
import { startRuntime } from "./src/modules/runtime/runtime-manager.service";

async function verifyStrictPort() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const owner = new mongoose.Types.ObjectId().toString();

  try {
    const project = await createProject(owner, { name: "StrictPortTest", prompt: "Test strict port" });
    project.framework = "vanilla";
    await project.save();

    await startRuntime(owner, project.id);
    console.log(`[Test] Project ${project.id} created and runtime started.`);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

verifyStrictPort();
