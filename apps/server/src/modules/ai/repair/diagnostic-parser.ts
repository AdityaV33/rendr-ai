import type { ParsedDiagnostic } from "./repair.types.js";

export class DiagnosticParser {
  public static parse(output: string): ParsedDiagnostic[] {
    const diagnostics: ParsedDiagnostic[] = [];
    // eslint-disable-next-line no-control-regex
    const cleanOutput = output.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    const lines = cleanOutput.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Try to parse tsc error: src/file.ts(1,2): error TS1234: Message
      const tscMatch = line.match(/^([a-zA-Z0-9_./-]+)(?:\((\d+),(\d+)\))?:\s*(error|warning)\s*(TS\d+)?:\s*(.*)$/);
      
      if (tscMatch) {
        const [, file, lineNum, colNum, severity, code, message] = tscMatch;
        if (severity === 'error') {
          const fullMessage = this.extractMultilineMessage(lines, i, message);
          diagnostics.push({
            tool: "tsc",
            category: this.categorizeTscError(code || "", fullMessage),
            code: code || "UNKNOWN",
            file: file,
            line: lineNum ? parseInt(lineNum, 10) : undefined,
            column: colNum ? parseInt(colNum, 10) : undefined,
            message: fullMessage.trim()
          });
        }
        continue;
      }

      // Try to parse Vite resolution error: [vite] failed to resolve import "uuid" from "src/main.js". Does the file exist?
      const viteResolveMatch = line.match(/failed to resolve import "([^"]+)" from "([^"]+)"/i);
      if (viteResolveMatch) {
        diagnostics.push({
          tool: "vite",
          category: "infrastructure", // Missing dependency
          code: "VITE_RESOLVE",
          file: viteResolveMatch[2],
          message: `Missing import: ${viteResolveMatch[1]} in ${viteResolveMatch[2]}`
        });
        continue;
      }
      
      // Parse Node module not found runtime error
      const nodeResolveMatch = line.match(/Error: Cannot find module '([^']+)'/i);
      if (nodeResolveMatch) {
         diagnostics.push({
          tool: "unknown",
          category: "infrastructure",
          code: "NODE_RESOLVE",
          message: `Cannot find module: ${nodeResolveMatch[1]}`
        });
      }
    }

    return diagnostics;
  }

  private static extractMultilineMessage(lines: string[], startIndex: number, initialMessage: string): string {
    let message = initialMessage;
    // Basic lookahead to append subsequent indented lines as part of the message
    for (let j = startIndex + 1; j < lines.length; j++) {
      if (lines[j].startsWith('  ')) {
        message += '\n' + lines[j];
      } else {
        break;
      }
    }
    return message;
  }

  private static categorizeTscError(code: string, _message: string): ParsedDiagnostic["category"] {
    // Infrastructure / Dependency missing
    if (code === "TS2307" || code === "TS7016") return "infrastructure";
    
    // Contract / Import-Export mismatch
    if (code === "TS2339" || code === "TS2305" || code === "TS2304") return "contract";
    
    // Logic / Type mismatch
    if (code === "TS2322" || code === "TS2531" || code === "TS2554" || code === "TS2769") return "localized_logic";

    return "unknown";
  }
}
