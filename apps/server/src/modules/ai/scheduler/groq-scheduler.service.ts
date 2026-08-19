import { env } from "../../../config/env.js";
import { InternalServerError } from "../../lib/http-error.js";
import { pipelineRunContext } from "../utils/run-context.js";
import {
  GroqService,
  GroqRateLimitError,
  GroqTransientError,
  GroqPermanentError,
  GroqStructuredOutputError,
  GroqTimeoutError
} from "../clients/groq.service.js";

export class GroqSchedulerService {
  constructor(private readonly groqService: GroqService) {}

  async generateStructured<T>(
    prompt: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseSchema: any,
    systemInstruction?: string,
    config?: { temperature?: number; timeoutMs?: number; taskName?: string }
  ): Promise<T> {
    const context = pipelineRunContext.getStore();
    if (!context) {
      console.warn("[GroqScheduler] Execution outside of pipeline run context! Exclusions will not be tracked.");
    }
    const excludedModels = context?.groqExcludedModels || new Set<string>();

    for (const model of env.GROQ_MODELS) {
      if (excludedModels.has(model)) {
        continue;
      }

      try {
        return await this.groqService.generateStructured<T>(prompt, responseSchema, systemInstruction, {
          ...config,
          model,
        });
      } catch (error) {
        if (
          error instanceof GroqRateLimitError ||
          error instanceof GroqTransientError ||
          error instanceof GroqPermanentError ||
          error instanceof GroqStructuredOutputError ||
          error instanceof GroqTimeoutError
        ) {
          console.warn(`[GroqScheduler][${config?.taskName || "Unknown"}] Model ${model} failed (${error.name}). Action: Excluded for remainder of run.`);
          excludedModels.add(model);
          
          // Log fallback event
          const nextModel = env.GROQ_MODELS.find(m => !excludedModels.has(m));
          if (nextModel) {
            console.log(`[GroqScheduler][${config?.taskName || "Unknown"}] Fallback from ${model} to ${nextModel}.`);
          }
          continue;
        }

        // If it's a completely unexpected error (e.g. network failure on fetch itself without a status code, though fetch usually throws TypeError),
        // we should probably also exclude and continue, but we only catch explicit ones. Let's catch all Errors and exclude to be safe, 
        // but since we mapped everything to explicit errors, this is fine.
        console.error(`[GroqScheduler][${config?.taskName || "Unknown"}] Unrecognized error on model ${model}. Action: Excluded for remainder of run.`, error);
        excludedModels.add(model);
        
        const nextModel = env.GROQ_MODELS.find(m => !excludedModels.has(m));
        if (nextModel) {
          console.log(`[GroqScheduler][${config?.taskName || "Unknown"}] Fallback from ${model} to ${nextModel}.`);
        }
        continue;
      }
    }

    throw new InternalServerError("All configured Groq models exhausted");
  }
}
