
import type { ProjectPlan } from "./planner.types.js";


export async function planProject(
  prompt: string,
): Promise<ProjectPlan> {
  const normalizedPrompt = prompt.toLowerCase();
    if (
    normalizedPrompt.includes("dashboard") ||
    normalizedPrompt.includes("react") ||
    normalizedPrompt.includes("admin")
  ) {
    return {
      framework: "react-ts",
      reasoning:
        "React was selected because the application requires a component-based user interface.",
    };
  }

  return {
    framework: "vanilla",
    reasoning:
      "A simple HTML, CSS and JavaScript application is sufficient for this project.",
  };
}