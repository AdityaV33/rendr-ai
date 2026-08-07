import type { GenerationState } from "../state.js";
import type { ArchitectService } from "../../architect/architect.service.js";

/**
 * ArchitectNode: Responsible for defining the file structure and
 * technical architecture based on the project plan.
 */
export class ArchitectNode {
  constructor(private readonly architectService: ArchitectService) {}

  async execute(state: GenerationState): Promise<GenerationState> {
    if (!state.plan) {
      throw new Error("ArchitectNode requires state.plan");
    }

    const architecture = await this.architectService.designArchitecture(
      state.plan,
      state.architectFeedback
    );
    
    // Integrity Validation for Behavioral Contracts
    const filePaths = new Set(architecture.fileStructure.filter(f => f.type === "file").map(f => f.path));
    const contractPaths = new Set<string>();
    const missingFiles: string[] = [];
    const duplicates: string[] = [];

    for (const contract of architecture.behavioralContracts) {
      if (contractPaths.has(contract.file)) {
        duplicates.push(contract.file);
      }
      contractPaths.add(contract.file);
      if (!filePaths.has(contract.file)) {
        missingFiles.push(contract.file);
      }
    }

    const interactiveCandidates = architecture.fileStructure.filter(f => 
      f.type === "file" && 
      (f.path.includes("/components/") || f.path.includes("/context/") || f.path.includes("/pages/") || f.path.includes("/hooks/")) &&
      !f.path.includes("types") && !f.path.includes("index")
    );

    console.log(`[ArchitectNode] Integrity Check:`);
    console.log(`- Interactive File Candidates: ${interactiveCandidates.length}`);
    console.log(`- Behavioral Contracts: ${architecture.behavioralContracts.length}`);

    if (missingFiles.length > 0 || duplicates.length > 0) {
      let errorMsg = "[ArchitectNode] Behavioral Contracts Integrity Failure:\n";
      if (missingFiles.length > 0) errorMsg += `- Contracts reference missing files: ${missingFiles.join(", ")}\n`;
      if (duplicates.length > 0) errorMsg += `- Duplicate contracts for files: ${duplicates.join(", ")}\n`;
      throw new Error(errorMsg);
    }

    // Note: We don't throw if interactiveCandidates != behavioralContracts because some candidates are purely presentational.
    // However, if the LLM emitted 0 contracts, we should definitely throw to trigger a retry.
    if (interactiveCandidates.length > 0 && architecture.behavioralContracts.length === 0) {
      throw new Error("[ArchitectNode] Behavioral Contracts Integrity Failure: 0 behavioral contracts generated for an interactive application.");
    }

    return {
      ...state,
      architecture,
    };
  }
}
