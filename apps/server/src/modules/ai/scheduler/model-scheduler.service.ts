import { env } from "../../../config/env.js";
import { ModelMetrics } from "./types.js";

/**
 * AI Execution Scheduler Foundation
 * 
 * Future Compatibility:
 * The ModelSchedulerService must be designed as a provider-agnostic scheduling layer. 
 * Although Phase 7 currently routes only Gemini requests, the scheduler should not contain 
 * Gemini-specific business logic beyond model identifiers. Future providers (OpenAI, 
 * Anthropic, Groq, etc.) should be able to plug into the same scheduling infrastructure 
 * without requiring architectural changes. The scheduler is an execution orchestration 
 * service, not a Gemini service.
 */
export class ModelSchedulerService {
  private models = new Map<string, ModelMetrics>();
  private readonly baseCooldownMs: number;
  private readonly maxCooldownMs = 300000; // 5 minutes

  constructor() {
    this.baseCooldownMs = env.MODEL_COOLDOWN_MS || 30000;
    this.initializeModels();
  }

  private initializeModels() {
    const modelNames = env.GEMINI_MODELS;
    
    for (let i = 0; i < modelNames.length; i++) {
      const name = modelNames[i];
      this.models.set(name, {
        name,
        priority: i,
        status: "available",
        activeRequests: 0,
        successCount: 0,
        failureCount: 0,
        timeoutCount: 0,
        rateLimitCount: 0,
        averageLatencyMs: 0,
        averageAcquireTimeMs: 0,
        acquireCalls: 0,
        consecutiveFailures: 0,
        cooldownExpiryTimestamp: null,
      });
    }
  }

  /**
   * Refreshes model statuses by checking cooldown expirations.
   * This is called before acquiring a model to ensure accurate state.
   */
  private refreshCooldowns() {
    const now = Date.now();
    for (const model of this.models.values()) {
      if (model.status === "coolingDown" && model.cooldownExpiryTimestamp !== null) {
        if (now >= model.cooldownExpiryTimestamp) {
          model.status = "available";
          model.cooldownExpiryTimestamp = null;
          // We do NOT reset consecutive failures here. 
          // We only reset consecutive failures on a successful request.
        }
      }
    }
  }

  public getHealthyModelCount(): number {
    this.refreshCooldowns();
    return Array.from(this.models.values()).filter(m => m.status === "available").length;
  }

  public getMetrics() {
    let successfulRequests = 0;
    let failureCount = 0;
    let timeouts = 0;
    let rateLimits = 0;
    let totalAcquireTime = 0;
    let acquireCalls = 0;

    let slowestModel = "";
    let fastestModel = "";
    let slowestTime = 0;
    let fastestTime = Infinity;

    for (const model of this.models.values()) {
      successfulRequests += model.successCount;
      failureCount += model.failureCount;
      timeouts += model.timeoutCount;
      rateLimits += model.rateLimitCount;
      totalAcquireTime += (model.averageAcquireTimeMs * model.acquireCalls);
      acquireCalls += model.acquireCalls;
      
      if (model.averageLatencyMs > slowestTime && model.successCount > 0) {
        slowestTime = model.averageLatencyMs;
        slowestModel = model.name;
      }
      if (model.averageLatencyMs < fastestTime && model.successCount > 0) {
        fastestTime = model.averageLatencyMs;
        fastestModel = model.name;
      }
    }

    return {
      successfulRequests,
      failureCount,
      timeouts,
      rateLimits,
      averageAcquireTimeMs: acquireCalls > 0 ? totalAcquireTime / acquireCalls : 0,
      slowestModel,
      fastestModel,
      averageGenerationTime: successfulRequests > 0 ? Array.from(this.models.values()).reduce((acc, m) => acc + (m.averageLatencyMs * m.successCount), 0) / successfulRequests : 0
    };
  }

  /**
   * Acquires the best available model.
   * Concurrency Safe: Synchronously selects a model and increments its active request count.
   * If no models are available, it waits until the earliest cooldown expires and retries.
   */
  public async acquireModel(): Promise<string> {
    // We use a loop for automatic retry when all models are cooling down.
    while (true) {
      this.refreshCooldowns();

      const availableModels = Array.from(this.models.values()).filter(m => m.status === "available");

      if (availableModels.length > 0) {
        // Sort: Priority (lowest index is best) -> Lowest Active Requests -> Lowest Average Latency
        availableModels.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          if (a.activeRequests !== b.activeRequests) {
            return a.activeRequests - b.activeRequests;
          }
          return a.averageLatencyMs - b.averageLatencyMs;
        });

        const selected = availableModels[0];
        
        // Synchronously mark as active to prevent race conditions across parallel calls
        selected.activeRequests += 1;
        
        console.log(`[Scheduler] Selected: ${selected.name} | Active: ${selected.activeRequests}`);
        
        return selected.name;
      }

      // No models available. Find the earliest cooldown expiry.
      let earliestExpiry = Infinity;
      const coolingModels = Array.from(this.models.values()).filter(m => m.status === "coolingDown");
      
