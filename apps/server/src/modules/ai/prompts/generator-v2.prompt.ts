import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import type { ComponentContract } from "../context/context-builder.types.js";
import { buildArchitectureManifest } from "./manifest.utils.js";

const GENERATOR_V2_SYSTEM_PROMPT = `You are a Staff Software Engineer.
Your task is to generate the exact source code for a single file.

You operate in a strictly closed-world architecture.
You will be provided with an "Available Architecture" manifest.
You may ONLY reference:
- files explicitly listed in the Architecture Manifest
- standard library imports
- npm packages explicitly declared by the template

Never invent:
- components
- contexts
- hooks
- stores
- utilities
- types
- providers
- helper files

If functionality appears to require another file that does not exist in the Architecture Manifest, solve the problem inside the current file instead or omit the feature.

Rules:
- Generate ONLY the requested file.
- Output raw source code. Do NOT wrap it in JSON.
- Do NOT output markdown explanations.
- Follow the exact exports and props defined in the contract (if provided).
- **CRITICAL**: Behavior Ownership and Rules are strict.
  - \`Responsibilities\`: You MUST strictly implement the explicit responsibilities assigned to this file in the manifest. Do not invent logic that belongs to another file.
  - \`Behavior Rules\`: You MUST strictly implement the interactions and expected state mutations mapped in the Behavior Rules.
- Assume all imported dependencies and components exist.
- **MVP Philosophy**: Generate a clean, minimal, functional MVP that completely satisfies the user's requested functionality while maximizing the probability of a successful first generation.
- Keep the implementation as simple as possible. Avoid unnecessary complexity.
- Favor reliability over cleverness.
- Generate the minimum code necessary to deliver the requested functionality.
- Prefer composition over abstraction.`;

function appendBehaviorContext(prompt: string, contract: any): string {
  if (!contract) return prompt;
  
  let updatedPrompt = prompt;

  const responsibilities = contract.responsibilities;
  if (responsibilities && responsibilities.length > 0) {
    updatedPrompt += `\nResponsibilities (you MUST implement ALL of these):\n`;
    for (const r of responsibilities) {
      updatedPrompt += `- ${r}\n`;
    }
  }

  const behaviorRules = contract.behaviorRules;
  if (behaviorRules && behaviorRules.length > 0) {
    updatedPrompt += `\nBehavior Rules (you MUST implement ALL of these interactions):\n`;
    for (const rule of behaviorRules) {
      updatedPrompt += `- Trigger: ${rule.trigger}\n`;
      if (rule.preconditions && rule.preconditions.length > 0) {
        updatedPrompt += `  Preconditions: ${rule.preconditions.join(", ")}\n`;
      }
      updatedPrompt += `  Action: ${rule.action}\n`;
      if (rule.assertions && rule.assertions.length > 0) {
        updatedPrompt += `  Assertions: ${rule.assertions.join(", ")}\n`;
      }
    }
  }

  const acceptanceCriteria = contract.acceptanceCriteria;
  if (acceptanceCriteria && acceptanceCriteria.length > 0) {
    updatedPrompt += `\nAcceptance Criteria (what "finished" means for this file):\n`;
    for (const criteria of acceptanceCriteria) {
      updatedPrompt += `- ${criteria}\n`;
    }
  }

  return updatedPrompt;
}

export function buildFilePrompt(
  file: ArchitecturePlan["fileStructure"][0],
  architecturePlan: ArchitecturePlan,
  allContracts: Record<string, Omit<ComponentContract, "description">>,
  behavioralContract?: any
): { system: string; prompt: string } {
  const manifest = buildArchitectureManifest(architecturePlan, allContracts);

  let prompt = `You are generating: ${file.path}

Application Framework: ${architecturePlan.stack.frontendFramework}
Strategies: ${architecturePlan.strategies.join(", ")}

${manifest}

Current File:
${file.path}

Purpose:
${file.purpose}
`;

  // Find if this file has a contract
  const parts = file.path.split('/');
  const fileName = parts[parts.length - 1];
  const name = fileName.replace(/\.[^/.]+$/, "");

  if (allContracts[name]) {
    const c = allContracts[name];
    const exportsList = c.exports && c.exports.length > 0
      ? c.exports.join(", ")
      : (c.exportType === "default" ? name : name);
    prompt += `
Contract:
- Export Type: ${c.exportType}
- Exports: ${exportsList}
- Props: ${c.props.length > 0 ? c.props.map(p => p.name + (p.required ? "" : "?") + ": " + p.type).join(", ") : "None"}

You MUST export exactly these symbols: ${exportsList}. Do not rename or add additional exports.
`;
  }

  if (file.allowedImports && file.allowedImports.length > 0) {
    prompt += `
Allowed Imports:
${file.allowedImports.join(", ")}

Ensure that you import from the exact paths specified in the Architecture Manifest for these allowed imports.

Forbidden:
Any other local imports not listed in Allowed Imports.
`;
  }

  prompt = appendBehaviorContext(prompt, behavioralContract);

  prompt += `
Output raw source code for this file.`;

  return { system: GENERATOR_V2_SYSTEM_PROMPT, prompt };
}

export function buildAppPrompt(
  file: ArchitecturePlan["fileStructure"][0],
  projectPlan: ProjectPlan,
  architecturePlan: ArchitecturePlan,
  allContracts: Record<string, Omit<ComponentContract, "description">>,
  behavioralContract?: any
): { system: string; prompt: string } {
  const manifest = buildArchitectureManifest(architecturePlan, allContracts);

  let prompt = `You are generating the root composition file: ${file.path}

Application Framework: ${architecturePlan.stack.frontendFramework}
Strategies: ${architecturePlan.strategies.join(", ")}

${manifest}

Current File:
${file.path}

Purpose:
Compose the application by importing necessary pages and components. Manage their shared state, wire callbacks, and structure the layout.
${file.purpose}
`;

  // Find if this file has a contract (e.g. if App.tsx somehow exports something specific)
  const parts = file.path.split('/');
  const fileName = parts[parts.length - 1];
  const name = fileName.replace(/\.[^/.]+$/, "");
  
  if (allContracts[name]) {
    const c = allContracts[name];
    const exportsList = c.exports && c.exports.length > 0
      ? c.exports.join(", ")
      : (c.exportType === "default" ? name : name);
    prompt += `
Contract:
- Export Type: ${c.exportType}
- Exports: ${exportsList}
- Props: ${c.props.length > 0 ? c.props.map(p => p.name + (p.required ? "" : "?") + ": " + p.type).join(", ") : "None"}

You MUST export exactly these symbols: ${exportsList}. Do not rename or add additional exports.
`;
  }

  if (architecturePlan.strategies.some(s => s.toLowerCase().includes("router")) || projectPlan.pages?.length > 0) {
    const pages = projectPlan.pages || [];
    if (pages.length > 0) {
      prompt += `\nRoutes:\n`;
      for (const page of pages) {
        prompt += `- ${page.route} → ${page.name}\n`;
      }
    }
  }

  prompt = appendBehaviorContext(prompt, behavioralContract);

  prompt += `
Rules for App.tsx:
- Compose the components into a cohesive application.
- Manage top-level state if necessary.
- Import them correctly based on the paths provided.
- Do NOT implement complex UI logic here; delegate to the components.

Output raw source code for this file.`;

  return { system: GENERATOR_V2_SYSTEM_PROMPT, prompt };
}
