import { z } from "zod";
import { GeminiService } from "../clients/gemini.service.js";
import { RepairEngineService } from "../repair/repair-engine.service.js";
import { REFINEMENT_PLANNER_SYSTEM_PROMPT } from "../prompts/refinement-planner.prompt.js";
import { REFINEMENT_GENERATOR_SYSTEM_PROMPT, buildRefinementGeneratorPrompt } from "../prompts/refinement-generator.prompt.js";
import { refinementPlannerSchema, type RefinementPlan } from "../schemas/refinement.schema.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";
import type { Project } from "../../projects/project.model.js";
import type { HydratedDocument } from "mongoose";
import { BadRequestError, InternalServerError } from "../../lib/http-error.js";
import { getWorkspacePath } from "../../runtime/workspace.service.js";
import { getWorkspaceFile, updateWorkspaceFile, deleteWorkspaceFile } from "../../runtime/workspace-file.service.js";
import { runProcess } from "../../runtime/process.service.js";
import { DiagnosticParser } from "../repair/diagnostic-parser.js";
import { RuleEngine } from "../repair/rule-engine.js";
import { getRuntimeState, startPreviewOnly } from "../../runtime/runtime-manager.service.js";
import { initializeRuntime, hasRuntime } from "../../runtime/runtime.service.js";
import type { GraphEvent } from "../graph/types.js";
import type { GenerationState } from "../graph/state.js";
import { generateFileSummary } from "../utils/file-summary.utils.js";
import { pipelineRunContext } from "../utils/run-context.js";

const PLANNER_SCHEMA = zodToGeminiSchema(refinementPlannerSchema);

