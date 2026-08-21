import ts from "typescript";
import type { ComponentContract } from "../context/context-builder.types.js";

interface ParsedAST {
  exports: string[];
  imports: Array<{ name: string; path: string }>;
}

export class ContractGate {
  /**
   * Parse a raw source file into its imports and exports using the TS compiler API.
   */
  static parseCode(code: string, fileName: string = "temp.tsx"): ParsedAST {
    const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
    const exports = new Set<string>();
    const imports = new Set<{ name: string; path: string }>();

    ts.forEachChild(sourceFile, node => {
      // Check Imports
      if (ts.isImportDeclaration(node)) {
        if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return;
        const modulePath = node.moduleSpecifier.text;
        
        if (node.importClause) {
          if (node.importClause.name) {
            imports.add({ name: "default", path: modulePath });
          }
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const el of node.importClause.namedBindings.elements) {
                imports.add({ name: el.name.text, path: modulePath });
              }
            }
          }
        }
      }
      
      // Check Exports
      if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            exports.add(el.name.text);
          }
        }
      } else if (ts.isExportAssignment(node)) {
        // export default <expression>;
        exports.add("default");
        if (ts.isIdentifier(node.expression)) {
          exports.add(node.expression.text);
        }
      } else if ((node as any).modifiers && (node as any).modifiers.some((m: any) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isFunctionDeclaration(node) && node.name) {
          if ((node as any).modifiers.some((m: any) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
            exports.add("default");
            exports.add(node.name.text);
          } else {
            exports.add(node.name.text);
          }
        } else if (ts.isVariableStatement(node)) {
          for (const dec of node.declarationList.declarations) {
            if (ts.isIdentifier(dec.name)) {
              exports.add(dec.name.text);
            }
          }
        } else if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
          exports.add(node.name.text);
        } else if (ts.isClassDeclaration(node) && node.name) {
           if ((node as any).modifiers.some((m: any) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
            exports.add("default");
            exports.add(node.name.text);
          } else {
            exports.add(node.name.text);
          }
        }
      }
    });

    return { exports: Array.from(exports), imports: Array.from(imports) };
  }

  /**
   * Verifies the generated code against the Architect's component contracts.
   * Returns an array of violation messages, or an empty array if passing.
   */
  static verify(
    code: string,
    allContracts: Record<string, Omit<ComponentContract, "description">>,
    filePath: string,
    framework: string,
    strictExports: boolean = false
  ): string[] {
    // Only verify TS/JS/React files
    if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) {
      return [];
    }
    

    const violations: string[] = [];
    const ast = this.parseCode(code, filePath);

    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const currentContract = allContracts[baseName];

    // 1. Verify Provider Exports
    if (currentContract) {
      // Build the list of expected exports.
      const expectedExports = new Set<string>();
      if (currentContract.exports && currentContract.exports.length > 0) {
        currentContract.exports.forEach(e => {
          if (currentContract.exportType === "default" && e === baseName) {
            expectedExports.add("default");
          } else {
            expectedExports.add(e);
          }
        });
      } else {
        expectedExports.add(currentContract.exportType === "default" ? "default" : baseName);
      }

      // Check if all expected exports are present
      for (const expected of expectedExports) {
        if (!ast.exports.includes(expected)) {
          violations.push(`You were required to export '${expected}' but you failed to export it.`);
        }
      }

      if (strictExports) {
        const strictAllowedExports = new Set<string>(expectedExports);
        if (strictAllowedExports.has("default") && strictAllowedExports.size === 1) strictAllowedExports.add(baseName);
        if (strictAllowedExports.size === 1 && !strictAllowedExports.has("default")) strictAllowedExports.add("default");

        for (const exported of ast.exports) {
          if (!strictAllowedExports.has(exported)) {
            violations.push(`You exported '${exported}', but the Architect contract strictly limits exports to: [${Array.from(expectedExports).join(", ")}]. You may not add unauthorized exports during repair.`);
          }
        }
      }
    }

    // 2. Verify Consumer Imports (STRICT on unauthorized symbols)
    for (const imp of ast.imports) {
      // Only check relative local imports (starts with '.')
      if (!imp.path.startsWith(".")) continue;

      const importBaseName = imp.path.split('/').pop()!.replace(/\.[^/.]+$/, "");
      
      const targetContract = allContracts[importBaseName];
      if (!targetContract) continue;

      // Build target contract allowed exports
      const allowedExports = new Set<string>();
      if (targetContract.exports && targetContract.exports.length > 0) {
        targetContract.exports.forEach(e => allowedExports.add(e));
      } else {
        allowedExports.add(targetContract.exportType === "default" ? "default" : importBaseName);
      }

      // Check if the imported symbol is allowed
      if (!allowedExports.has(imp.name)) {
        // Equivalence check for default imports:
        // If they import default, and the target contract has exactly 1 public component export, allow it.
        if (imp.name === "default" && targetContract.exports && targetContract.exports.length === 1) {
          continue;
        }

        violations.push(`You imported '${imp.name}' from '${imp.path}'. However, the contract for '${importBaseName}' only exposes: [${Array.from(allowedExports).join(", ")}]. '${imp.name}' is NOT a permitted public export.`);
      }
    }

    return violations;
  }
}
