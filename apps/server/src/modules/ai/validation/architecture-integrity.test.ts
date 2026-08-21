import { describe, it, expect } from "vitest";
import { architecturePlanSchema } from "../schemas/architecture-plan.schema.js";

describe("Architecture Integrity Gate", () => {
  const getValidBasePlan = () => ({
    stack: { language: "TypeScript", frontendFramework: "react-vite", buildTool: "Vite", packageManager: "npm" },
    strategies: [],
    dependencies: [],
    fileStructure: [
      { path: "src/context", purpose: "dir", type: "directory" },
      { path: "src/context/events.ts", purpose: "file", type: "file" }
    ],
    componentContracts: [
      { name: "EventsContext", importPath: "src/context/events.ts", exportType: "named", exports: ["EventsContext"], props: [] }
    ],
    behavioralContracts: [
      { file: "src/context/events.ts", responsibilities: ["foo"], behaviorRules: [], acceptanceCriteria: [] }
    ]
  });

  it("should pass a valid architecture plan", () => {
    const plan = getValidBasePlan();
    const result = architecturePlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  it("should fail if there is a file/directory collision (EEXIST bug)", () => {
    const plan = getValidBasePlan();
    plan.fileStructure = [
      { path: "src/context", purpose: "file instead of dir", type: "file" },
      { path: "src/context/events.ts", purpose: "file", type: "file" }
    ];
    
    const result = architecturePlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("File/Directory collision detected");
    }
  });

  it("should fail if there are duplicate paths", () => {
    const plan = getValidBasePlan();
    plan.fileStructure = [
      { path: "src/context/events.ts", purpose: "file", type: "file" },
      { path: "src/context/events.ts", purpose: "file duplicate", type: "file" }
    ];
    
    const result = architecturePlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Duplicate path found");
    }
  });

  it("should fail if there is an orphaned component contract", () => {
    const plan = getValidBasePlan();
    plan.componentContracts[0].importPath = "src/does-not-exist.ts";
    
    const result = architecturePlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Orphaned component contract");
    }
  });

  it("should fail if there are duplicate component names", () => {
    const plan = getValidBasePlan();
    plan.componentContracts.push({
      name: "EventsContext", importPath: "src/context/events.ts", exportType: "named", exports: ["Duplicate"], props: []
    });
    
    const result = architecturePlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Duplicate component name");
    }
  });

  it("should fail if there is an orphaned behavioral contract", () => {
    const plan = getValidBasePlan();
    plan.behavioralContracts[0].file = "src/fake.ts";
    
    const result = architecturePlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Orphaned behavioral contract");
    }
  });
});
