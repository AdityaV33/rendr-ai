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
     
    responseSchema: any,
    systemInstruction?: string,
    config?: { temperature?: number; timeoutMs?: number; taskName?: string }
  ): Promise<T> {
    const context = pipelineRunContext.getStore();
    if (!context) {
      console.warn("[GroqScheduler] Execution outside of pipeline run context! Exclusions will not be tracked.");
    }
    const excludedModels = context?.groqExcludedModels || new Set<string>();
    const cooldowns = context?.groqModelCooldowns || new Map<string, number>();

    let localizedRetries = 0;
    const MAX_LOCAL_RETRIES = 1;
    let currentPrompt = prompt;
    let previousModel: string | null = null;

    while (true) {
      if (context?.abortSignal?.aborted) {
        throw new InternalServerError("Pipeline aborted");
      }

      const availableModels = env.GROQ_MODELS.filter(m => !excludedModels.has(m));
      if (availableModels.length === 0) {
        throw new InternalServerError("All configured Groq models exhausted");
      }

      const now = Date.now();
      const readyModels = availableModels.filter(m => !cooldowns.has(m) || now > cooldowns.get(m)!);

      if (readyModels.length > 0) {
        const currentModel = readyModels[0];
        
        if (currentModel !== previousModel) {
          localizedRetries = 0;
          currentPrompt = prompt;
          previousModel = currentModel;
        }

        try {
          return await this.groqService.generateStructured<T>(currentPrompt, responseSchema, systemInstruction, {
            ...config,
            model: currentModel,
          });
        } catch (error) {
          if (error instanceof GroqStructuredOutputError && localizedRetries < MAX_LOCAL_RETRIES) {
            localizedRetries++;
            console.warn(`[GroqScheduler][${config?.taskName || "Unknown"}] Model ${currentModel} failed schema validation. Local retry ${localizedRetries}/${MAX_LOCAL_RETRIES}.`);
            currentPrompt = `${prompt}\n\nSCHEMA VALIDATION FEEDBACK:\n${error.message}`;
            continue;
          }

          if (error instanceof GroqRateLimitError) {
            if (error.retryAfterMs > 120000) {
              console.warn(`[GroqScheduler][${config?.taskName || "Unknown"}] Model ${currentModel} rate limited for > 2m (${error.retryAfterMs}ms). Excluded.`);
              excludedModels.add(currentModel);
            } else {
              console.warn(`[GroqScheduler][${config?.taskName || "Unknown"}] Model ${currentModel} rate limited. Cooldown for ${error.retryAfterMs}ms.`);
              cooldowns.set(currentModel, Date.now() + error.retryAfterMs);
            }
            continue;
          }

          if (
            error instanceof GroqTransientError ||
            error instanceof GroqPermanentError ||
            error instanceof GroqStructuredOutputError ||
            error instanceof GroqTimeoutError
          ) {
            console.warn(`[GroqScheduler][${config?.taskName || "Unknown"}] Model ${currentModel} failed (${error instanceof Error ? error.name : "Unknown"}). Excluded.`);
            excludedModels.add(currentModel);
            continue;
          }

          console.error(`[GroqScheduler][${config?.taskName || "Unknown"}] Unrecognized error on model ${currentModel}. Excluded.`, error);
          excludedModels.add(currentModel);
          continue;
        }
      } else {
        const shortestWait = Math.min(...availableModels.map(m => cooldowns.get(m)! - Date.now()));
        
        if (shortestWait > 120000) {
          throw new InternalServerError(`All configured Groq models exhausted (cooldowns too long: ${shortestWait}ms)`);
        }
        
        console.log(`[GroqScheduler][${config?.taskName || "Unknown"}] All models on cooldown. Waiting ${shortestWait}ms...`);
        await new Promise(r => setTimeout(r, shortestWait + 1000)); // +1s buffer
        continue;
      }
    }
  }
}
