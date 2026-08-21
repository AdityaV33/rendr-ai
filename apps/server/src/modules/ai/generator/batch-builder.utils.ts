import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import { env } from "../../../config/env.js";

export interface BatchGroup {
  id: string;
  files: ArchitecturePlan["fileStructure"];
  estimatedTokens: number;
}

export class BatchBuilder {
  /**
   * Estimates the output tokens required to generate a specific file.
   * This is a heuristic based on file metadata.
   */
  static estimateFileTokens(
    file: ArchitecturePlan["fileStructure"][0],
    architecturePlan: ArchitecturePlan
  ): number {
    let estimate = 400; // Base tokens for a typical React component/file

    if (file.path.toLowerCase().includes("app") || file.path.toLowerCase().includes("main")) {
      estimate += 300; // Root files are typically larger
    }

    if (file.allowedImports && file.allowedImports.length > 0) {
      estimate += file.allowedImports.length * 50;
    }

    const hasBehavior = architecturePlan.behavioralContracts?.some((c) => c.file === file.path);
    if (hasBehavior) {
      estimate += 300; // Interactive components take more tokens
    }

    // Add roughly the length of the purpose string (1 token ≈ 4 chars)
    estimate += Math.ceil((file.purpose?.length || 0) / 4);

    return estimate;
  }

  /**
   * Groups aiFiles into safe batches using a contract-aware dependency graph.
   */
  static buildBatches(
    aiFiles: ArchitecturePlan["fileStructure"],
    architecturePlan: ArchitecturePlan
  ): BatchGroup[] {
    const maxFiles = env.GENERATOR_BATCH_MAX_FILES;
    const maxTokens = env.GENERATOR_BATCH_MAX_OUTPUT_TOKENS;

    const batches: BatchGroup[] = [];
    const unassigned = new Set(aiFiles.map((f) => f.path));
    const fileMap = new Map(aiFiles.map((f) => [f.path, f]));

    let batchCounter = 1;

    // Helper to get component name from path (e.g. "src/components/Button.tsx" -> "Button")
    const getComponentName = (path: string) => {
      const parts = path.split("/");
      return parts[parts.length - 1].replace(/\.[^/.]+$/, "");
    };

    // Helper to find consumers of a file based on allowedImports
    const getConsumers = (targetPath: string) => {
      const targetName = getComponentName(targetPath);
      return aiFiles.filter((f) => {
        return unassigned.has(f.path) && f.allowedImports?.includes(targetName);
      });
    };

    while (unassigned.size > 0) {
      // 1. Pick a seed file (prefer Contexts, then anything else)
      let seedPath = Array.from(unassigned).find((p) => p.toLowerCase().includes("context"));
      if (!seedPath) {
        // Just pick the first available
        seedPath = Array.from(unassigned)[0];
      }

      const currentBatch: ArchitecturePlan["fileStructure"] = [];
      let currentTokens = 0;

      const addToBatch = (path: string) => {
        if (!unassigned.has(path)) return false;

        const file = fileMap.get(path)!;
        const estTokens = this.estimateFileTokens(file, architecturePlan);

        // Check limits (allow at least 1 file even if it exceeds budget)
        if (currentBatch.length > 0) {
          if (currentBatch.length >= maxFiles) return false;
          if (currentTokens + estTokens > maxTokens) return false;
        }

        currentBatch.push(file);
        currentTokens += estTokens;
        unassigned.delete(path);
        return true;
      };

      // Add the seed
      addToBatch(seedPath);

      // 2. Try to greedily add consumers of the files in the batch
      let addedInPass;
      do {
        addedInPass = false;
        // Copy the current batch array to iterate over it safely while growing it
        const currentFiles = [...currentBatch];
        for (const fileInBatch of currentFiles) {
          const consumers = getConsumers(fileInBatch.path);
          for (const consumer of consumers) {
            if (addToBatch(consumer.path)) {
              addedInPass = true;
            }
          }
        }
      } while (addedInPass && currentBatch.length < maxFiles);

      // If we still have room, just try to add sibling files from the same directory
      if (currentBatch.length < maxFiles) {
        const seedDir = seedPath.substring(0, seedPath.lastIndexOf("/"));
        for (const path of Array.from(unassigned)) {
          if (path.startsWith(seedDir)) {
            if (addToBatch(path)) break;
          }
        }
      }

      batches.push({
        id: `batch-${batchCounter++}`,
        files: currentBatch,
        estimatedTokens: currentTokens,
      });
    }

    return batches;
  }
}
