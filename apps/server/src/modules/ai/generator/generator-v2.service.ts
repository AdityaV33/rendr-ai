import { TemplateEngine } from "../template/template.engine.js";
import { TemplateContext } from "../template/template.types.js";
import { mapToSupportedFramework, mapToSupportedLanguage, mapToPackageManager, slugifyProjectName } from "../template/template.utils.js";
import { GeminiService } from "../clients/gemini.service.js";
import type { GeneratedProject } from "../types/generated-project.types.js";
import type { ProjectPlan } from "../types/project-plan.types.js";
import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { ComponentContract } from "../context/context-builder.types.js";
import { env } from "../../../config/env.js";
import { buildFilePrompt, buildAppPrompt, buildBatchPrompt } from "../prompts/generator-v2.prompt.js";
import { BatchBuilder, BatchGroup } from "./batch-builder.utils.js";
import { z } from "zod";
import { zodToGeminiSchema } from "../utils/schema.utils.js";

const batchResponseSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
  }))
});
const BATCH_RESPONSE_GEMINI_SCHEMA = zodToGeminiSchema(batchResponseSchema);
import { installDependenciesInWorkspace } from "../../runtime/install.service.js";
import { getWorkspacePath } from "../../runtime/workspace.service.js";
import { updateWorkspaceFile } from "../../runtime/workspace-file.service.js";
import { ContractGate } from "./contract.gate.js";

interface V2Metrics {
  totalFiles: number;
  totalApiTime: number;
  fastestFile: number;
  slowestFile: number;
  slowestFileName: string;
  fastestFileName: string;
  totalApiCalls: number;
}

export class GeneratorV2Service {
  private readonly gemini: GeminiService;
  private readonly templateEngine: TemplateEngine;

  constructor(gemini: GeminiService, templateEngine: TemplateEngine) {
    this.gemini = gemini;
    this.templateEngine = templateEngine;
  }

