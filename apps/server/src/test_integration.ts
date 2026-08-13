import { config } from 'dotenv';
config();
import mongoose from 'mongoose';

async function runTest() {
  const { connectDatabase } = await import('./config/database.js');
  await connectDatabase();
  console.log("Connected to MongoDB via connectDatabase");

  const { ProjectModel } = await import('./modules/projects/project.model.js');
  const projectService = await import('./modules/projects/project.service.js');
  const { getWorkspaceFile, updateWorkspaceFile } = await import('./modules/runtime/workspace-file.service.js');

  // Create a dummy user and project for testing
  const dummyOwner = new mongoose.Types.ObjectId();

  // 1. Start with a project in ready
  const project = await ProjectModel.create({
    owner: dummyOwner,
    name: "Integration Test Project",
    status: "ready",
    pipelineStage: "Ready",
    prompt: "Initial prompt",
    framework: "react-vite",
    generatedProject: {
      files: [
        { path: "src/App.tsx", content: "export default function App() { return <div>Original</div> }" }
      ],
      commands: { dev: "npm run dev", build: "npm run build" }
    }
  });

  const projectId = project._id.toString();
  console.log(`\nCreated test project: ${projectId}`);

  // 2. Capture original generatedProject
  const originalGeneratedFiles = JSON.parse(JSON.stringify(project.generatedProject.files));

  // 3. Trigger refinement
  // Instead of full AI refine, we'll manually simulate the refinement generator output to avoid real LLM calls and latency.
  console.log("\n--- TRIGGER REFINEMENT ---");
  project.status = "refining";
  await project.save();

  // Simulate generator output
  project.pendingProject = {
    files: [
      { path: "src/App.tsx", content: "export default function App() { return <div>AI Refined</div> }" }
    ],
    commands: { dev: "npm run dev", build: "npm run build" }
  };
  project.status = "pending_changes";
  project.pipelineStage = "Pending Changes";
  await project.save();
  await updateWorkspaceFile(projectId, "src/App.tsx", "export default function App() { return <div>AI Refined</div> }");

  const pendingDbProject = await ProjectModel.findById(projectId);

  // 4. Verify enters pending_changes
  console.log(`4. Status is pending_changes: ${pendingDbProject?.status === "pending_changes" ? "PASS" : "FAIL (actual: " + pendingDbProject?.status + ")"}`);

  // 5. Verify pendingProject contains AI changes
  const hasAiChanges = pendingDbProject?.pendingProject?.files.some(f => f.content.includes("AI Refined"));
  console.log(`5. pendingProject contains AI changes: ${hasAiChanges ? "PASS" : "FAIL"}`);

  // 6. Verify generatedProject is still original
  const hasOriginal = pendingDbProject?.generatedProject?.files.some(f => f.content.includes("Original"));
  console.log(`6. generatedProject is original: ${hasOriginal ? "PASS" : "FAIL"}`);

  // 7. Save a manual modification while pending_changes
  console.log("\n--- MANUAL SAVE WHILE PENDING ---");
  // The actual save endpoint calls updateWorkspaceFile directly from controller, which modifies DB manually.
  // We'll mimic the controller logic we just fixed.
  const manualContent = "export default function App() { return <div>AI Refined + Manual Edit</div> }";

  // What the controller does:
  const targetProject = (pendingDbProject!.status === "pending_changes" && pendingDbProject!.pendingProject)
    ? pendingDbProject!.pendingProject
    : pendingDbProject!.generatedProject;

  const fileIndex = targetProject!.files.findIndex(f => f.path === "src/App.tsx");
  if (fileIndex >= 0) targetProject!.files[fileIndex].content = manualContent;

  if (pendingDbProject!.status === "pending_changes" && pendingDbProject!.pendingProject) {
    pendingDbProject!.markModified("pendingProject");
  } else {
    pendingDbProject!.markModified("generatedProject");
  }
  await pendingDbProject!.save();
  await updateWorkspaceFile(projectId, "src/App.tsx", manualContent);

  const postSaveProject = await ProjectModel.findById(projectId);

  // 8. Verify manual modification is in pendingProject
  const isManualInPending = postSaveProject?.pendingProject?.files.some(f => f.content === manualContent);
  console.log(`8. Manual edit in pendingProject: ${isManualInPending ? "PASS" : "FAIL"}`);

  // 9. Verify generatedProject was NOT modified by save
  const isGeneratedUntouched = postSaveProject?.generatedProject?.files.some(f => f.content.includes("Original"));
  console.log(`9. generatedProject untouched by save: ${isGeneratedUntouched ? "PASS" : "FAIL"}`);

  // 10. Call Apply Changes
  console.log("\n--- APPLY CHANGES ---");
  await projectService.applyProject(dummyOwner, projectId);

  const appliedProject = await ProjectModel.findById(projectId);

  // 11. Verify Apply results
  console.log(`11a. status = ready: ${appliedProject?.status === "ready" ? "PASS" : "FAIL"}`);
  console.log(`11b. pendingProject is cleared: ${!appliedProject?.pendingProject ? "PASS" : "FAIL"}`);
  const hasBoth = appliedProject?.generatedProject?.files.some(f => f.content === manualContent);
  console.log(`11c. generatedProject has both AI + manual: ${hasBoth ? "PASS" : "FAIL"}`);
  console.log(`11d. exactly one undo snapshot: ${appliedProject?.history?.length === 1 ? "PASS" : "FAIL"}`);

  // 12. Call Undo
  console.log("\n--- UNDO ---");
  await projectService.undoProject(dummyOwner, projectId);

  const undoneProject = await ProjectModel.findById(projectId);
  const workspaceContent = await getWorkspaceFile(projectId, "src/App.tsx");

  // 13, 14, 15. Verify Undo results
  const isBackToOriginal = undoneProject?.generatedProject?.files.some(f => f.content.includes("Original") && !f.content.includes("Manual"));
  console.log(`13/14. generatedProject returned to original canonical state: ${isBackToOriginal ? "PASS" : "FAIL"}`);
  console.log(`15. pendingProject is empty: ${!undoneProject?.pendingProject ? "PASS" : "FAIL"}`);
  console.log(`16. workspace files match restored generatedProject: ${workspaceContent.includes("Original") ? "PASS" : "FAIL"}`);
  console.log(`17. status is ready: ${undoneProject?.status === "ready" ? "PASS" : "FAIL"}`);


  // SECOND TEST: PRE-APPLY UNDO
  console.log("\n\n--- SECOND TEST: PRE-APPLY UNDO ---");

  // 1. Start another refinement
  undoneProject!.status = "pending_changes";
  undoneProject!.pendingProject = {
    files: [{ path: "src/App.tsx", content: "AI Edit 2" }],
    commands: { dev: "npm run dev", build: "npm run build" }
  };
  await undoneProject!.save();
  await updateWorkspaceFile(projectId, "src/App.tsx", "AI Edit 2");

  const pendingProject2 = await ProjectModel.findById(projectId);
  console.log(`2. Reached pending_changes: ${pendingProject2?.status === "pending_changes" ? "PASS" : "FAIL"}`);

  // 3, 4. Do NOT Apply. Call Undo.
  await projectService.undoProject(dummyOwner, projectId);

  const preApplyUndoProject = await ProjectModel.findById(projectId);
  const workspaceContent2 = await getWorkspaceFile(projectId, "src/App.tsx");

  // 5, 6, 7, 8. Verify pre-Apply Undo
  console.log(`5. pendingProject discarded: ${!preApplyUndoProject?.pendingProject ? "PASS" : "FAIL"}`);
  const isGenOriginal = preApplyUndoProject?.generatedProject?.files.some(f => f.content.includes("Original"));
  console.log(`6. generatedProject remains unchanged: ${isGenOriginal ? "PASS" : "FAIL"}`);
  console.log(`7. workspace matches generatedProject: ${workspaceContent2.includes("Original") ? "PASS" : "FAIL"}`);
  console.log(`8. status returns to ready: ${preApplyUndoProject?.status === "ready" ? "PASS" : "FAIL"}`);

  process.exit(0);
}

runTest().catch(console.error);
