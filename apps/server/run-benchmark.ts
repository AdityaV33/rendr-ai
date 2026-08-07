import { aiService } from "./src/modules/ai/ai.service.js";
import fs from "fs";
import path from "path";

const prompts = [
  {
    name: "React - Easy (Expense Tracker)",
    prompt: `Expense Tracker
Requirements:
* Add expense
* Delete expense
* Category
* Total balance
* LocalStorage
Framework: React`
  },
  {
    name: "React - Medium (Kanban Board)",
    prompt: `Kanban Board
Requirements:
* Three columns
* Drag & Drop
* Add/Edit/Delete cards
* LocalStorage
Framework: React`
  },
  {
    name: "React - Hard (Admin Dashboard)",
    prompt: `Admin Dashboard
Requirements:
* Sidebar
* Dashboard
* Users page
* Settings page
* React Router
* Charts (mock data)
* Search
* Responsive layout
Framework: React`
  },
  {
    name: "Vanilla JS - Easy (Calculator)",
    prompt: `Calculator
Requirements:
* Arithmetic
* Clear
* Keyboard support
Framework: Vanilla JS`
  },
  {
    name: "Vanilla JS - Medium (Todo Application)",
    prompt: `Todo Application
Requirements:
* CRUD
* Filters
* Edit
* LocalStorage
Framework: Vanilla JS`
  },
  {
    name: "Vanilla JS - Hard (Weather Dashboard)",
    prompt: `Weather Dashboard
Requirements:
* City selector
* Mock forecast
* Current weather
* Forecast cards
* Search
* Responsive layout
Framework: Vanilla JS`
  }
];

async function runBenchmark() {
  const results = [];
  const outputPath = path.join(process.cwd(), "benchmark_results.json");
  console.log("Saving results to", outputPath);
  
  for (const p of prompts) {
    console.log(`\n\n================================`);
    console.log(`Starting Benchmark: ${p.name}`);
    console.log(`================================\n`);
    
    let lastState: any = null;
    let success = false;
    let error: any = null;

    try {
      await aiService.generate({
        prompt: p.prompt,
        onEvent: (event) => {
          lastState = event.state;
        }
      });
      success = true;
    } catch (e: any) {
      console.error(e);
      error = e;
      success = false;
    }
    
    results.push({
      name: p.name,
      success,
      error: error ? (error.stack || error.message || String(error)) : null,
      finalState: lastState
    });

    // Save intermediate results
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  }
  
  console.log("\nBenchmark complete. Results saved to benchmark_results.json");
}

runBenchmark().catch(console.error);
