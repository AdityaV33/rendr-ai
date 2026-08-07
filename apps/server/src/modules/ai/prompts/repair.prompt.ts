import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { ComponentContract } from "../context/context-builder.types.js";
import { buildArchitectureManifest } from "./manifest.utils.js";

export const buildGateRepairPrompt = (
  gateName: string,
  errors: string,
  architecturePlan: ArchitecturePlan,
  allContracts: Record<string, Omit<ComponentContract, "description">>,
  allGeneratedFiles: { path: string; content: string }[],
  escalationMessage?: string
): { system: string, prompt: string } => {

  const manifest = buildArchitectureManifest(architecturePlan, allContracts);
  const projectFilesContext = allGeneratedFiles
    .filter(f => f.path.startsWith("src/") || f.path === "package.json" || f.path.includes("config"))
    .map(f => `### ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``)
    .join("\n\n");

  const system = `You are an expert AI engineer acting as a localized Repair Engine.
Your task is to fix the errors by providing the corrected source code for any files that need modification.

Rules:
1. Fix ONLY the reported errors. Do not redesign the application.
2. Provide the COMPLETE file content for any file you modify. Do not provide partial snippets.
3. Only return the files that actually need changes.`;

  const prompt = `The project just failed the ${gateName} gate.

# Errors
${errors}
${escalationMessage ? `\n# CRITICAL ESCALATION\n${escalationMessage}\n` : ""}

# Architecture Context
Framework: ${architecturePlan.stack.frontendFramework}
Strategies: ${architecturePlan.strategies.join(", ")}

${manifest}

# Full Project Source Code (Read-Only Context)
${projectFilesContext}`;

  return { system, prompt };
};
