import { config } from 'dotenv';
config();
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log("Setting up test environment...");
  const { connectDatabase } = await import('./config/database.js');
  await connectDatabase();
  
  const { ProjectModel } = await import('./modules/projects/project.model.js');
  const projectService = await import('./modules/projects/project.service.js');
  
  // Hardcode the ID card project we know is valid
  const project = await ProjectModel.findById("6a7beac6f83255ce557bf6ea");
  
  if (!project) {
    console.log("No 'ready' projects found to test refinement on!");
    process.exit(1);
  }
  
  console.log(`Using Project: ${project.name} (${project._id})`);
  
  const targetFile = project.generatedProject?.files.find(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
  if (!targetFile) {
    console.log("No suitable files found in project.");
    process.exit(1);
  }

  console.log(`\n=== 1. Refinement Test: Large File Mod ===`);
  const prompt1 = `Add comprehensive JSDoc comments to every function and interface in ${targetFile.path}, and add a complex new utility function with at least 20 lines of logic.`;
  
  await ProjectModel.updateOne({ _id: project._id }, { $set: { status: "refining" } });
  const lockedProject1 = await ProjectModel.findById(project._id);
  
  const start1 = performance.now();
  console.log(`Triggering refinement: "${prompt1}"...`);
  await projectService.refineProject(lockedProject1!, prompt1);
  const latency1 = performance.now() - start1;
  
  // Check pendingProject for newlines
  const p1 = await ProjectModel.findById(project._id);
  const modifiedFile = p1?.pendingProject?.files.find(f => f.path === targetFile.path);
  
  const nlCount1 = (modifiedFile?.content.match(/\n/g) || []).length;
  console.log(`Latency: ${(latency1 / 1000).toFixed(2)}s`);
  console.log(`Newline Count in ${targetFile.path}: ${nlCount1}`);
  if (nlCount1 < 10) {
    console.log("❌ FAILED: Newlines are still missing.");
  } else {
    console.log("✅ SUCCESS: Newlines preserved!");
  }
  console.log("Preview of output:");
  console.log(modifiedFile?.content.split('\n').slice(0, 5).join('\n'));

  console.log(`\n=== 2. Apply Changes ===`);
  const applyStart = performance.now();
  await projectService.applyProject(project.owner.toString(), project._id.toString());
  console.log(`Applied in ${((performance.now() - applyStart) / 1000).toFixed(2)}s`);

  console.log(`\n=== 3. Refinement Test: Create New File ===`);
  await ProjectModel.updateOne({ _id: project._id }, { $set: { status: "refining" } });
  const lp2 = await ProjectModel.findById(project._id);
  const start2 = performance.now();
  await projectService.refineProject(lp2!, "Create a new component called src/components/PrintButton.tsx that renders a button using lucide-react to print the ID card.");
  const latency2 = performance.now() - start2;
  
  const p2 = await ProjectModel.findById(project._id);
  const newFile = p2?.pendingProject?.files.find(f => f.path === 'src/components/PrintButton.tsx');
  const nlCount2 = (newFile?.content.match(/\n/g) || []).length;
  console.log(`Latency: ${(latency2 / 1000).toFixed(2)}s`);
  console.log(`Newline Count in new file: ${nlCount2}`);
  
  await projectService.applyProject(project.owner.toString(), project._id.toString());

  console.log(`\n=== 4. Refinement Test: Delete File ===`);
  await ProjectModel.updateOne({ _id: project._id }, { $set: { status: "refining" } });
  const lp3 = await ProjectModel.findById(project._id);
  await projectService.refineProject(lp3!, "Delete the src/components/PrintButton.tsx file because we no longer need it.");
  const p3 = await ProjectModel.findById(project._id);
  const isDeleted = !p3?.pendingProject?.files.some(f => f.path === 'src/components/PrintButton.tsx');
  console.log(`File deleted successfully: ${isDeleted}`);
  
  await projectService.applyProject(project.owner.toString(), project._id.toString());
  
  console.log(`\n=== 5. Refinement Test: Repair (Syntax Error) ===`);
  await ProjectModel.updateOne({ _id: project._id }, { $set: { status: "refining" } });
  const lp4 = await ProjectModel.findById(project._id);
  // We trigger a repair by deliberately asking it to add invalid code
  await projectService.refineProject(lp4!, "In src/App.tsx, add a line of code exactly like this inside the App component: `const x: number = 'string';` to trigger a type error.");
  const p4 = await ProjectModel.findById(project._id);
  console.log(`Repair pipeline triggered and completed.`);
  
  console.log(`\n=== 6. Undo All ===`);
  await projectService.undoProject(project.owner.toString(), project._id.toString());
  await projectService.undoProject(project.owner.toString(), project._id.toString());
  await projectService.undoProject(project.owner.toString(), project._id.toString());
}

runTest().catch(console.error);
