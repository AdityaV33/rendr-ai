import { ZodError } from "zod";
import { TemplateEngine } from "../template/template.engine.js";
import { TemplateContext } from "../template/template.types.js";
import { mapToSupportedFramework, mapToSupportedLanguage, mapToPackageManager, slugifyProjectName } from "../template/template.utils.js";
import { GeneratedFile } from "../types/generated-file.types.js";
import { GeminiService } from "../clients/gemini.service.js";
import { GENERATOR_SYSTEM_PROMPT } from "../prompts/generator.prompt.js";
import { generatedProjectSchema } from "../schemas/generated-project.schema.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";
import { extractJSXOpeningTags } from "../utils/jsx-parser.js";
import type { GeneratedProject } from "../types/generated-project.types.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import { InternalServerError } from "../../lib/http-error.js";
import { ContextBuilderService } from "../context/context-builder.service.js";

const MAX_VALIDATION_RETRIES = 1;

const PAGE_OUTPUT_BUDGET = 3000;
const COMPONENT_OUTPUT_BUDGET = 2000;
const UTILITY_OUTPUT_BUDGET = 800;
const SAFE_BATCH_OUTPUT_BUDGET = 6000;

function estimateComplexity(path: string): number {
  const p = path.toLowerCase();
  if (p.includes("src/pages") || p.includes("src/views") || p.includes("src/routes")) {
    return PAGE_OUTPUT_BUDGET;
  }
  if (p.includes("src/components") || p.includes("src/layouts")) {
    return COMPONENT_OUTPUT_BUDGET;
  }
  return UTILITY_OUTPUT_BUDGET;
}

/** Pre-computed Gemini-compatible JSON schema — avoids re-converting on every request */
const GENERATED_PROJECT_GEMINI_SCHEMA = zodToGeminiSchema(generatedProjectSchema);

export class GeneratorService {
  private readonly gemini: GeminiService;
  private readonly templateEngine: TemplateEngine;
  private readonly contextBuilder: ContextBuilderService;

  constructor(gemini: GeminiService, templateEngine: TemplateEngine, contextBuilder: ContextBuilderService = new ContextBuilderService()) {
    this.gemini = gemini;
    this.templateEngine = templateEngine;
    this.contextBuilder = contextBuilder;
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
    const templateOwnedFiles = architecturePlan.fileStructure.filter(f => this.isTemplateOwned(f.path, templatePaths));
    const aiArchitecturePlan: ArchitecturePlan = {
      ...architecturePlan,
      fileStructure: architecturePlan.fileStructure.filter(f => !this.isTemplateOwned(f.path, templatePaths))
    };

    const testFilesCount = aiArchitecturePlan.fileStructure.filter(f => f.path.includes('.test.') || f.path.includes('.spec.') || f.path.includes('__tests__')).length;

    console.log(`[Generator] Testing Enabled: ${!!projectPlan.requiresTests} | Test Files: ${testFilesCount}`);
    console.log(`[Generator] Template-Owned Files: ${templateOwnedFiles.length} | AI Files: ${aiArchitecturePlan.fileStructure.length}`);

    const generationPlan = this.createGenerationPlan(aiArchitecturePlan);

    const numComponents = aiArchitecturePlan.fileStructure.filter(f => f.path.includes('/components/')).length;
    const numPages = aiArchitecturePlan.fileStructure.filter(f => f.path.includes('/pages/')).length;
    const numStores = aiArchitecturePlan.fileStructure.filter(f => f.path.includes('/store/') || f.path.includes('/stores/')).length;
    
    console.log(`[Generator] Complexity: ${projectPlan.complexity === 'low' ? 'Small' : projectPlan.complexity === 'medium' ? 'Medium' : 'Large'} | Total: ${architecturePlan.fileStructure.length} files | Components: ${numComponents} | Pages: ${numPages} | Stores: ${numStores} | AI: ${aiArchitecturePlan.fileStructure.length}`);

    // Phase 2: Execution (Only for remaining non-deterministic files)
    const batches = await this.executeBatches(projectPlan, aiArchitecturePlan, generationPlan);

    // Phase 3: Assembly (Merge templates with AI-generated files)
    return this.assembleProject(architecturePlan, batches, templateFiles, context.framework);
  }

