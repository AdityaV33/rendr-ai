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
- **CONTRACT COMPLIANCE (CRITICAL)**:
Before writing any code, reconstruct every function signature, prop interface, exported symbol, and context API from the Architect contracts.
You MUST NOT invent:
- function names
- prop names
- callback signatures
- context methods
- exported interfaces

- **Data Model & Signature Immutability (CRITICAL)**:
  You must treat exported data models (e.g., interfaces and types declared in the Architect's 'Public API') as IMMUTABLE CONTRACTS.
  Every object you create, pass, return, or render must match that definition EXACTLY.
  You MUST NOT:
  - invent additional properties
  - omit required properties
  - rename fields
  - change literal unions (e.g., using "Todo" when the model says "todo")
  - assume optional fields exist if they are not explicitly declared
  When calling imported APIs or passing props, you MUST strictly match the exact argument count, parameter types, and object shapes defined in the Architecture Manifest. If the required data is not part of the shared model, omit the feature rather than hallucinating new fields.
- **SEMANTIC CONTRACTS (CRITICAL)**:
  The Architecture Manifest defines not only the names of data models and APIs, but also their semantic meaning.
  This applies equally to:
  - model fields
  - enums
  - metrics
  - function signatures
  - workflow names
  - context actions
  You MUST NOT reinterpret the meaning of fields, enums, metrics, statuses, function parameters or workflows.
  Never substitute one declared field for another based on similar meaning.
  If the manifest declares "fromDate", never use "startDate".
  If the manifest declares "dateRange", never split it into startDate/endDate.
  Field names are immutable semantic contracts.
  Examples:
  - If a status represents enrollment ("Active" | "Inactive"), never treat it as academic performance ("Pass" | "Fail").
  - If a metric is not explicitly declared, never assume it exists.
  - If a field represents marks, attendance, dates or money, preserve its declared meaning throughout every computation.
  - Never derive new semantics from field names or user intent.
  Before implementing a workflow, resolve every referenced field, enum, metric and function from the Architecture Manifest and preserve their intended meaning exactly.
- **FUNCTION INVOCATION (CRITICAL)**:
  Never infer or guess the arguments of any exported function.
  Every invocation must exactly match the parameter count, order and types declared by the Architecture Manifest.
  If the manifest does not fully specify a function signature, you must not invent one.
- Do not invent helper interfaces or prop types if the Architect has already defined them. Always reuse the provided contract definitions.
- **CRITICAL**: Behavior Ownership and Rules are strict.
  - \`Responsibilities\`: You MUST strictly implement the explicit responsibilities assigned to this file in the manifest. Do not invent logic that belongs to another file.
  - \`Behavior Rules\`: You MUST strictly implement the interactions and expected state mutations mapped in the Behavior Rules.
- Assume all imported dependencies and components exist.
- **MVP Philosophy**: Generate a clean, minimal, functional MVP that completely satisfies the user's requested functionality while maximizing the probability of a successful first generation.
- Keep the implementation as simple as possible. Avoid unnecessary complexity.
- Favor reliability over cleverness.
- Generate the minimum code necessary to deliver the requested functionality.
- Prefer composition over abstraction.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
- **DOM CONTAINERS ARE DIVS**: Your component MUST assume its target container in \`index.html\` is a standard \`<div>\`. If you need a \`<canvas>\` (for Chart.js) or \`<form>\`, you MUST create it dynamically (\`document.createElement\`) and append it inside the \`<div>\` container.
- Static UI elements (like buttons) MUST use standardized IDs (e.g., \`add-transaction-btn\`). The root \`main.js\` MUST import ALL components (including modals), query these static IDs, and attach event listeners to open the modals.
- \`index.html\` MUST NOT contain hidden shells or overlays for modals. Modals and overlays MUST be fully generated by their JavaScript component using \`document.createElement\` and appended directly to \`document.body\`, managing their own visibility programmatically (e.g., via \`.remove()\`).
- Keep DOM manipulation clean and explicit.
- **5-STEP MUTATION LIFECYCLE**: After EVERY state mutation, you MUST immediately: 1. Update in-memory state. 2. Persist to \`localStorage\`. 3. Re-render affected UI (tables/lists). 4. Recompute summary cards. 5. Recompute charts. This enforces a predictable data flow.
- **PASS RAW STATE ONLY**: Your component's render function will receive the raw global state (e.g., the array of transactions or inventory items). You MUST perform any derived calculations (like summing totals) inside the component itself. Do NOT expect the root file to pass pre-calculated metrics.
- **CHARTING**: You MUST use Chart.js for all charts. Do not choose another library. Do not create custom Canvas/SVG charts.
- **REPAIR RULE**: Do NOT solve missing business logic by removing the feature. If a chart or CRUD operation is broken, you MUST repair the implementation (e.g., fix the state, fix the rendering). Do not just delete the broken feature.`;
  }
  return prompt + `
Framework Rules (React/TypeScript):
- NEVER use or import 'uuid' for client-side React applications. You MUST use the native 'crypto.randomUUID()' for generating unique IDs.
- **Single-Page Application & Feature Completeness (CRITICAL)**:
  Every generated application must be implemented as a single-page React application.
  All requested workflows, data, and interactions must exist within one cohesive, responsive interface.
  Complexity must be organized through reusable components, sections, cards, dialogs, drawers, tabs, accordions, and conditional rendering rather than multiple pages or routing.
  Every interactive element visible on the page must be fully implemented, connected to shared application state, and function exactly as its interface suggests.
  No button, form, search bar, filter, chart, KPI, table, modal, or workflow may appear unless it is completely operational.
  Never generate placeholder features, disabled interactions, incomplete workflows, or partially implemented UI.
  If a feature is present, it must be production-ready and fully functional; otherwise, it must not appear at all.
  The generated application should feel like a complete finished product rather than a prototype or work in progress.

- **State Synchronization Rule (CRITICAL)**:
  All visible information in the application must derive from the same shared source of truth.
  Creating, updating or deleting data must automatically update every affected component, including tables, charts, KPI cards, statistics, search results and filtered views.
  Never hardcode values after shared application state exists.

- **KPI CARDS (CRITICAL)**:
  KPI cards must display values computed from the application's current shared state.
  Never display placeholder values, static labels (e.g. "Calculated", "Dynamic", "Computed"), TODOs, or hardcoded examples.
  Every KPI requested by the architecture must have a deterministic computation derived from the canonical data model.
  Examples:
  - Total Products = products.length
  - Total Revenue = sum(order.total)
  - Completed Tasks = tasks where status === "Completed"
  - Largest Expense = max(expense.amount)
  - Win Rate = wonDeals / totalDeals
  - Low Stock = products where quantity <= lowStockThreshold
  If a requested KPI cannot be computed from the canonical shared model, do not invent a value. Instead, you must omit that KPI entirely.
- Generation Priority Budget:
  Priority 0 (Build Correctness - Mandatory): The generated application must compile successfully on the first attempt whenever possible. Never invent APIs, context methods, prop names, callback signatures, or exported interfaces that are not defined by the Architect. If a feature cannot be implemented using the provided contracts, omit that feature instead of inventing a new implementation.
  Priority 1 (Functional Workflows - Mandatory): Every feature that appears in the generated UI must actually work (e.g., add buttons create records, edit buttons update records, search filters visible data, forms validate inputs, lists display actual stored data). Never generate placeholder UI for an advertised feature.
  Priority 2 (Data Consistency - Mandatory): Every visible component must use the same shared application state. Do not hardcode demo values once state exists. (e.g., customer names in tables must come from state, KPI cards must update after CRUD actions, charts must derive values from the same state as KPIs). If a chart cannot display real application data, omit the chart instead of rendering an empty or fake visualization.
  Priority 3 (Dashboard Quality): Generate a clean SaaS dashboard using a Header, KPI cards, Toolbar, Table/List, and ONE simple chart (optional if real data cannot support it). Prefer simple layouts over complex dashboards.
  Priority 4 (Visual Polish): Apply consistent spacing, rounded cards, Lucide icons, subtle shadows, responsive Tailwind, typography hierarchy. Do not sacrifice Priority 0-3 for additional polish.
  Priority 5 (Optional Features): Only implement these if budget remains (secondary charts, activity feeds, advanced analytics, decorative widgets, animations). These should always be dropped before reducing functionality.`;
}

export function buildFilePrompt(
  file: ArchitecturePlan["fileStructure"][0],
  architecturePlan: ArchitecturePlan,
  allContracts: Record<string, Omit<ComponentContract, "description">>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
