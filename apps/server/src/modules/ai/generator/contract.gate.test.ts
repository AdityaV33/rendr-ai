import { describe, it, expect } from "vitest";
import { ContractGate } from "./contract.gate.js";
import { sanitizeDependencyVersion } from "./generator-v2.service.js";

describe("ContractGate - AST Parser & Strict Export Enforcement", () => {
  const baseContract = {
    MyButton: {
      name: "MyButton",
      importPath: "./components/MyButton",
      exportType: "named" as const,
      exports: ["MyButton"],
      props: []
    }
  };

  describe("parseCode AST detection", () => {
    it("correctly identifies export interface as type-only", () => {
      const code = `
        export interface ButtonProps {
          label: string;
        }
        export const MyButton = () => <button />;
      `;
      const ast = ContractGate.parseCode(code, "MyButton.tsx");
      expect(ast.exports).toContain("ButtonProps");
      expect(ast.exports).toContain("MyButton");
      expect(ast.typeOnlyExports.has("ButtonProps")).toBe(true);
      expect(ast.typeOnlyExports.has("MyButton")).toBe(false);
    });

    it("correctly identifies export type alias as type-only", () => {
      const code = `
        export type ButtonVariant = "primary" | "secondary";
        export const MyButton = () => <button />;
      `;
      const ast = ContractGate.parseCode(code, "MyButton.tsx");
      expect(ast.exports).toContain("ButtonVariant");
      expect(ast.exports).toContain("MyButton");
      expect(ast.typeOnlyExports.has("ButtonVariant")).toBe(true);
      expect(ast.typeOnlyExports.has("MyButton")).toBe(false);
    });

    it("correctly identifies export type { Foo } and export { type Bar } as type-only", () => {
      const code = `
        type Foo = string;
        type Bar = number;
        const Baz = 42;
        export type { Foo };
        export { type Bar, Baz };
      `;
      const ast = ContractGate.parseCode(code, "types.ts");
      expect(ast.exports).toEqual(expect.arrayContaining(["Foo", "Bar", "Baz"]));
      expect(ast.typeOnlyExports.has("Foo")).toBe(true);
      expect(ast.typeOnlyExports.has("Bar")).toBe(true);
      expect(ast.typeOnlyExports.has("Baz")).toBe(false);
    });

    it("does not mark runtime functions, classes, or consts as type-only", () => {
      const code = `
        export function helper() { return 1; }
        export const CONSTANT = 10;
        export class Service {}
      `;
      const ast = ContractGate.parseCode(code, "utils.ts");
      expect(ast.typeOnlyExports.has("helper")).toBe(false);
      expect(ast.typeOnlyExports.has("CONSTANT")).toBe(false);
      expect(ast.typeOnlyExports.has("Service")).toBe(false);
    });
  });

  describe("strictExports verification", () => {
    it("allows a required component export plus an additional exported interface", () => {
      const code = `
        export interface MyButtonProps {
          label: string;
        }
        export const MyButton = () => <button />;
      `;
      const violations = ContractGate.verify(code, baseContract, "src/components/MyButton.tsx", "react-vite", true);
      expect(violations).toHaveLength(0);
    });

    it("allows a required component export plus an additional exported type alias", () => {
      const code = `
        export type MyButtonVariant = "outline" | "solid";
        export const MyButton = () => <button />;
      `;
      const violations = ContractGate.verify(code, baseContract, "src/components/MyButton.tsx", "react-vite", true);
      expect(violations).toHaveLength(0);
    });

    it("allows export { type Props } with specifier-level type modifier", () => {
      const code = `
        interface Props { label: string; }
        export { type Props };
        export const MyButton = () => <button />;
      `;
      const violations = ContractGate.verify(code, baseContract, "src/components/MyButton.tsx", "react-vite", true);
      expect(violations).toHaveLength(0);
    });

    it("rejects an unauthorized runtime function export during strict repair", () => {
      const code = `
        export const MyButton = () => <button />;
        export function unauthorizedHelper() { return "fail"; }
      `;
      const violations = ContractGate.verify(code, baseContract, "src/components/MyButton.tsx", "react-vite", true);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.includes("unauthorizedHelper"))).toBe(true);
      expect(violations.some(v => v.includes("strictly limits exports"))).toBe(true);
    });

    it("rejects an unauthorized runtime constant export during strict repair", () => {
      const code = `
        export const MyButton = () => <button />;
        export const EXTRA_VALUE = 42;
      `;
      const violations = ContractGate.verify(code, baseContract, "src/components/MyButton.tsx", "react-vite", true);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.includes("EXTRA_VALUE"))).toBe(true);
      expect(violations.some(v => v.includes("strictly limits exports"))).toBe(true);
    });

    it("still rejects when the required export is completely missing", () => {
      const code = `
        export interface MyButtonProps { label: string; }
        export const WrongName = () => <button />;
      `;
      const violations = ContractGate.verify(code, baseContract, "src/components/MyButton.tsx", "react-vite", true);
      expect(violations.some(v => v.includes("required to export 'MyButton'"))).toBe(true);
    });

    it("still rejects unauthorized consumer imports", () => {
      const code = `
        import { NonExistentSymbol } from "./MyButton";
        export const Consumer = () => <div />;
      `;
      const violations = ContractGate.verify(code, baseContract, "src/components/Consumer.tsx", "react-vite", false);
      expect(violations.some(v => v.includes("'NonExistentSymbol' is NOT a permitted public export"))).toBe(true);
    });
  });
});

describe("Dependency Sanitization (React 19 Compatibility)", () => {
  it("overrides incompatible lucide-react versions (< 0.471.0) with ^1.0.0", () => {
    expect(sanitizeDependencyVersion("lucide-react", "^0.344.0")).toBe("^1.0.0");
    expect(sanitizeDependencyVersion("lucide-react", "^0.468.0")).toBe("^1.0.0");
    expect(sanitizeDependencyVersion("lucide-react", undefined)).toBe("^1.0.0");
  });

  it("preserves valid Architect lucide-react versions (>= 0.471.0 or ^1.0.0)", () => {
    expect(sanitizeDependencyVersion("lucide-react", "^0.471.0")).toBe("^0.471.0");
    expect(sanitizeDependencyVersion("lucide-react", "^0.500.0")).toBe("^0.500.0");
    expect(sanitizeDependencyVersion("lucide-react", "^1.0.0")).toBe("^1.0.0");
    expect(sanitizeDependencyVersion("lucide-react", "latest")).toBe("latest");
  });

  it("preserves Architect version choices for react-router-dom and framer-motion", () => {
    expect(sanitizeDependencyVersion("react-router-dom", "^6.28.0")).toBe("^6.28.0");
    expect(sanitizeDependencyVersion("react-router-dom", "^7.0.0")).toBe("^7.0.0");
    expect(sanitizeDependencyVersion("framer-motion", "^11.15.0")).toBe("^11.15.0");
    expect(sanitizeDependencyVersion("framer-motion", "^12.0.0")).toBe("^12.0.0");
  });

  it("preserves other arbitrary dependencies as planned by Architect", () => {
    expect(sanitizeDependencyVersion("zustand", "^5.0.0")).toBe("^5.0.0");
    expect(sanitizeDependencyVersion("axios", "^1.7.0")).toBe("^1.7.0");
    expect(sanitizeDependencyVersion("some-pkg", undefined)).toBe("latest");
  });
});
