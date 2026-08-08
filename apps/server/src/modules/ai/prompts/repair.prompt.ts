
import { buildArchitectureManifest } from "./manifest.utils.js";
import type { RepairContext } from "../repair/repair.types.js";

export const buildGateRepairPrompt = (
  gateName: string,
  context: RepairContext,
  escalationMessage?: string
): { system: string, prompt: string } => {

  const manifest = buildArchitectureManifest(context.architecture, context.contracts);
  const projectFilesContext = context.affectedFiles
    .map(f => `### ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``)
    .join("\n\n");
    
  const diagnosticSummary = context.diagnostics.map(d => 
    `- ${d.file ? `[${d.file}]` : ""} ${d.code}: ${d.message}`
  ).join("\n");

  const system = `You are an expert AI engineer acting as a localized Repair Engine.
Your task is to fix the errors by providing the corrected source code for any files that need modification.

Rules:
1. Fix ONLY the reported errors. Do not redesign the application.
2. Provide the COMPLETE file content for any file you modify. Do not provide partial snippets.
3. You are FORBIDDEN from modifying any file that was not provided in the "Affected Files" section. Only return modified files from the provided list.
4. STRICT FRAMEWORK BOUNDARY:
   - If Framework is 'vanilla' or 'vanilla-js', NEVER output React, JSX, Hooks, or Providers. Provide plain HTML, CSS, and JS.
   - If Framework is 'react-vite', NEVER provide vanilla DOM manipulation (e.g. document.getElementById) unless strictly necessary.
5. ARCHITECTURE IMMUTABILITY (CRITICAL):
   - You MUST treat the Architecture Manifest as the single, immutable source of truth.
   - Every repair must first resolve the affected canonical contracts from the manifest and repair code ONLY by conforming to those contracts.
   - You MUST NOT introduce new exports, rename existing symbols, invent APIs, relax required models, or create alternate implementations that diverge from the architecture.
   - If multiple files violate the same contract, you MUST reconcile all of them to the single canonical definition in the manifest, rather than repairing them independently.
   - Never assume an API exists if it is not explicitly declared in the manifest.
6. CONTRACT RESOLUTION (CRITICAL):
   - If a build error is caused by conflicting implementations of the same contract, you MUST identify the canonical definition from the Architecture Manifest and reconcile every affected file to that definition.
   - Never "meet in the middle" by modifying the canonical contract or creating a new alternative.
   - The Architecture Manifest always wins.
7. TYPESCRIPT SEMANTICS (CRITICAL):
   - You MUST distinguish between compile-time types and runtime values.
   - Interfaces and type aliases never exist at runtime.
   - React Contexts, Providers, Components, Hooks, Functions, Constants, Enums and Objects are runtime values.
   - Never replace a missing runtime symbol with a type alias or interface merely because their names are similar.
   - Before repairing an import or identifier, determine whether the usage position requires a runtime value or a compile-time type, and repair using the correct category only.
8. FUNCTION RECONCILIATION (CRITICAL):
   - When repairing function invocation errors:
   - resolve the canonical signature from the Architecture Manifest
   - update every caller to that signature
   - never modify the canonical function merely to satisfy one caller`;

  const prompt = `The project just failed the ${gateName} gate.

# Errors
${diagnosticSummary}

# Raw Output (for context)
${context.rawErrorOutput}

${escalationMessage ? `\n# CRITICAL ESCALATION\n${escalationMessage}\n` : ""}

# Architecture Context
Framework: ${context.framework}
Strategies: ${context.architecture.strategies.join(", ")}

${manifest}

# Affected Files (Read & Write Context)
You may ONLY provide replacements for these specific files:

${projectFilesContext}`;

  return { system, prompt };
};