  /**
   * Identifies files that belong to the framework template rather than the AI.
   * This ensures deterministic scaffolding files are never generated by Gemini,
   * even if the Architect hallucinates them.
   */
  private isTemplateOwned(path: string, templatePaths: Set<string>): boolean {
    const normalized = path.replace(/^\.\//, "").replace(/^\//, "");
    if (templatePaths.has(normalized) || templatePaths.has(path)) {
      return true;
    }

    // Framework-agnostic config files that should never be AI-generated
    if (/^tailwind\.config\.(js|cjs|mjs|ts)$/i.test(normalized)) return true;
    if (/^postcss\.config\.(js|cjs|mjs|ts)$/i.test(normalized)) return true;
    if (/^tsconfig(\..+)?\.json$/i.test(normalized)) return true;
    if (/^package\.json$/i.test(normalized)) return true;
    if (/^vite\.config\.(js|ts)$/i.test(normalized)) return true;
    if (/^eslint\.config\.js$/i.test(normalized)) return true;

    return false;
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
      if (file.type === "directory") continue;

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

    const addBatches = (categoryName: string, files: ArchitecturePlan["fileStructure"]) => {
      let currentBatchFiles: ArchitecturePlan["fileStructure"] = [];
      let currentBudget = 0;

      for (const file of files) {
        const fileBudget = estimateComplexity(file.path);
        
        if (fileBudget >= SAFE_BATCH_OUTPUT_BUDGET) {
          if (currentBatchFiles.length > 0) {
            batches.push({ id: `${categoryName}-batch-${batchCounter++}`, files: currentBatchFiles });
            currentBatchFiles = [];
            currentBudget = 0;
          }
          batches.push({ id: `${categoryName}-batch-${batchCounter++}`, files: [file] });
          continue;
        }

        if (currentBudget + fileBudget > SAFE_BATCH_OUTPUT_BUDGET) {
          batches.push({ id: `${categoryName}-batch-${batchCounter++}`, files: currentBatchFiles });
          currentBatchFiles = [file];
          currentBudget = fileBudget;
        } else {
          currentBatchFiles.push(file);
          currentBudget += fileBudget;
        }
      }
      
      if (currentBatchFiles.length > 0) {
        batches.push({ id: `${categoryName}-batch-${batchCounter++}`, files: currentBatchFiles });
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

    const queue = [...generationPlan.batches];

    while (queue.length > 0) {
      const batch = queue.shift()!;
      try {
        const result = await this.generateBatch(projectPlan, architecturePlan, batch);
        results.push(result);
      } catch (error) {
        if (error instanceof Error && error.message === "MAX_TOKENS_EXCEEDED") {
          console.error(`[Generator] MAX_TOKENS for batch ${batch.id}`);
          if (batch.files.length === 1) {
            throw new InternalServerError(`File ${batch.files[0].path} is too large and exceeds the model's output limit. Adaptive recovery failed.`);
          }
          
          console.warn(`[Generator] Batch ${batch.id} exceeded output tokens. Adaptive recovery: splitting batch.`);
          
          const mid = Math.ceil(batch.files.length / 2);
          const firstHalf = batch.files.slice(0, mid);
          const secondHalf = batch.files.slice(mid);
          
          queue.unshift({ id: `${batch.id}-split-b`, files: secondHalf });
          queue.unshift({ id: `${batch.id}-split-a`, files: firstHalf });
        } else {
          throw error;
        }
      }
    }

    return results;
  }

  private async generateBatch(
    projectPlan: ProjectPlan,
    architecturePlan: ArchitecturePlan,
    batch: { id: string; files: ArchitecturePlan["fileStructure"] }
  ): Promise<GeneratedProject> {
    // 1. Build the specific context for this batch
    const generatorContext = this.contextBuilder.buildContext({
      agent: "generator",
      projectPlan,
      architecturePlan,
      currentBatch: batch,
    });

    const estimatedBudget = batch.files.reduce((sum, f) => sum + estimateComplexity(f.path), 0);
    console.log(`[Generator] Batch ${batch.id} | Files: ${batch.files.map(f => f.path).join(", ")} | Budget: ${estimatedBudget}/${SAFE_BATCH_OUTPUT_BUDGET}`);
    console.log(`[Generator] Context: responsibilities=[${generatorContext.batchResponsibilities.join(", ")}] pages=[${generatorContext.relevantPages.map(p => p.name).join(", ") || "None"}] components=[${generatorContext.relevantComponents.map(c => c.name).join(", ") || "None"}] targets=[${generatorContext.compositionTargets ? generatorContext.compositionTargets.map(t => t.name).join(", ") : "None"}]`);

    let prompt = `Based on the following GeneratorContext, generate the source code for the requested files ONLY.

CRITICAL INSTRUCTION: You are generating a partial batch of the application. The currentBatch below has been intentionally filtered to only contain the specific files required for this batch (${batch.files.length} files).
Do NOT generate any files that are not explicitly listed in the currentBatch below. If you generate extra files, the system will fail.

GeneratorContext (PARTIAL BATCH):
${JSON.stringify(generatorContext, null, 2)}`;
    
    let lastError: unknown;

    let raw: unknown;
    for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
      try {
        raw = await this.gemini.generateStructured<GeneratedProject>(
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

        // Validation 3: Component Contract Validation
        if (generatorContext.componentContracts) {
          for (const file of parsed.files) {
            const parts = file.path.split('/');
            const name = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
            const contract = generatorContext.componentContracts[name];
            
            if (contract) {
              const content = file.content;
              const hasDefault = !!content.match(new RegExp(`export\\s+default\\s+(function\\s+)?${name}`));
              const hasNamed = !!content.match(new RegExp(`export\\s+(const|function|let)\\s+${name}`));
              
              const generatedExport = hasDefault ? "default" : (hasNamed ? "named" : "unknown");

              let failed = false;
              if (contract.exportType === "default" && !hasDefault) {
                failed = true;
              } else if (contract.exportType === "named" && !hasNamed) {
                failed = true;
              }

              if (failed) {
                console.log(`[Validator] Contract FAILED: ${name} — expected ${contract.exportType} export, got ${generatedExport} (retry ${attempt + 1}/${MAX_VALIDATION_RETRIES})`);
                throw new Error(`Contract mismatch: ${name} must have a ${contract.exportType} export.`);
              }
              
              // Validate props
              let propsFailed = false;
              for (const prop of contract.props) {
                if (!content.includes(prop.name)) {
                  propsFailed = true;
                }
              }

              if (propsFailed) {
                console.log(`[Validator] Contract FAILED: ${name} — missing required props (retry ${attempt + 1}/${MAX_VALIDATION_RETRIES})`);
                throw new Error(`Contract mismatch: ${name} is missing required props.`);
              }

              console.log(`[Validator] Contract PASSED: ${name} (${contract.exportType} export, props ok)`);
            }
          }
        }

        // Validation 4: Composition Target Validation
        if (generatorContext.compositionTargets) {
          // Check that every composition target is used somewhere
          for (const target of generatorContext.compositionTargets) {
            let foundRender = false;

            for (const file of parsed.files) {
              const content = file.content;
              if (content.includes(target.name)) {
                
                // Validate Import Style
                if (target.exportType === "default") {
                  if (content.match(new RegExp(`import\\s+\\{\\s*${target.name}\\s*\\}`))) {
                    console.log(`[Validator] Composition FAILED: ${target.name} — expected default import, got named (retry ${attempt + 1}/${MAX_VALIDATION_RETRIES})`);
                    throw new Error(`Contract mismatch: ${target.name} must be imported as a default export.`);
                  }
                } else {
                  if (content.match(new RegExp(`import\\s+${target.name}\\s+from`))) {
                    console.log(`[Validator] Composition FAILED: ${target.name} — expected named import, got default (retry ${attempt + 1}/${MAX_VALIDATION_RETRIES})`);
                    throw new Error(`Contract mismatch: ${target.name} must be imported as a named export.`);
                  }
                }

                // Validate Props for EVERY rendered usage
                const tags = extractJSXOpeningTags(content, target.name);
                if (tags.length > 0) {
                  foundRender = true;
                }

                for (const tag of tags) {
                  for (const prop of target.props) {
                    if (prop.required && !tag.hasSpread && !tag.props.includes(prop.name)) {
                      console.log(`[Validator] Composition FAILED: ${target.name} — missing required prop '${prop.name}' in ${file.path} (retry ${attempt + 1}/${MAX_VALIDATION_RETRIES})`);
                      throw new Error(`Contract mismatch: ${file.path} must pass required prop '${prop.name}' to ${target.name}.`);
                    }
                  }
                }
              }
            }

            if (!foundRender) {
              console.log(`[Validator] Composition FAILED: ${target.name} — never rendered (retry ${attempt + 1}/${MAX_VALIDATION_RETRIES})`);
              throw new Error(`Contract mismatch: You must use the component '${target.name}' from the compositionTargets. Do not hallucinate alternative component names.`);
            }
          }
        }

        return parsed;
      } catch (error) {
        const isZodError = error instanceof ZodError;
        const isMalformedJson = error instanceof Error && error.message.includes("Malformed JSON");
        const isValidationError = error instanceof Error && (error.message.includes("Hallucinated files") || error.message.includes("Missing requested files") || error.message.includes("Contract mismatch"));
        const isMaxTokens = error instanceof Error && error.message === "MAX_TOKENS_EXCEEDED";

        if (!isZodError && !isMalformedJson && !isValidationError && !isMaxTokens) {
          throw error;
        }

        if (isMaxTokens) {
          throw error; // Rethrow immediately so executeBatches can perform adaptive recovery
        }

        lastError = error;

        if (attempt < MAX_VALIDATION_RETRIES) {
          const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
          prompt = prompt + `\n\nYOUR PREVIOUS ATTEMPT FAILED WITH THE FOLLOWING VALIDATION ERROR:\n${errMsg}\n\nYou MUST fix this error in your new response.`;
          console.log(`[Generator] Batch ${batch.id} validation failed. Retrying...`);
        } else {
          console.error(`[Generator] Batch ${batch.id} exhausted retries. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
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
    templateFiles: GeneratedFile[],
    canonicalFramework: string
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
        if (this.isTemplateOwned(file.path, new Set(templateFiles.map(f => f.path)))) {
          console.warn(`[Generator] Ignoring hallucinated template file: ${file.path}`);
          continue;
        }
        mergedFiles.set(file.path, file);
      }
    }

    const packageManager = architecturePlan.stack.packageManager;

    return {
      project: {
        framework: canonicalFramework,
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
