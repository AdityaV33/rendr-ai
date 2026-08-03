import { ZodError } from "zod";
import { TemplateEngine } from "../template/template.engine.js";
import { TemplateContext } from "../template/template.types.js";
import { mapToSupportedFramework, mapToSupportedLanguage, mapToPackageManager, slugifyProjectName } from "../template/template.utils.js";
import { GeneratedFile } from "../types/generated-file.types.js";
import { GeminiService } from "../clients/gemini.service.js";
import { GENERATOR_SYSTEM_PROMPT } from "../prompts/generator.prompt.js";
import { generatedProjectSchema } from "../schemas/generated-project.schema.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";
import type { GeneratedProject } from "../types/generated-project.types.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import { InternalServerError } from "../../lib/http-error.js";

const MAX_VALIDATION_RETRIES = 1;

/** Pre-computed Gemini-compatible JSON schema — avoids re-converting on every request */
const GENERATED_PROJECT_GEMINI_SCHEMA = zodToGeminiSchema(generatedProjectSchema);

export class GeneratorService {
  private readonly gemini: GeminiService;
  private readonly templateEngine: TemplateEngine;

  constructor(gemini: GeminiService, templateEngine: TemplateEngine) {
    this.gemini = gemini;
    this.templateEngine = templateEngine;
  }

  /**
   * Orchestrates the incremental generation of the project.
   */
  async generateProject(
    projectPlan: ProjectPlan,
    architecturePlan: ArchitecturePlan
  ): Promise<GeneratedProject> {
    // Phase 0: Template Engine (Deterministic Boilerplate)
    const deps = architecturePlan.dependencies || [];
    const dependencies = deps.filter(d => !d.isDev).reduce((acc, d) => ({ ...acc, [d.name]: d.version || 'latest' }), {});
    const devDependencies = deps.filter(d => d.isDev).reduce((acc, d) => ({ ...acc, [d.name]: d.version || 'latest' }), {});

    const context: TemplateContext = {
      projectName: slugifyProjectName(projectPlan.applicationType),
      framework: mapToSupportedFramework(architecturePlan.stack.frontendFramework),
      language: mapToSupportedLanguage(architecturePlan.stack.language),
      packageManager: mapToPackageManager(architecturePlan.stack.packageManager),
      features: projectPlan.features,
      dependencies,
      devDependencies
    };

    const templateFiles = this.templateEngine.generateAll(context);
    const templatePaths = new Set(templateFiles.map(f => f.path));

    // Phase 1: Planning (Exclude deterministic files from AI generation payload)
    const aiArchitecturePlan: ArchitecturePlan = {
      ...architecturePlan,
      fileStructure: architecturePlan.fileStructure.filter(f => !templatePaths.has(f.path))
    };

    const generationPlan = this.createGenerationPlan(aiArchitecturePlan);

    // Phase 2: Execution (Only for remaining non-deterministic files)
    const batches = await this.executeBatches(projectPlan, aiArchitecturePlan, generationPlan);

    // Phase 3: Assembly (Merge templates with AI-generated files)
    return this.assembleProject(architecturePlan, batches, templateFiles);
  }

  /**
   * Analyzes the ArchitecturePlan and groups files into logical generation batches.
   * Ensures deterministic ordering and chunking to avoid LLM token limits.
   */
  private createGenerationPlan(architecturePlan: ArchitecturePlan) {
    const categories: Record<string, ArchitecturePlan["fileStructure"]> = {
      shared: [],
      reusableUi: [],
      features: [],
      pages: [],
      other: []
    };

    for (const file of architecturePlan.fileStructure) {
      const p = file.path.toLowerCase();
      if (
        p.includes("src/types") ||
        p.includes("src/utils") ||
        p.includes("src/constants") ||
        p.includes("src/hooks") ||
        p.includes("src/stores") ||
        p.includes("src/store") ||
        p.includes("src/context")
      ) {
        categories.shared.push(file);
      } else if (
        p.includes("src/components/common") ||
        p.includes("src/components/ui") ||
        p.includes("src/layouts")
      ) {
        categories.reusableUi.push(file);
      } else if (
        p.includes("src/pages") ||
        p.includes("src/routes") ||
        p.includes("src/views")
      ) {
        categories.pages.push(file);
      } else if (p.includes("src/components")) {
        categories.features.push(file);
      } else {
        categories.other.push(file);
      }
    }

    const batches: { id: string; files: ArchitecturePlan["fileStructure"] }[] = [];
    let batchCounter = 1;
    const MAX_BATCH_SIZE = 3;

    const addBatches = (categoryName: string, files: ArchitecturePlan["fileStructure"]) => {
      for (let i = 0; i < files.length; i += MAX_BATCH_SIZE) {
        batches.push({
          id: `${categoryName}-batch-${batchCounter++}`,
          files: files.slice(i, i + MAX_BATCH_SIZE)
        });
      }
    };

    // Add batches in the exact requested deterministic order
    addBatches("shared", categories.shared);
    addBatches("reusableUi", categories.reusableUi);
    addBatches("features", categories.features);
    addBatches("pages", categories.pages);
    addBatches("other", categories.other);

    return { batches: batches.filter(b => b.files.length > 0) };
  }

