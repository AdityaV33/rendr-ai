import type { ArchitecturePlan } from "../types/architecture-plan.types.js";

type FilePlan = ArchitecturePlan["fileStructure"][0];

export interface FileComplexity {
  file: FilePlan;
  score: number;
}

interface BatchHistory {
  totalTokens: number;
  durationMs: number;
  maxTokensFailures: number;
  count: number;
}

export class BatchEstimatorService {
  // Track history by file type or category
  private history: Record<string, BatchHistory> = {};

  private getCategory(path: string): string {
    const lower = path.toLowerCase();
    if (lower.includes("/pages/") || lower.includes("/views/") || lower.includes("/app/")) return "pages";
    if (lower.includes("/components/")) return "components";
    if (lower.includes("/hooks/")) return "hooks";
    if (lower.includes("/context/") || lower.includes("/store/") || lower.includes("/state/")) return "context";
    return "root";
  }

  private getBaseEstimate(file: { path: string; purpose: string; complexity?: "low" | "medium" | "high" }): number {
    let tokens = 1000;

    const category = this.getCategory(file.path);
    if (category === "root") tokens = 1000;
    else if (category === "pages") tokens = 3000;
    else if (category === "components") tokens = 2000;
    else if (category === "hooks") tokens = 1500;
    else if (category === "context") tokens = 2500;

    // Apply complexity multiplier from Architect
    if (file.complexity === "high") tokens *= 1.5;
    else if (file.complexity === "low") tokens *= 0.5;

    // Give some weight to the length of the description itself
    const descriptionTokens = Math.min(file.purpose.length / 2, 500);
    tokens += descriptionTokens;

    return tokens;
  }

  /**
   * Estimates the output tokens for a single file, blending static heuristics 
   * with historical performance.
   */
  public estimateFileTokens(file: { path: string; purpose: string; complexity?: "low" | "medium" | "high" }): number {
    let baseTokens = this.getBaseEstimate(file);

    const category = this.getCategory(file.path);

    const hist = this.history[category];
    if (hist && hist.count > 0) {
      const avgTokens = hist.totalTokens / hist.count;
      
      let historyScore = avgTokens;
      
      // Auto-calibration: progressively inflate the weight if max tokens failed historically
      if (hist.maxTokensFailures > 0) {
        historyScore *= Math.pow(1.5, hist.maxTokensFailures);
      }
      
      // Blend heuristic and historical
      baseTokens = (baseTokens + historyScore) / 2;
    }

    return Math.round(baseTokens);
  }
  
  /**
   * Legacy interface for generator stable packing 
   * (Returns tokens instead of an arbitrary score now)
   */
  public estimateFile(file: FilePlan): FileComplexity {
    return {
      file,
      score: this.estimateFileTokens(file)
    };
  }

  /**
   * Checks if any file in the plan exceeds the maximum safe limit.
   * If true, it returns the offending files.
   */
  public identifyOversizedFiles(
    files: Array<{ path: string; purpose: string; complexity?: "low" | "medium" | "high" }>,
    limit: number = 7000
  ): string[] {
    const oversized: string[] = [];
    for (const file of files) {
      const estimated = this.estimateFileTokens(file);
      if (estimated > limit) {
        oversized.push(`${file.path} (~${estimated} tokens)`);
      }
    }
    return oversized;
  }

  /**
   * Updates the historical learning data for a batch
   */
  public recordBatch(
    files: string[], 
    durationMs: number, 
    tokens: number, 
    failedMaxTokens: boolean
  ) {
    if (files.length === 0) return;
    
    const perFileTokens = tokens / files.length;
    const perFileDuration = durationMs / files.length;

    for (const file of files) {
      const category = this.getCategory(file);
      if (!this.history[category]) {
        this.history[category] = { totalTokens: 0, durationMs: 0, maxTokensFailures: 0, count: 0 };
      }

      this.history[category].count += 1;
      this.history[category].totalTokens += perFileTokens;
      this.history[category].durationMs += perFileDuration;
      if (failedMaxTokens) {
        this.history[category].maxTokensFailures += 1;
      }
    }
  }
}
