import type { ContextBuilderOptions, GeneratorContext, ApplicationSummary, CompositionTarget, ComponentContract } from "./context-builder.types.js";
import type { ProjectPlan } from "../types/project-plan.types.js";

type Responsibility = "root" | "page" | "component" | "store" | "utility" | "config";

const STOP_WORDS = new Set([
  "application", "app", "component", "page", "layout", "routing", "route", "main", "root",
  "implementation", "feature", "ui", "state", "store", "utils", "config",
  "the", "and", "that", "this", "with", "for", "from", "user", "data"
]);

export class ContextBuilderService {
  /**
   * Main entrypoint for building AI agent context.
   * Designed to be a generic API supporting multiple agents.
   */
  public buildContext(options: ContextBuilderOptions): GeneratorContext {
    switch (options.agent) {
      case "generator":
        return this.buildGeneratorContext(options);
      default:
        // Fallback for future agents to use the generator context structure for now
        return this.buildGeneratorContext(options);
    }
  }

  private determineResponsibility(path: string): Responsibility {
    const lower = path.toLowerCase();
    if (lower.includes("app.tsx") || lower.includes("main.tsx") || lower.includes("index.html")) return "root";
    if (lower.includes("pages/") || lower.includes("views/") || lower.includes("routes/")) return "page";
    if (lower.includes("components/") || lower.includes("layouts/")) return "component";
    if (lower.includes("store/") || lower.includes("stores/") || lower.includes("state/")) return "store";
    if (lower.includes("utils/") || lower.includes("hooks/") || lower.includes("types/") || lower.includes("lib/")) return "utility";
    if (lower.endsWith(".config.js") || lower.endsWith(".config.ts") || lower.endsWith(".json")) return "config";
    return "utility"; // fallback
  }

  private getMeaningfulKeywords(text: string): string[] {
    return text.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(k => k.length > 2 && !STOP_WORDS.has(k));
  }

  private buildGeneratorContext(options: ContextBuilderOptions): GeneratorContext {
    const { projectPlan, architecturePlan, currentBatch } = options;
    const batchFiles = currentBatch?.files || [];

    const applicationSummary: ApplicationSummary = {
      applicationType: projectPlan.applicationType,
      purpose: projectPlan.purpose,
      theme: projectPlan.theme,
      stack: architecturePlan.stack,
      strategies: architecturePlan.strategies,
    };

    // Use Sets to deduplicate across the batch
    const relevantFeaturesSet = new Set<string>();
    const relevantPagesSet = new Set<ProjectPlan["pages"][0]>();
    const relevantComponentsSet = new Set<ProjectPlan["components"][0]>();

    for (const file of batchFiles) {
      const resp = this.determineResponsibility(file.path);
      const fileKeywords = this.getMeaningfulKeywords(`${file.path} ${file.purpose}`);
      
      const isSemanticallyRelated = (name: string, desc: string) => {
        const itemKeywords = this.getMeaningfulKeywords(`${name} ${desc}`);
        return itemKeywords.some(k => fileKeywords.includes(k));
      };

      if (resp === "root") {
        // Root only composes. No features, component implementations, or stores.
        continue; 
      }

      if (resp === "page") {
        // Page gets its own related features and components
        projectPlan.features.forEach(f => { if (isSemanticallyRelated(f, "")) relevantFeaturesSet.add(f); });
        projectPlan.pages.forEach(p => { if (isSemanticallyRelated(p.name, p.description)) relevantPagesSet.add(p); });
        projectPlan.components.forEach(c => { if (isSemanticallyRelated(c.name, c.description)) relevantComponentsSet.add(c); });
      }

      if (resp === "component") {
        // Component gets its own features and components, but NOT pages.
        projectPlan.features.forEach(f => { if (isSemanticallyRelated(f, "")) relevantFeaturesSet.add(f); });
        projectPlan.components.forEach(c => { if (isSemanticallyRelated(c.name, c.description)) relevantComponentsSet.add(c); });
      }

      if (resp === "store") {
        // Store gets state-related features only
        projectPlan.features.forEach(f => { if (isSemanticallyRelated(f, "")) relevantFeaturesSet.add(f); });
      }

      // utility and config get empty sets (they only need application summary and architecture notes)
    }

    const architectureNotes = architecturePlan.metadata?.notes as string | undefined;
    const batchResponsibilities = Array.from(new Set(batchFiles.map(f => this.determineResponsibility(f.path))));

    let compositionTargets: CompositionTarget[] | undefined;
    let componentContracts: Record<string, Omit<ComponentContract, "description">> | undefined;

    const componentContractsArray = architecturePlan.componentContracts || [];
    const allContracts: Record<string, ComponentContract> = {};
    for (const contract of componentContractsArray) {
      allContracts[contract.name] = contract;
    }

    if (batchResponsibilities.includes("root") || batchResponsibilities.includes("page")) {
      compositionTargets = architecturePlan.fileStructure
        .filter(f => {
          const lower = f.path.toLowerCase();
          if (lower.includes("app.tsx") || lower.includes("main.tsx") || lower.includes("index.")) return false;
          const resp = this.determineResponsibility(f.path);
          return resp === "component" || resp === "page";
        })
        .map(f => {
          const parts = f.path.split('/');
          const fileName = parts[parts.length - 1];
          const name = fileName.replace(/\.[^/.]+$/, "");
          let importPath = f.path;
          if (importPath.startsWith("src/")) {
            importPath = "./" + importPath.slice(4);
          }
          importPath = importPath.replace(/\.[^/.]+$/, "");
          
          const contract = allContracts[name] || {
            name,
            exportType: "named",
            props: []
          };
          
          return {
            name,
            importPath,
            exportType: contract.exportType,
            props: contract.props
          };
        });

      if (compositionTargets.length > 0) {
        console.log(`[ContextBuilder] Composition Targets: ${compositionTargets.map(t => `${t.name}(${t.exportType}, ${t.props.length} props)`).join(", ")}`);
      }
    }

    if (batchResponsibilities.includes("component")) {
      componentContracts = {};
      for (const file of batchFiles) {
        const parts = file.path.split('/');
        const fileName = parts[parts.length - 1];
        const name = fileName.replace(/\.[^/.]+$/, "");
        if (allContracts[name]) {
          const { description: _description, ...rest } = allContracts[name];
          componentContracts[name] = rest;
        }
      }
      if (Object.keys(componentContracts).length === 0) {
        componentContracts = undefined;
      }
    }

    return {
      applicationSummary,
      batchResponsibilities,
      relevantFeatures: Array.from(relevantFeaturesSet),
      relevantPages: Array.from(relevantPagesSet),
      relevantComponents: Array.from(relevantComponentsSet),
      compositionTargets,
      componentContracts,
      architectureNotes,
      currentBatch: batchFiles,
    };
  }
}
