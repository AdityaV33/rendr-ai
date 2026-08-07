import type { GenerationState } from "../state.js";
import type { GraphEvent, GraphEventType } from "../types.js";
import type { SanityGateService } from "../../validator/sanity-gate.service.js";
import type { RepairEngineService } from "../../repair/repair-engine.service.js";
import { runProcess } from "../../../runtime/process.service.js";
import { getWorkspacePath } from "../../../runtime/workspace.service.js";
import { writeGeneratedProject } from "../../../runtime/workspace-file.service.js";
import { startPreviewOnly } from "../../../runtime/runtime-manager.service.js";

export class GateRunnerNode {
  constructor(
    private readonly sanityGate: SanityGateService,
    private readonly repairEngine: RepairEngineService
  ) {}

  async execute(
    state: GenerationState,
    onEvent?: (event: GraphEvent) => void
  ): Promise<GenerationState> {
    const emit = (type: GraphEventType, durationMs?: number) => {
      if (onEvent) {
        onEvent({ type, timestamp: Date.now(), durationMs, state: currentState });
      }
    };

    let currentState = state;
    if (!currentState.gateAttempts) currentState.gateAttempts = {};

    const workspacePath = getWorkspacePath(currentState.project.id);
    const startCycle = performance.now();

    // 1. Sanity Gate
    emit("validator_started");
    const sanityResult = this.sanityGate.execute(currentState);
    emit("validator_completed", performance.now() - startCycle);
    
    if (!sanityResult.passed) {
      console.error("[GateRunner] Sanity gate failed, blocking preview.");
      currentState.validationResult = sanityResult;
      return currentState;
    }

    // Write valid files to workspace
    if (currentState.generatedFiles) {
      await writeGeneratedProject(currentState.project.id, currentState.generatedFiles.files);
    }

    // Compile Gate helper
    const runCompile = async () => {
      return runProcess("npx", ["tsc", "--noEmit"], { cwd: workspacePath });
    };

    // Build Gate helper 
    const runBuild = async () => {
      const buildCmd = currentState.generatedFiles?.commands.build || "npm run build";
      const [cmd, ...args] = buildCmd.split(" ");
      return runProcess(cmd, args, { cwd: workspacePath });
    };

    // 2. Compile Gate (Max 2 repairs)
    let compileResult = await runCompile();
    let compileAttempts = 0;
    while (!compileResult.success && compileAttempts < 2) {
      compileAttempts++;
      currentState.gateAttempts['compile'] = compileAttempts;
      console.log(`[GateRunner] Compile failed. Triggering repair attempt ${compileAttempts}...`);
      
      emit("repair_started");
      const startRepair = performance.now();
      await this.repairEngine.executeGateRepair(
        currentState, 
        "Compile", 
        compileResult.stdout + "\n" + compileResult.stderr
      );
      emit("repair_completed", performance.now() - startRepair);
      
      await writeGeneratedProject(currentState.project.id, currentState.generatedFiles!.files);
      compileResult = await runCompile();
    }

    if (!compileResult.success) {
      console.error("[GateRunner] Compile gate failed after max repairs.");
      currentState.errors.push("Compile failed: " + compileResult.stdout);
      return currentState;
    }

    // 3. Build Gate (Max 1 repair)
    let buildResult = await runBuild();
    let buildAttempts = 0;
    while (!buildResult.success && buildAttempts < 1) {
      buildAttempts++;
      currentState.gateAttempts['build'] = buildAttempts;
      console.log(`[GateRunner] Build failed. Triggering repair attempt ${buildAttempts}...`);
      
      emit("repair_started");
      const startRepair = performance.now();
      await this.repairEngine.executeGateRepair(
        currentState, 
        "Build", 
        buildResult.stdout + "\n" + buildResult.stderr
      );
      emit("repair_completed", performance.now() - startRepair);
      
      await writeGeneratedProject(currentState.project.id, currentState.generatedFiles!.files);
      buildResult = await runBuild();
    }

    if (!buildResult.success) {
      console.error("[GateRunner] Build gate failed after max repairs.");
      currentState.errors.push("Build failed: " + buildResult.stdout);
      return currentState;
    }

    // 4. Runtime / Preview Gate
    const devCmd = currentState.generatedFiles?.commands.dev || "npm run dev";
    try {
      console.log(`[GateRunner] Launching preview...`);
      const runtimeState = await startPreviewOnly(currentState.project.id, devCmd);
      if (runtimeState.preview) {
        currentState.previewUrl = runtimeState.preview.url;
      }
    } catch (err: any) {
      console.error("[GateRunner] Preview crashed. Triggering runtime repair...");
      currentState.gateAttempts['runtime'] = 1;
      
      emit("repair_started");
      const startRepair = performance.now();
      await this.repairEngine.executeGateRepair(
        currentState, 
        "Runtime", 
        err.message || "Unknown runtime crash"
      );
      emit("repair_completed", performance.now() - startRepair);
      
      await writeGeneratedProject(currentState.project.id, currentState.generatedFiles!.files);
      try {
        const retryState = await startPreviewOnly(currentState.project.id, devCmd);
        if (retryState.preview) {
          currentState.previewUrl = retryState.preview.url;
        }
      } catch (retryErr: any) {
         currentState.errors.push("Preview failed to start: " + retryErr.message);
      }
    }

    currentState.validationResult = { passed: true, issues: [] };
    return currentState;
  }
}
