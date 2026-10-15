
import { buildArchitectureManifest } from "./manifest.utils.js";
import type { RepairContext } from "../repair/repair.types.js";

export const buildGateRepairPrompt = (
  gateName: string,
  context: RepairContext,
  escalationMessage?: string
): { system: string, prompt: string } => {

  const manifest = buildArchitectureManifest(context.architecture, context.contracts);
  const editableFilesContext = context.editableFiles
    .map(f => `### ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``)
    .join("\n\n");
    
  const readonlyFilesContext = context.contextOnlyFiles.length > 0 
    ? `\n# Read-Only Context Files\nThe following files are provided for context only. You MAY NOT modify these files:\n\n` + 
      context.contextOnlyFiles.map(f => `### ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``).join("\n\n")
    : "";
    
  const diagnosticSummary = context.diagnostics.map(d => 
    `- ${d.file ? `[${d.file}]` : ""} ${d.code}: ${d.message}`
  ).join("\n");

  const system = `You are an expert AI engineer acting as a localized Repair Engine.
Your task is to fix the errors by providing the corrected source code for any files that need modification.

Rules:
1. Fix ONLY the reported errors. Do not redesign the application.
2. Provide the COMPLETE file content for any file you modify. Do not provide partial snippets.
3. You are FORBIDDEN from modifying any file that was not provided in the "Editable Files" section. Only return modified files from the "Editable Files" list. Do not modify "Read-Only Context Files".
4. STRICT FRAMEWORK BOUNDARY:
   - NEVER provide vanilla DOM manipulation (e.g. document.getElementById) unless strictly necessary.
5. ARCHITECTURE IMMUTABILITY (CRITICAL):
   - You MUST treat the Architecture Manifest as the single, immutable source of truth.
   - Every repair must first resolve the affected canonical contracts from the manifest and repair code ONLY by conforming to those contracts.
   - You MUST NOT introduce new exports, rename existing symbols, invent APIs, relax required models, or create alternate implementations that diverge from the architecture.
   - If a consumer imports an unauthorized symbol, you MUST fix the consumer. DO NOT modify the provider to export new symbols to make the compiler error disappear.
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
   - never modify the canonical function merely to satisfy one caller
9. SYNTAX AND CLOSURES (CRITICAL):
   - If the error is a TypeScript syntax error (e.g., TS1005, TS1109, TS1128, TS1161, TS1136), carefully scan the provided file for unmatched brackets \`}\`, missing closing parenthesis \`)\`, missing closing JSX tags \`</...>\`, missing commas, or unfinished statements.
   - Rewrite the entire file with the syntax error corrected. Do not just return the same broken file.
   - Ensure all arrow functions have proper closures and no regular expressions are unterminated.`;

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

# Editable Files
You may ONLY provide replacements for these specific files:

${editableFilesContext}
${readonlyFilesContext}`;

  return { system, prompt };
};
