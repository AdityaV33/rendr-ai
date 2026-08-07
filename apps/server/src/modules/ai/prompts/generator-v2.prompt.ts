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

function appendFrameworkRules(prompt: string, framework: string): string {
  if (framework === "vanilla-js" || framework === "vanilla") {
    return prompt + `
Framework Rules (Vanilla JS):
- You MUST write plain HTML, CSS, and Vanilla JavaScript.
- NEVER use React, JSX, TSX, React Hooks, or Context.
- NEVER import 'react' or 'react-dom'.
- State Management MUST be centralized in the root composition file (e.g., \`main.js\` or \`index.js\`). Do not manage global state in individual components.
- Inter-Component Communication MUST use the PubSub pattern via CustomEvents on the \`window\` object (e.g., \`window.dispatchEvent(new CustomEvent('add-item', { detail: data }))\`).
- The root file MUST listen to these custom events, update its centralized state, and orchestrate UI updates by calling the render/update functions exported by the components.
- Components MUST NOT manage their own persistent state (like localStorage); they should only manage local UI state (like modal visibility) and dispatch events for global actions.
- \`index.html\` MUST provide the full application layout shell (navbars, headers, static buttons like 'Add Transaction', and empty containers for components). 
- DOM Container Naming Convention: Empty containers in \`index.html\` MUST use an ID matching their component name in lowercase with a \`-container\` suffix (e.g., \`SummaryCards.js\` -> \`<div id="summarycards-container"></div>\`). The root file MUST query these exact IDs.
- Static UI elements (like buttons) MUST use standardized IDs (e.g., \`add-transaction-btn\`). The root \`main.js\` MUST import ALL components (including modals), query these static IDs, and attach event listeners to open the modals.
- \`index.html\` MUST NOT contain hidden shells or overlays for modals. Modals and overlays MUST be fully generated by their JavaScript component using \`document.createElement\` and appended directly to \`document.body\`, managing their own visibility programmatically (e.g., via \`.remove()\`).
- Keep DOM manipulation clean and explicit.`;
  }
  return prompt + `
Framework Rules (React/TypeScript):
- If using Recharts, NEVER use custom typed formatter functions for Tooltip or Axis. You MUST type the formatter arguments as \`any\` to avoid complex TS2322 type mismatch errors (e.g. \`formatter={(value: any, name: any) => [value, name]}\`).`;
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
  
  if (fileName === "index.html") {
    prompt += `
Rules for index.html:
- MUST include the base DOM structure and container elements required by the JavaScript code (e.g., <div id="dashboard"></div>, modals, navbars).
- MUST import the main JavaScript entry point (e.g. <script type="module" src="/src/main.js"></script>).
- Do NOT just output an empty <div id="app"></div> if your JS code expects a more complex layout to exist.
`;
  }

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
  prompt = appendFrameworkRules(prompt, architecturePlan.stack.frontendFramework);

  prompt += `
Output raw source code for this file.`;

  const contractsSize = JSON.stringify(allContracts || {}).length;
  const behaviorSize = JSON.stringify(behavioralContract || {}).length;
  const frameworkRulesSize = appendFrameworkRules("", architecturePlan.stack.frontendFramework).length;
  const manifestSize = manifest.length;
  const estimatedTokens = Math.ceil((GENERATOR_V2_SYSTEM_PROMPT.length + prompt.length) / 4);

  console.log(`\n====================================\nGenerating ${file.path}\n====================================`);
  console.log(`Estimated Tokens: ~${estimatedTokens}`);
  console.log(`System Prompt: ${GENERATOR_V2_SYSTEM_PROMPT.length} chars`);
  console.log(`User Prompt: ${prompt.length} chars`);
  console.log(`Contracts JSON (Not all sent): ${contractsSize} chars`);
  console.log(`Behavior Rules (Injected): ${behaviorSize} chars`);
  console.log(`Closed-world Manifest (Injected): ${manifestSize} chars`);
  console.log(`Framework Rules (Injected): ${frameworkRulesSize} chars`);
  console.log(`Total (System + User): ${GENERATOR_V2_SYSTEM_PROMPT.length + prompt.length} chars\n====================================\n`);

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
  prompt = appendFrameworkRules(prompt, architecturePlan.stack.frontendFramework);

  prompt += `
Rules for App.tsx:
- Compose the components into a cohesive application.
- Manage top-level state if necessary.
- Import them correctly based on the paths provided.
- Do NOT implement complex UI logic here; delegate to the components.

Output raw source code for this file.`;

  const serializedProjectPlanSize = JSON.stringify(projectPlan || {}).length;
  const contractsSize = JSON.stringify(allContracts || {}).length;
  const behaviorSize = JSON.stringify(behavioralContract || {}).length;
  const frameworkRulesSize = appendFrameworkRules("", architecturePlan.stack.frontendFramework).length;
  const manifestSize = manifest.length;
  const estimatedTokens = Math.ceil((GENERATOR_V2_SYSTEM_PROMPT.length + prompt.length) / 4);

  console.log(`\n====================================\nGenerating ${file.path}\n====================================`);
  console.log(`Estimated Tokens: ~${estimatedTokens}`);
  console.log(`System Prompt: ${GENERATOR_V2_SYSTEM_PROMPT.length} chars`);
  console.log(`User Prompt: ${prompt.length} chars`);
  console.log(`Project Plan JSON: ${serializedProjectPlanSize} chars`);
  console.log(`Contracts JSON (Not all sent): ${contractsSize} chars`);
  console.log(`Behavior Rules (Injected): ${behaviorSize} chars`);
  console.log(`Closed-world Manifest (Injected): ${manifestSize} chars`);
  console.log(`Framework Rules (Injected): ${frameworkRulesSize} chars`);
  console.log(`Total (System + User): ${GENERATOR_V2_SYSTEM_PROMPT.length + prompt.length} chars\n====================================\n`);

  return { system: GENERATOR_V2_SYSTEM_PROMPT, prompt };
}