  /**
   * Executes the generation plan, tracking progress and managing retries per batch.
   */
  private async executeBatches(
    projectPlan: ProjectPlan,
    architecturePlan: ArchitecturePlan,
    generationPlan: { batches: { id: string; files: ArchitecturePlan["fileStructure"] }[] }
  ): Promise<GeneratedProject[]> {
    const results: GeneratedProject[] = [];

    // TODO: Loop over batches. Currently executes the single stubbed batch.
    for (const batch of generationPlan.batches) {
      const result = await this.generateBatch(projectPlan, architecturePlan, batch);
      results.push(result);
    }

    return results;
  }

  private async generateBatch(
    projectPlan: ProjectPlan,
    architecturePlan: ArchitecturePlan,
    batch: { id: string; files: ArchitecturePlan["fileStructure"] }
  ): Promise<GeneratedProject> {
    // Restrict the ArchitecturePlan so the AI only generates this batch's files
    const batchArchitecture = {
      ...architecturePlan,
      fileStructure: batch.files,
    };

    const prompt = `Based on the following product requirements (ProjectPlan) and architectural blueprint (ArchitecturePlan), generate the source code for the requested files ONLY.

CRITICAL INSTRUCTION: You are generating a partial batch of the application. The ArchitecturePlan below has been intentionally filtered to only contain the specific files required for this batch (${batch.files.length} files).
Do NOT generate any files that are not explicitly listed in the ArchitecturePlan's fileStructure below. If you generate extra files, the system will fail.

ProjectPlan:
${JSON.stringify(projectPlan, null, 2)}

ArchitecturePlan (PARTIAL BATCH):
${JSON.stringify(batchArchitecture, null, 2)}`;
    
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
      try {
        const raw = await this.gemini.generateStructured<GeneratedProject>(
          prompt,
          GENERATED_PROJECT_GEMINI_SCHEMA,
          GENERATOR_SYSTEM_PROMPT,
          { temperature: 0.1 } 
        );

        const parsed = generatedProjectSchema.parse(raw);

        // Validation 1: Check for hallucinated files
        const requestedPaths = new Set(batch.files.map((f) => f.path));
        const generatedPaths = parsed.files.map((f) => f.path);
        
        const hallucinatedFiles = generatedPaths.filter((path) => !requestedPaths.has(path));
        if (hallucinatedFiles.length > 0) {
          throw new Error(`Hallucinated files detected: ${hallucinatedFiles.join(", ")}`);
        }

        // Validation 2: Check for missing files
        const generatedPathsSet = new Set(generatedPaths);
        const missingFiles = Array.from(requestedPaths).filter((path) => !generatedPathsSet.has(path));
        if (missingFiles.length > 0) {
          throw new Error(`Missing requested files: ${missingFiles.join(", ")}`);
        }

        return parsed;
      } catch (error) {
        const isZodError = error instanceof ZodError;
        const isMalformedJson = error instanceof Error && error.message.includes("Malformed JSON");
        const isValidationError = error instanceof Error && (error.message.includes("Hallucinated files") || error.message.includes("Missing requested files"));

        if (!isZodError && !isMalformedJson && !isValidationError) {
          throw error;
        }

        lastError = error;

        if (attempt < MAX_VALIDATION_RETRIES) {
          console.log(`Generator batch ${batch.id} validation/parsing failed. Retrying once...`);
        }
      }
    }

    const errorMessage = lastError instanceof Error ? lastError.message : "Unknown error";
    console.error(`Generator failed to generate batch ${batch.id} after retries:`, errorMessage);
    throw new InternalServerError(`Failed to generate batch ${batch.id}: ${errorMessage}`);
  }

  private assembleProject(
    architecturePlan: ArchitecturePlan,
    batches: GeneratedProject[],
    templateFiles: GeneratedFile[]
  ): GeneratedProject {
    if (batches.length === 0 && templateFiles.length === 0) {
      throw new InternalServerError("No files were generated.");
    }

    const mergedFiles = new Map<string, { path: string; content: string }>();

    for (const file of templateFiles) {
      mergedFiles.set(file.path, file);
    }

    for (const batch of batches) {
      for (const file of batch.files) {
        mergedFiles.set(file.path, file); // Overwrites duplicates safely
      }
    }

    const packageManager = architecturePlan.stack.packageManager;

    return {
      project: {
        framework: architecturePlan.stack.frontendFramework,
        language: architecturePlan.stack.language,
        packageManager,
        outputDirectory: architecturePlan.buildConfiguration?.outputDirectory || "dist",
      },
      commands: {
        install: `${packageManager} install`,
        dev: architecturePlan.scripts?.dev ? `${packageManager} run dev` : `${packageManager} dev`,
        build: architecturePlan.scripts?.build ? `${packageManager} run build` : `${packageManager} build`,
      },
      files: Array.from(mergedFiles.values()),
    };
  }
}
