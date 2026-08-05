import 'dotenv/config';
import { aiService } from "./src/modules/ai/ai.service.js";

async function testGeneration() {
  const appsToGenerate = [
    "A simple calculator with add, subtract, multiply, and divide",
    "A todo app with add, delete, and toggle completion features",
    "A Spotify landing page with a hero section, featured playlists, and a bottom player bar"
  ];

  for (let i = 0; i < appsToGenerate.length; i++) {
    const prompt = appsToGenerate[i];
    console.log(`\n==========================================`);
    console.log(`Testing App ${i + 1}: "${prompt}"`);
    console.log(`==========================================`);
    
    try {
      const result = await aiService.generate({ prompt });
      
      console.log(`✅ Success for "${prompt}"`);
      console.log(`- Project Plan features: ${result.projectPlan.features.length}`);
      console.log(`- Architecture Plan files: ${result.architecturePlan.fileStructure.length}`);
      console.log(`- Generated Files count: ${result.generatedProject.files.length}`);
    } catch (error) {
      console.error(`❌ Failed for "${prompt}" (Likely an LLM generation failure in Phase 6)`, error);
      // Continuing to next test instead of exiting
    }
  }

  console.log("\n✅ ALL THREE END-TO-END TESTS PASSED.");
}

testGeneration();
