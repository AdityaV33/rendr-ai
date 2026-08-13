import { connectDatabase } from '../src/config/database.js';
import { ProjectModel } from '../src/modules/projects/project.model.js';
import { GeminiService } from '../src/modules/ai/clients/gemini.service.js';
import { ModelSchedulerService } from '../src/modules/ai/scheduler/model-scheduler.service.js';
import { RepairEngineService } from '../src/modules/ai/repair/repair-engine.service.js';
import { RefinementService } from '../src/modules/ai/refinement/refinement.service.js';

const PROMPT = `Perform a comprehensive modernization and architectural refinement of the application while preserving all existing functionality.

Requirements:

• Add keyboard shortcuts for common actions where appropriate.
• Add persisted user preferences using localStorage.
• Extract duplicated logic into reusable custom hooks.
• Extract shared utility functions into reusable utility modules.
• Consolidate shared interfaces and types into common type files where appropriate.
• Refactor duplicated UI into reusable components.
• Improve responsiveness across the application while preserving the current design.
• Improve accessibility by adding appropriate ARIA attributes, keyboard navigation, and focus management where applicable.
• Improve component organization by introducing new files and folders wherever appropriate.
• Reduce code duplication throughout the project.
• Keep the existing application behavior intact.
• Follow the existing project architecture, naming conventions, and coding style.
• Do not rewrite the application from scratch—perform an incremental refinement of the existing codebase.
• Introduce any new files that are necessary.
• Remove obsolete code only when it has been replaced.
• Ensure the application builds successfully with no TypeScript errors.`;

async function run() {
  console.log("Connecting to database...");
  await connectDatabase();

  const project = await ProjectModel.findOne({ status: "ready" }).sort({ updatedAt: -1 });
  if (!project) {
    console.error("No ready project found to refine!");
    process.exit(1);
  }

  console.log(`Found project: ${project.name} (${project._id.toString()})`);
  console.log(`Current files count in manifest: ${project.generatedProject?.files?.length}`);

  const scheduler = new ModelSchedulerService();
  const gemini = new GeminiService(scheduler);
  const repairEngine = new RepairEngineService(gemini);
  const refinementService = new RefinementService(gemini, repairEngine);

  console.log("\n=========================================");
  console.log("STARTING TEST 1 REFINEMENT PIPELINE");
  console.log("=========================================\n");

  try {
    const result = await refinementService.refine(project, PROMPT, (event) => {
      console.log(`[Event: ${event.type}] Duration: ${event.durationMs ? `${(event.durationMs / 1000).toFixed(2)}s` : '-'}`);
    });

    console.log("\nRefinement completed successfully!");
    console.log("Affected files returned by planner:", result.affectedFiles);
    
    await project.save();
    console.log("Project saved to MongoDB successfully.");
    console.log(`Final files in manifest: ${project.generatedProject?.files?.length}`);
    const hasThemeContext = project.generatedProject?.files?.some(f => f.path.includes("ThemeContext"));
    console.log(`ThemeContext in manifest: ${hasThemeContext ? '✅ YES' : '❌ NO'}`);
  } catch (error) {
    console.error("\n❌ Refinement pipeline failed with error:", error);
  }

  process.exit(0);
}

run();
