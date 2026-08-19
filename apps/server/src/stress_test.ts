import mongoose from "mongoose";
import { config } from "dotenv";
import { ProjectModel } from "./modules/projects/project.model.js";
import { RefinementService } from "./modules/ai/refinement/refinement.service.js";
import { GeminiService } from "./modules/ai/clients/gemini.service.js";
import { connectDatabase } from "./config/database.js";
import { ModelSchedulerService } from "./modules/ai/scheduler/model-scheduler.service.js";
import { RepairEngineService } from "./modules/ai/repair/repair-engine.service.js";

config({ override: true });

async function runStressTest() {
  await connectDatabase();
  const scheduler = new ModelSchedulerService();
  const gemini = new GeminiService(scheduler);
  const repairEngine = new RepairEngineService(gemini);
  const refinementService = new RefinementService(gemini, repairEngine);

  let project = await ProjectModel.findById('6a7beac6f83255ce557bf6ea');

  if (!project) {
    console.error("Project 6a7beac6f83255ce557bf6ea not found.");
    process.exit(1);
  }

  const prompts = [
    "Change the primary background color to a dark blue.",
    "Make the main heading slightly larger.",
    "Make the countdown button disabled while the countdown is running.",
    "Make the dashboard cards have slightly more rounded corners.",
    "Make the interface feel more modern.",
    "Add a small search field to the dashboard that filters the visible cards.",
    "Change the font of the entire app to Inter.",
    "Make the background of the app dark gray.",
    "Create a small reusable component called TestDeletionCard.tsx and display it on the dashboard. It should be a simple card containing a title and short description.",
    "Delete the TestDeletionCard component and remove it from the dashboard.",
    "Change the dashboard background color to a light gray.",
    "Add a small footer to the dashboard showing the current year."
  ];

  const results = [];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`\n==================================================`);
    console.log(`RUN ${i + 1}/${prompts.length}: ${prompt}`);
    console.log(`==================================================`);
    
    const startTime = performance.now();
    let success = true;
    let errorMsg: string | null = null;
    try {
      await refinementService.refine(project!, prompt);
      console.log(`✅ Refinement succeeded!`);
      
      project = await ProjectModel.findById(project!._id);
      
      if (project && project.status === "pending_changes") {
        project.generatedProject = project.pendingProject;
        project.pendingProject = null;
        project.status = "ready";
        await project.save();
        console.log(`✅ Applied changes for next run.`);
      }
    } catch (err: any) {
      console.error(`❌ Refinement failed: ${err.message}`);
      success = false;
      errorMsg = err.message;
      
      project = await ProjectModel.findById(project!._id);
      if (project && project.status !== "ready") {
        project.status = "ready";
        project.pendingProject = null;
        await project.save();
      }
    }
    const totalTime = performance.now() - startTime;
    
    results.push({
      run: i + 1,
      prompt,
      success,
      errorMsg,
      totalTimeSec: (totalTime / 1000).toFixed(1)
    });
    
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n==================================================`);
  console.log(`STRESS TEST RESULTS`);
  console.log(`==================================================`);
  console.table(results);

  process.exit(0);
}

runStressTest().catch(console.error);