      const cooldownLogs = coolingModels.map(m => {
        const remaining = m.cooldownExpiryTimestamp ? Math.max(0, m.cooldownExpiryTimestamp - Date.now()) : 0;
        if (m.cooldownExpiryTimestamp && m.cooldownExpiryTimestamp < earliestExpiry) {
          earliestExpiry = m.cooldownExpiryTimestamp;
        }
        return `${m.name} (${Math.ceil(remaining / 1000)}s remaining)`;
      }).join(", ");

      console.warn(`[Scheduler] All models unavailable. Cooldowns: ${cooldownLogs}`);

      const waitTimeMs = Math.max(100, earliestExpiry - Date.now());
      console.log(`[Scheduler] Waiting ${Math.ceil(waitTimeMs / 1000)}s for a model to become available...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));
    }
  }

  public reportSuccess(modelName: string, durationMs: number, acquireDurationMs: number = 0) {
    const model = this.models.get(modelName);
    if (!model) return;

    model.activeRequests = Math.max(0, model.activeRequests - 1);
    model.successCount += 1;
    model.consecutiveFailures = 0; // Reset consecutive failures on success
    model.status = "available";
    model.cooldownExpiryTimestamp = null;
    
    model.acquireCalls += 1;
    if (model.averageAcquireTimeMs === 0) {
      model.averageAcquireTimeMs = acquireDurationMs;
    } else {
      model.averageAcquireTimeMs = (model.averageAcquireTimeMs * 0.8) + (acquireDurationMs * 0.2);
    }

    // Moving average (simple)
    if (model.averageLatencyMs === 0) {
      model.averageLatencyMs = durationMs;
    } else {
      model.averageLatencyMs = (model.averageLatencyMs * 0.8) + (durationMs * 0.2);
    }
  }

  public reportFailure(modelName: string, error: unknown, acquireDurationMs: number = 0) {
    const model = this.models.get(modelName);
    if (!model) return;

    model.activeRequests = Math.max(0, model.activeRequests - 1);
    model.failureCount += 1;
    
    model.acquireCalls += 1;
    if (model.averageAcquireTimeMs === 0) {
      model.averageAcquireTimeMs = acquireDurationMs;
    } else {
      model.averageAcquireTimeMs = (model.averageAcquireTimeMs * 0.8) + (acquireDurationMs * 0.2);
    }

    // Determine if error is transient
    const isTimeout = error instanceof Error && error.message === "Request timed out";
    const errObj = error as Record<string, unknown>;
    const status = typeof errObj?.status === "number" ? errObj.status : undefined;
    const code = typeof errObj?.code === "string" ? errObj.code : undefined;
    const name = error instanceof Error ? error.name : typeof errObj?.name === "string" ? errObj.name : undefined;

    const isRateLimit = status === 429;
    const isNotFound = status === 404;
    const isServerFailure = status !== undefined && status >= 500 && status < 600;
    const isNetworkFailure = code === "ECONNRESET" || code === "ETIMEDOUT" || name === "FetchError";

    const isTransient = isTimeout || isRateLimit || isServerFailure || isNetworkFailure || isNotFound;

    if (isTransient) {
      model.consecutiveFailures += 1;
      
      let cooldownMs = 0;
      let reason = "Unknown transient error";

      if (isRateLimit) {
        model.rateLimitCount += 1;
        reason = "429 Quota Exceeded / Rate Limited";
        // Exponential backoff
        const multiplier = Math.pow(2, model.consecutiveFailures - 1); // 1st = 1, 2nd = 2, 3rd = 4...
        cooldownMs = Math.min(this.baseCooldownMs * multiplier, this.maxCooldownMs);
      } else if (isServerFailure) {
        reason = `${status} Server Error`;
        // Short cooldown for 500s
        cooldownMs = 2000;
      } else if (isTimeout) {
        model.timeoutCount += 1;
        reason = "Request Timeout";
        // No cooldown
      } else if (isNetworkFailure) {
        reason = "Network Failure";
        // No cooldown
      } else if (isNotFound) {
        reason = "404 Model Unavailable / Deprecated";
        cooldownMs = this.maxCooldownMs; // effectively disable it
      }

      if (cooldownMs > 0) {
        model.status = "coolingDown";
        model.cooldownExpiryTimestamp = Date.now() + cooldownMs;
        console.warn(`[Scheduler] Model ${modelName} encountered transient failure: ${reason}. Cooldown applied: ${cooldownMs / 1000}s`);
      } else {
        console.warn(`[Scheduler] Model ${modelName} encountered transient failure: ${reason}. No cooldown applied, immediately failing over.`);
      }
    } else {
      // For non-transient failures (validation, etc.), we don't cool down the model.
      // The model itself is fine, the request was just bad.
      console.log(`[Scheduler] Model ${modelName} encountered non-transient failure. No cooldown applied.`);
    }
  }
}