  private cleanRawOutput(output: string): string {
    let content = output.trim();
    
    // Match the first markdown code fence, allowing preambles and trailing text.
    const fenceMatch = content.match(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }
    
    // Fallback: If there's an opening fence but no closing fence (e.g. truncated)
    const openFenceMatch = content.match(/```(?:[a-zA-Z]*\n)?([\s\S]*)/);
    if (openFenceMatch) {
      return openFenceMatch[1].trim();
    }

    // Fallback: plain code
    return content;
  }

  private determineResponsibility(path: string): "root" | "page" | "component" | "store" | "utility" | "config" {
    const lower = path.toLowerCase();
    if (lower.includes("app.tsx") || lower.includes("main.tsx") || lower.includes("index.html")) return "root";
    if (lower.includes("/pages/") || lower.includes("/views/") || lower.includes("/routes/")) return "page";
    if (lower.includes("/components/") || lower.includes("/layouts/")) return "component";
    if (lower.includes("/store/") || lower.includes("/stores/") || lower.includes("/context/") || lower.includes("/state/")) return "store";
    if (lower.includes("/utils/") || lower.includes("/hooks/") || lower.includes("/types/") || lower.includes("/lib/")) return "utility";
    if (lower.endsWith(".config.js") || lower.endsWith(".config.ts") || lower.endsWith(".json")) return "config";
    return "utility"; // fallback
  }

  /**
   * Orchestrates the incremental generation of the project.
   */
  async generateProject(
    projectId: string,
    projectPlan: ProjectPlan,
    architecturePlan: ArchitecturePlan
  ): Promise<GeneratedProject> {
    const startGeneration = performance.now();
    const metrics: V2Metrics = {
      totalFiles: 0,
      totalApiTime: 0,
      fastestFile: Infinity,
      slowestFile: 0,
      slowestFileName: "",
      fastestFileName: "",
      totalApiCalls: 0,
    };

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

    // Parallel Install
    const workspacePath = getWorkspacePath(projectId);
    const packageJsonFile = templateFiles.find(f => f.path === "package.json");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let installPromise: Promise<any> | null = null;

    if (packageJsonFile) {
      await updateWorkspaceFile(projectId, packageJsonFile.path, packageJsonFile.content);
      installPromise = installDependenciesInWorkspace(workspacePath, `${context.packageManager} install`);
    }

    // Filter out files that are already generated by templates, EXCEPT index.html which we allow the AI to overwrite
    const aiFiles = architecturePlan.fileStructure.filter(f => {
      if (f.path === "index.html") return true;
      return !templatePaths.has(f.path);
    });

    console.log(`\n--------------------------------`);
    console.log(`Generator V2`);
    console.log(`--------------------------------`);
    console.log(`[GeneratorV2] Template-Owned Files: ${templateFiles.length} | AI Files: ${aiFiles.length}`);

    // Build contracts lookup map
    const allContracts: Record<string, Omit<ComponentContract, "description">> = {};
    if (architecturePlan.componentContracts) {
      for (const contract of architecturePlan.componentContracts) {
        allContracts[contract.name] = contract;
      }
    }

    const generatedFiles: Array<{ path: string; content: string }> = [];

    // Generator Worker Queue
    const executeQueue = async (aiFilesToProcess: typeof aiFiles) => {
      const batches = BatchBuilder.buildBatches(aiFilesToProcess, architecturePlan);
      console.log(`[GeneratorV2] Built ${batches.length} batches for ${aiFilesToProcess.length} files.`);

      let activeCount = 0;
      let hasError = false;
      const queue = [...batches];
      const queueAbortController = new AbortController();

      const healthyModels = Math.max(1, this.gemini.getHealthyModelCount());
      const maxConcurrency = Math.min(env.GENERATOR_BATCH_CONCURRENCY, healthyModels * 2);

      await new Promise<void>((resolve, reject) => {
        const next = () => {
          if (hasError) return;
          if (queue.length === 0 && activeCount === 0) return resolve();

          while (activeCount < maxConcurrency && queue.length > 0) {
            const batch = queue.shift()!;
            activeCount++;

            this.generateBatch(batch, projectPlan, architecturePlan, allContracts, metrics, queueAbortController.signal)
              .then((results) => {
                generatedFiles.push(...results);
                activeCount--;
                next();
              })
              .catch((err) => {
                if (hasError) return; // Prevent multiple rejections
                hasError = true;
                queueAbortController.abort(new Error("Queue cancelled due to sibling failure"));
                reject(err);
              });
          }
        };
        next();
      });
    };

    console.log(`[GeneratorV2] Starting Flat Generation Queue (${aiFiles.length} files)`);
    await executeQueue(aiFiles);
    console.log(`[GeneratorV2] Generation Queue Finished`);

    // Output Benchmarks
    const totalTimeMs = performance.now() - startGeneration;
    const avgTime = metrics.totalFiles > 0 ? (metrics.totalApiTime / metrics.totalFiles) : 0;

    console.log(`
--------------------------------
Generator V2 Benchmark
--------------------------------
Files Generated: ${metrics.totalFiles}
Average File Time: ${(avgTime / 1000).toFixed(2)}s
Slowest File: ${metrics.slowestFileName} (${(metrics.slowestFile / 1000).toFixed(2)}s)
Fastest File: ${metrics.fastestFileName} (${(metrics.fastestFile / 1000).toFixed(2)}s)
Total API Calls: ${metrics.totalApiCalls}
Generation Time: ${(totalTimeMs / 1000).toFixed(2)}s
--------------------------------
`);

    if (installPromise) {
      console.log(`[GeneratorV2] Awaiting parallel dependency installation...`);
      try {
        const result = await installPromise;
        if (result && !result.success) {
          console.warn(`[GeneratorV2] Initial dependency installation failed. Falling back to base template without AI dependencies.`);
          
          // Generate a clean package.json without AI-hallucinated dependencies
          const safeContext: TemplateContext = {
            ...context,
            dependencies: {},
            devDependencies: {}
          };
          const safeTemplateFiles = this.templateEngine.generateAll(safeContext);
          const safePackageJsonFile = safeTemplateFiles.find(f => f.path === "package.json");
          
          if (safePackageJsonFile) {
            // Replace the package.json in templateFiles so it gets synced correctly later
            const pkgIndex = templateFiles.findIndex(f => f.path === "package.json");
            if (pkgIndex !== -1) templateFiles[pkgIndex] = safePackageJsonFile;
            
            // Overwrite in workspace and reinstall synchronously
            await updateWorkspaceFile(projectId, safePackageJsonFile.path, safePackageJsonFile.content);
            const fallbackResult = await installDependenciesInWorkspace(workspacePath, `${context.packageManager} install`);
            
            if (fallbackResult.success) {
              console.log(`[GeneratorV2] Fallback dependency installation completed successfully.`);
            } else {
              console.error(`[GeneratorV2] Fallback dependency installation also failed:`, fallbackResult.stderr);
            }
          }
        } else {
          console.log(`[GeneratorV2] Parallel dependency installation completed.`);
        }
      } catch (e: any) {
        console.error("[GeneratorV2] Install failed in background with exception:", e.message);
      }
    }

    return {
      files: [...templateFiles, ...generatedFiles],
      commands: {
        install: `${context.packageManager} install`,
        build: context.packageManager === "npm" || context.packageManager === "bun" ? `${context.packageManager} run build` : `${context.packageManager} build`,
        dev: context.packageManager === "npm" || context.packageManager === "bun" ? `${context.packageManager} run dev` : `${context.packageManager} dev`
      },
      project: {
        framework: context.framework,
        language: context.language,
        packageManager: context.packageManager,
        outputDirectory: "dist"
      }
    };
  }

  private async generateBatch(
    batch: BatchGroup,
    projectPlan: ProjectPlan,
    architecturePlan: ArchitecturePlan,
    allContracts: Record<string, Omit<ComponentContract, "description">>,
    metrics: V2Metrics,
    abortSignal?: AbortSignal
  ): Promise<{ path: string; content: string }[]> {
    const promptObj = buildBatchPrompt(batch.files, projectPlan, architecturePlan, allContracts);
    const start = performance.now();
    let batchResults: { path: string; content: string }[] = [];
    let success = false;

    // 1 bounded batch retry
    for (let attempt = 1; attempt <= 2; attempt++) {
      metrics.totalApiCalls++;
      
      try {
        const rawOutput = await this.gemini.generateStructured(
          promptObj.prompt,
          BATCH_RESPONSE_GEMINI_SCHEMA,
          promptObj.system,
          {
            timeoutMs: env.GEMINI_GENERATOR_TIMEOUT_MS,
            taskName: attempt > 1 ? `Retry ${batch.id} (Attempt ${attempt})` : `Generate ${batch.id}`,
            abortSignal
          }
        );

        const parsed = batchResponseSchema.parse(rawOutput);
        batchResults = parsed.files;
        
        // Verify we got all requested files
        const requestedPaths = new Set(batch.files.map(f => f.path));
        const returnedPaths = new Set(batchResults.map(f => f.path));
        
        for (const req of requestedPaths) {
          if (!returnedPaths.has(req)) {
            throw new Error(`Batch response missing requested file: ${req}`);
          }
        }
        
        success = true;
        break; // Batch succeeded structurally
      } catch (err) {
        console.warn(`[GeneratorV2] Batch ${batch.id} structural failure (Attempt ${attempt}):`, err);
        if (attempt === 2) {
          console.warn(`[GeneratorV2] Batch ${batch.id} exhausted retries. Falling back to single-file generation.`);
        }
      }
    }

    if (!success) {
      // Fallback to single-file generation
      console.log(`[GeneratorV2] Executing single-file fallback for ${batch.id}`);
      const fallbackResults: { path: string; content: string }[] = [];
      for (const file of batch.files) {
        // Run them sequentially in the fallback to avoid spiking concurrency
        const res = await this.generateFile(file, projectPlan, architecturePlan, allContracts, metrics, abortSignal);
        fallbackResults.push(res);
      }
      return fallbackResults;
    }

    // Process partial failures inside ContractGate
    const validatedResults: { path: string; content: string }[] = [];
    for (const result of batchResults) {
      // Only verify if it's one of the files we requested (ignore hallucinated extras)
      const requestedFile = batch.files.find(f => f.path === result.path);
      if (!requestedFile) continue;

      const duration = (performance.now() - start) / batch.files.length;
      metrics.totalFiles++;
      metrics.totalApiTime += duration;
      if (duration < metrics.fastestFile) {
        metrics.fastestFile = duration;
        metrics.fastestFileName = result.path;
      }
      if (duration > metrics.slowestFile) {
        metrics.slowestFile = duration;
        metrics.slowestFileName = result.path;
      }

      const violations = ContractGate.verify(
        result.content,
        allContracts,
        result.path,
        architecturePlan.stack.frontendFramework
      );

      if (violations.length > 0) {
        console.warn(`[GeneratorV2] Contract violations in ${result.path} (Batch generation):\n- ${violations.join('\n- ')}`);
        // We do NOT retry internally for batches. We forward the file with violations.
        // RepairEngine will handle it later.
      }
      
      validatedResults.push(result);
    }

    return validatedResults;
  }

  private async generateFile(
    file: ArchitecturePlan["fileStructure"][0],
    projectPlan: ProjectPlan,
    architecturePlan: ArchitecturePlan,
    allContracts: Record<string, Omit<ComponentContract, "description">>,
    metrics: V2Metrics,
    abortSignal?: AbortSignal
  ): Promise<{ path: string; content: string }> {
    const isRoot = this.determineResponsibility(file.path) === "root";

    const behavioralContract = (architecturePlan.behavioralContracts || []).find(
      c => c.file === file.path
    );

    let promptObj: { system: string, prompt: string };
    if (isRoot) {
      promptObj = buildAppPrompt(file, projectPlan, architecturePlan, allContracts, behavioralContract);
    } else {
      promptObj = buildFilePrompt(file, architecturePlan, allContracts, behavioralContract);
    }

    const originalPrompt = promptObj.prompt;
    const MAX_RETRIES = 2;
    const start = performance.now();
    let finalCode = "";
    let finalDuration = 0;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      metrics.totalApiCalls++;
      
      const genStart = performance.now();
      const rawOutput = await this.gemini.generateText(promptObj.prompt, promptObj.system, {
        timeoutMs: env.GEMINI_GENERATOR_TIMEOUT_MS,
        taskName: attempt > 1 ? `Retry ${file.path} (Attempt ${attempt})` : `Generate ${file.path}`,
        abortSignal
      });
      finalDuration += performance.now() - genStart;
      
      finalCode = this.cleanRawOutput(rawOutput);

      const violations = ContractGate.verify(
        finalCode,
        allContracts,
        file.path,
        architecturePlan.stack.frontendFramework
      );

      if (violations.length === 0) {
        break;
      }

      if (attempt <= MAX_RETRIES) {
        console.warn(`[GeneratorV2] Contract violations in ${file.path} (Attempt ${attempt}):\n- ${violations.join('\n- ')}`);
        
        // Build a fresh retry prompt using the base system and original prompt
        promptObj.prompt = `${originalPrompt}

CONTRACT GATE FAILURE — ATTEMPT ${attempt + 1}

The previous output violated the Architecture Manifest:

${violations.map(v => `- ${v}`).join('\n')}

Fix the consumer. Do NOT modify another file's contract.
Return the complete corrected file.`;
      } else {
        console.warn(`[GeneratorV2] Exhausted retries for ${file.path}. Moving forward with violations.`);
      }
    }

    metrics.totalFiles++;
    metrics.totalApiTime += finalDuration;

    if (finalDuration > metrics.slowestFile) {
      metrics.slowestFile = finalDuration;
      metrics.slowestFileName = file.path;
    }
    if (finalDuration < metrics.fastestFile) {
      metrics.fastestFile = finalDuration;
      metrics.fastestFileName = file.path;
    }

    console.log(`[GeneratorV2] Generated ${file.path} in ${(finalDuration / 1000).toFixed(2)}s`);

    return {
      path: file.path,
      content: finalCode
    };
  }
}
