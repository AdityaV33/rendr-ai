import type { ParsedDiagnostic } from "./repair.types.js";
import { runProcess } from "../../runtime/process.service.js";

const WHITELISTED_PACKAGES = new Set([
  "lucide-react",
  "recharts",
  "date-fns",
  "clsx",
  "zustand",
  "react-hook-form",
  "zod",
  "react-router-dom",
  "framer-motion",
  "tailwind-merge"
]);

const WHITELISTED_TYPES = new Set([
  "@types/node",
  "@types/react",
  "@types/react-dom"
]);

export class RuleEngine {
  /**
   * Attempts to deterministically fix infrastructure errors.
   * Returns true if a fix was applied and the gate should be re-run.
   */
  public static async attemptDeterministicFix(
    diagnostics: ParsedDiagnostic[],
    workspacePath: string
  ): Promise<boolean> {
    let fixedSomething = false;

    for (const diag of diagnostics) {
      if (diag.category !== "infrastructure") continue;

      if (diag.code === "TS2307" || diag.code === "VITE_RESOLVE" || diag.code === "NODE_RESOLVE") {
        // Cannot find module 'X'
        const match = diag.message.match(/Cannot find module '([^']+)'/i) || 
                      diag.message.match(/Missing import: ([^\s]+) in/i);
        if (match) {
          const pkg = match[1].split('/')[0]; // Extract base package name (e.g. lucide-react from lucide-react/icons)
          if (WHITELISTED_PACKAGES.has(pkg)) {
            console.log(`[RuleEngine] Deterministically installing whitelisted package: ${pkg}`);
            await runProcess("pnpm", ["add", pkg], { cwd: workspacePath });
            fixedSomething = true;
          } else {
            console.warn(`[RuleEngine] Package '${pkg}' is missing but NOT whitelisted. Skipping deterministic fix.`);
          }
        }
      }

      if (diag.code === "TS7016") {
        // Could not find a declaration file for module 'X'
        const match = diag.message.match(/module '([^']+)'/i);
        if (match) {
          const pkg = match[1];
          const typesPkg = `@types/${pkg}`;
          if (WHITELISTED_TYPES.has(typesPkg)) {
            console.log(`[RuleEngine] Deterministically installing whitelisted types: ${typesPkg}`);
            await runProcess("pnpm", ["add", "-D", typesPkg], { cwd: workspacePath });
            fixedSomething = true;
          } else {
            console.warn(`[RuleEngine] Types package '${typesPkg}' is missing but NOT whitelisted. Skipping deterministic fix.`);
          }
        }
      }
    }

    return fixedSomething;
  }
}
