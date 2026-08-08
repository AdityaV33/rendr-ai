import { AiService } from "./src/modules/ai/ai.service.js";

async function runTest() {
  const aiService = new AiService();

  const prompts = [
    "Build a todo app with add, edit, delete, complete and filter functionality.",
    "Build a task management dashboard with shared task context, statistics, filtering, modal editing and persistence.",
    "Build a color design tool with palette management, contrast checking, color adjustment, presets and export."
  ];

  for (const prompt of prompts) {
    console.log(`\n\n========================================`);
    console.log(`Testing Prompt: ${prompt}`);
    console.log(`========================================`);
    
    try {
      const result = await aiService.generate({ prompt });
      console.log(`\n[SUCCESS] Generated project with ${result.generatedProject.files.length} files.`);
    } catch (error: any) {
      console.error(`\n[FAILED] Error generating project:`, error.message);
    }
  }
}

runTest().catch(console.error);
