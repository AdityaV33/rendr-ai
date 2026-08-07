import { connectDatabase } from "../src/config/database.js";
import { AiService } from "../src/modules/ai/ai.service.js";
import fs from "node:fs/promises";

async function run() {
  await connectDatabase();
  const ai = new AiService();

  const prompts = [
    "A modern Expense Tracker. React, Tailwind. Include a dashboard, transaction list, and an add transaction form.",
    "A Kanban Board for project management. React, Tailwind. Multiple columns, drag and drop.",
    "A standard Calculator. Vanilla JS, HTML, CSS. Arithmetic logic, clean UI.",
    "A Todo App. Vanilla JS, HTML, CSS. Filtering, editing, local storage.",
    "A Weather Dashboard. Vanilla JS, HTML, CSS. Fetches mock forecast data for different cities."
  ];

  console.log("==========================================");
  console.log("STARTING RELIABILITY EVALUATION");
  console.log("==========================================\n");

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    console.log(`\n\n==========================================`);
    console.log(`PROJECT ${i + 1} OF 5`);
    console.log(`PROMPT: ${p}`);
    console.log(`==========================================\n`);

    const cycleIssues: number[] = [];

    try {
      await ai.generate({ 
        prompt: p, 
        onEvent: (e) => {
          if (e.type === "validation_completed") {
            const numIssues = e.state?.validationResult?.issues?.length || 0;
            cycleIssues.push(numIssues);
            console.log(`[Eval] Validation Cycle Complete. Issues found: ${numIssues}`);
          }
        }
      });
      console.log(`\n[Eval] SUCCESS for Project ${i + 1}`);
      console.log(`[Eval] Repair progression: ${cycleIssues.join(" -> ")}`);
    } catch (err: any) {
      console.error(`\n[Eval] FAILURE for Project ${i + 1}`);
      console.error(err.message || err);
      console.log(`[Eval] Repair progression before failure: ${cycleIssues.join(" -> ")}`);
    }
  }

  console.log("\n\n==========================================");
  console.log("EVALUATION COMPLETE");
  console.log("==========================================");
  
  process.exit(0);
}

run().catch(console.error);
