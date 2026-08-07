import type { GenerationState } from "../state.js";
import type { GraphEvent, GraphEventType } from "../types.js";
import type { SanityGateService } from "../../validator/sanity-gate.service.js";
import type { RepairEngineService } from "../../repair/repair-engine.service.js";
import { runProcess } from "../../../runtime/process.service.js";
import { getWorkspacePath } from "../../../runtime/workspace.service.js";
import { writeGeneratedProject } from "../../../runtime/workspace-file.service.js";
import { startPreviewOnly } from "../../../runtime/runtime-manager.service.js";
import { initializeRuntime, hasRuntime } from "../../../runtime/runtime.service.js";

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

    // Global Repair Budget
    let totalRepairAttempts = 0;
    const maxRepairAttempts = 3;
    let totalRepairTimeMs = 0;
    const maxRepairTimeMs = 90_000;

    const executeRepair = async (gate: string, errorOutput: string) => {
      if (totalRepairAttempts >= maxRepairAttempts) {
        throw new Error(`Repair budget exhausted (max ${maxRepairAttempts} attempts).`);
      }
      if (totalRepairTimeMs >= maxRepairTimeMs) {
        throw new Error(`Repair budget exhausted (max ${maxRepairTimeMs}ms).`);
      }
      
      totalRepairAttempts++;
      currentState.gateAttempts![gate.toLowerCase()] = (currentState.gateAttempts![gate.toLowerCase()] || 0) + 1;
      
      console.log(`[GateRunner] ${gate} failed. Triggering repair attempt ${totalRepairAttempts}...`);
      
      emit("repair_started");
      const startRepair = performance.now();
      await this.repairEngine.executeGateRepair(currentState, gate, errorOutput);
      const repairDuration = performance.now() - startRepair;
      totalRepairTimeMs += repairDuration;
      emit("repair_completed", repairDuration);
      
      await writeGeneratedProject(currentState.project.id, currentState.generatedFiles!.files);
    };

    const extractTscErrors = (output: string) => {
      // Basic extraction of file and error message to make repair more deterministic
      const lines = output.split('\\n');
      const errorLines = lines.filter(l => l.includes('error TS'));
      return errorLines.length > 0 ? errorLines.join('\\n') : output;
    };

    // 2. Compile Gate
    const framework = currentState.architecture?.stack?.frontendFramework;
    if (framework !== "vanilla-js") {
      let compileResult = await runCompile();
      while (!compileResult.success) {
        try {
          await executeRepair("Compile", extractTscErrors(compileResult.stdout + "\\n" + compileResult.stderr));
          compileResult = await runCompile();
        } catch (err: any) {
          console.error(`[GateRunner] Compile gate failed: ${err.message}`);
          currentState.errors.push("Compile failed: " + compileResult.stdout);
          currentState.validationResult = { passed: false, issues: [{ type: "typecheck", severity: "error", message: compileResult.stdout, file: "project", repairStrategy: "modify-file" }] };
          return currentState;
        }
      }
    }

    // 3. Build Gate
    let buildResult = await runBuild();
    while (!buildResult.success) {
      try {
        await executeRepair("Build", buildResult.stdout + "\\n" + buildResult.stderr);
        buildResult = await runBuild();
      } catch (err: any) {
        console.error(`[GateRunner] Build gate failed: ${err.message}`);
        currentState.errors.push("Build failed: " + buildResult.stdout);
        currentState.validationResult = { passed: false, issues: [{ type: "typecheck", severity: "error", message: buildResult.stdout, file: "project", repairStrategy: "modify-file" }] };
        return currentState;
      }
    }

    // 4. Runtime / Preview Gate
    const devCmd = currentState.generatedFiles?.commands.dev || "npm run dev";
    try {
      if (!hasRuntime(currentState.project.id)) {
        initializeRuntime(currentState.project.id);
      }
      
      console.log(`[GateRunner] Launching preview...`);
      const runtimeState = await startPreviewOnly(currentState.project.id, devCmd);
      if (runtimeState?.preview) {
        currentState.previewUrl = runtimeState.preview.url;
      }
    } catch (err: any) {
      // Runtime repair should only trigger if the server genuinely failed to start within the timeout
      // and we still have repair budget.
      console.error("[GateRunner] Preview crashed. Triggering runtime repair...");
      try {
        await executeRepair("Runtime", err.message || "Unknown runtime crash");
        
        const retryState = await startPreviewOnly(currentState.project.id, devCmd);
        if (retryState?.preview) {
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