export class RefinementService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly repairEngine: RepairEngineService
  ) {}

  async refine(
    project: HydratedDocument<Project>,
    prompt: string,
    onEvent?: (event: GraphEvent) => void
  ) {
    const emit = (type: string, durationMs?: number) => {
      if (onEvent) {
        // Mock state to satisfy interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onEvent({ type: type as any, timestamp: Date.now(), durationMs, state: {} as any });
      }
    };

    if (!project.aiPlan || !project.architecturePlan) {
      throw new BadRequestError("Project is missing AI or Architecture plan.");
    }

    const startTotal = performance.now();
    
    return pipelineRunContext.run({ blacklistedModels: new Set<string>() }, async () => {

    // 1. Refinement Planner
    emit("planner_started");
    const plannerStart = performance.now();
    // Extract current file tree
    let fileTree = "";
    if (project.generatedProject?.files) {
      fileTree = project.generatedProject.files.map(f => generateFileSummary(f.path, f.content)).join("\n\n");
    } else if (project.files?.length) {
      fileTree = project.files.join("\n");
    } else {
      fileTree = "(No files exist yet)";
    }

    const plannerInput = `
Refinement Request:
${prompt}

Existing Project Plan:
${JSON.stringify(project.aiPlan, null, 2)}

Existing Architecture Plan:
${JSON.stringify(project.architecturePlan, null, 2)}

Current File Tree:
${fileTree}
`;
    
    let planResult: RefinementPlan;
    try {
      const raw = await this.gemini.generateStructured<RefinementPlan>(
        plannerInput,
        PLANNER_SCHEMA,
        REFINEMENT_PLANNER_SYSTEM_PROMPT,
        { temperature: 0.2, taskName: "Refinement Planner" }
      );
      planResult = refinementPlannerSchema.parse(raw);
    } catch (err) {
      console.error("[Refinement] Failed to parse planner response:", err);
      throw new InternalServerError("Failed to generate refinement plan.");
    }
    const plannerTotalTime = performance.now() - plannerStart;
    emit("planner_completed", plannerTotalTime);

    if (!planResult.isSupported) {
      throw new BadRequestError(`Refinement rejected: ${planResult.reasoning}`);
    }

    if (planResult.logicalChanges.length > 2) {
      throw new BadRequestError("Refinement rejected: Maximum of 2 logical changes allowed per request.");
    }

    if (project.generatedProject) {
      if (!project.pendingProject) {
        project.pendingProject = { ...project.generatedProject, files: [...(project.generatedProject.files || [])] };
      }
      if (!project.pendingProject.files) {
        project.pendingProject.files = [];
      }
    }

    // Prepare files and snapshot
    const filesToModify: { path: string; content?: string; isNew: boolean }[] = [];
    const snapshotFiles: { path: string; existedBefore: boolean; content: string }[] = [];
    
    for (const af of planResult.affectedFiles) {
      const action = (af as any).action;

      if (action === "delete") {
        if (project.pendingProject) {
          const existingIdx = project.pendingProject.files.findIndex(pf => pf.path === af.path);
          if (existingIdx !== -1) {
            project.pendingProject.files.splice(existingIdx, 1);
            project.markModified("pendingProject");
          }
        }
        try {
          await deleteWorkspaceFile(project._id.toString(), af.path);
          console.log(`[Refinement] Explicitly deleted ${af.path}`);
        } catch (err) {
          console.warn(`[Refinement] Failed to delete ${af.path} from workspace, it might already be deleted.`);
        }
        continue;
      }

      if (action === "modify" || (!action && !(af as any).isNew)) {
        const content = await getWorkspaceFile(project._id.toString(), af.path);
        if (content === null) {
           console.warn(`[Refinement] Planner requested modification of ${af.path} but it does not exist. Treating as new.`);
           filesToModify.push({ path: af.path, isNew: true });
           snapshotFiles.push({ path: af.path, existedBefore: false, content: "" });
        } else {
           filesToModify.push({ path: af.path, content, isNew: false });
           snapshotFiles.push({ path: af.path, existedBefore: true, content });
        }
      } else {
        filesToModify.push({ path: af.path, isNew: true });
        snapshotFiles.push({ path: af.path, existedBefore: false, content: "" });
      }
    }

    // 2. Targeted Generator (Parallel)
    let generatorTotalTime = 0;
    emit("generator_started");
    const generatorStart = performance.now();
    
    const outputSchema = z.object({
      content: z.string()
    });

    const generateFile = async (targetFile: { path: string, content?: string, isNew: boolean }) => {
       const prompt = buildRefinementGeneratorPrompt(planResult.instructions, targetFile, filesToModify);
       try {
         const rawOutput = await this.gemini.generateStructured(
           prompt,
           zodToGeminiSchema(outputSchema),
           REFINEMENT_GENERATOR_SYSTEM_PROMPT,
           { temperature: 0.1, taskName: `Refine: ${targetFile.path}` }
         );
         const parsed = outputSchema.parse(rawOutput);
         return { path: targetFile.path, content: parsed.content };
       } catch {
         throw new InternalServerError(`Failed to generate targeted refinement code for ${targetFile.path}.`);
       }
    };

    const generatedFiles: { path: string, content: string }[] = await Promise.all(filesToModify.map(f => generateFile(f)));
    
    generatorTotalTime = performance.now() - generatorStart;
    emit("generator_completed", generatorTotalTime);

    let workspaceWriteTime = 0;
    const writeStart = performance.now();
    // Write to workspace (triggering HMR)
    for (const f of generatedFiles) {
      await updateWorkspaceFile(project._id.toString(), f.path, f.content);
      
      // Immediately update the pending in-memory manifest so the Repair Engine sees it
      if (project.generatedProject && project.pendingProject) {
        const existingIdx = project.pendingProject.files.findIndex(pf => pf.path === f.path);
        if (existingIdx !== -1) {
          project.pendingProject.files[existingIdx].content = f.content;
        } else {
          project.pendingProject.files.push({ path: f.path, content: f.content });
        }
        project.markModified('pendingProject');
      }
    }
    workspaceWriteTime = performance.now() - writeStart;

    // 3. Build & Typecheck (Wait for HMR/build)
    let buildTotalTime = 0;
    emit("build_started");
    const buildStart = performance.now();
    const workspacePath = getWorkspacePath(project._id.toString());
    
    // Break down build timing
    let buildResult;
    let tscTime = 0;
    let viteTime = 0;
    
    let cmdToRun = project.generatedProject?.commands.build || "npm run build";
    const framework = project.architecturePlan?.stack.frontendFramework;
    
    const runBuild = async () => {
      if (framework?.includes("react")) {
        const pm = project.generatedProject?.commands.build?.split(" ")[0] || "npm";
        const pmCmd = pm === "npm" ? "npm" : pm;
        
        // 1. Run tsc -b explicitly for typechecking
        const tscStart = performance.now();
        const tscResult = await runProcess(pmCmd, ["exec", "tsc", "-b"], { cwd: workspacePath });
        tscTime += performance.now() - tscStart;
        
        return tscResult;
      } else {
        const [cmd, ...args] = cmdToRun.split(" ");
        return runProcess(cmd, args, { cwd: workspacePath });
      }
    };
    buildResult = await runBuild();

    buildTotalTime = performance.now() - buildStart;
    emit("build_completed", buildTotalTime);

    let repairTotalTime = 0;
    let repairAttempts = 0;

    // 4. Repair (if needed)
    if (!buildResult.success) {
      const maxRepairAttempts = 3;
      
      while (!buildResult.success) {
        if (repairAttempts >= maxRepairAttempts) {
          throw new Error(`Build failed after max repair attempts.\nError: ${buildResult.stdout}`);
        }
        
        repairAttempts++;
        emit("repair_started");
        const repairStart = performance.now();
        console.log(`[Refinement] Build failed. Repair attempt ${repairAttempts}...`);
        
        const errorOutput = buildResult.stdout + "\n" + buildResult.stderr;
        const diagnostics = DiagnosticParser.parse(errorOutput);
        const fixedDeterministically = await RuleEngine.attemptDeterministicFix(diagnostics, workspacePath);
        
        if (!fixedDeterministically) {
           console.log(`[MANIFEST AUDIT] Before RepairEngine`);
           console.log(`Files in pending manifest: ${project.pendingProject?.files?.length}`);
           const themeCtx = project.pendingProject?.files?.find(f => f.path.includes("ThemeContext"));
           const themeTgl = project.pendingProject?.files?.find(f => f.path.includes("ThemeToggle"));
           console.log(`- ThemeContext exists: ${!!themeCtx}`);
           console.log(`- ThemeToggle exists: ${!!themeTgl}`);
           console.log(`========================================\n`);

           // Mock a partial state for RepairEngine
           const mockState: GenerationState = {
              project: { id: project._id.toString(), framework: "" },
              architecture: project.architecturePlan as unknown as NonNullable<GenerationState["architecture"]>,
              generatedFiles: project.pendingProject as unknown as NonNullable<GenerationState["generatedFiles"]>,
              errors: [],
              executionHistory: [], checkpoints: [], gateAttempts: {}, metrics: {} as unknown as GenerationState["metrics"],
              prompt: "", currentStep: "planner", status: "idle"
           };
           const repairedFiles = await this.repairEngine.executeGateRepair(mockState, "Build", errorOutput, diagnostics);
           
           // Perform targeted writes for files that changed during repair
           for (const file of repairedFiles) {
             await updateWorkspaceFile(project._id.toString(), file.path, file.content);
           }
           project.markModified('pendingProject');
        }
        
        repairTotalTime += (performance.now() - repairStart);
        emit("repair_completed", performance.now() - repairStart);
        buildResult = await runBuild();
      }
    }

    // 5. Preview Verification
    emit("verify_started");
    const verifyStart = performance.now();
    let runtimeState = getRuntimeState(project._id.toString());
    
    // If preview is not running, explicitly start it for verification
    if (!runtimeState?.preview) {
       console.log("[Refinement] Preview is not running. Starting preview for verification...");
       
       // Default dev command fallback if not specified
       const devCmd = project.generatedProject?.commands.dev || "npm run dev";
       
       if (!hasRuntime(project._id.toString())) {
         initializeRuntime(project._id.toString());
       }
       
       try {
         runtimeState = await startPreviewOnly(project._id.toString(), devCmd);
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       } catch (err: any) {
         throw new Error("Preview verification failed: Failed to start preview. " + err.message);
       }
    }

    if (!runtimeState?.preview) {
       throw new Error("Preview verification failed: Preview is not running after start attempt.");
    }

    const verifyTotalTime = performance.now() - verifyStart;
    emit("verify_completed", verifyTotalTime);
    
    const totalTime = performance.now() - startTotal;
    
    console.log(`
========================================
[BENCHMARK] Refinement Pipeline Complete
========================================
Gate Repairs:           ${repairAttempts}
Total Time:             ${(totalTime / 1000).toFixed(1)} s
========================================
[BENCHMARK] Pipeline Breakdown
========================================
Planner:                ${(plannerTotalTime / 1000).toFixed(1)} s
Generator:              ${(generatorTotalTime / 1000).toFixed(1)} s
  - WS Write:           ${(workspaceWriteTime / 1000).toFixed(1)} s
Build:                  ${(buildTotalTime / 1000).toFixed(1)} s
  - TypeScript:         ${(tscTime / 1000).toFixed(1)} s
  - Vite:               ${(viteTime / 1000).toFixed(1)} s
Repair:                 ${(repairTotalTime / 1000).toFixed(1)} s
Verify:                 ${(verifyTotalTime / 1000).toFixed(1)} s
========================================
`);
    
    return { affectedFiles: planResult.affectedFiles, snapshotFiles };
    });
  }
}
