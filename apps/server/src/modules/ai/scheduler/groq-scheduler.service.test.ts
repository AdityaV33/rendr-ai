import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroqSchedulerService } from "./groq-scheduler.service.js";
import { GroqService, GroqRateLimitError, GroqStructuredOutputError } from "../clients/groq.service.js";
import { pipelineRunContext } from "../utils/run-context.js";
import { env } from "../../../config/env.js";

describe("GroqSchedulerService Cooldown Logic", () => {
  let mockGroqService: any;
  let scheduler: GroqSchedulerService;

  beforeEach(() => {
    mockGroqService = {
      generateStructured: vi.fn(),
    };
    scheduler = new GroqSchedulerService(mockGroqService as unknown as GroqService);
    // Mock the env models
    env.GROQ_MODELS = ["model-A", "model-B"];
  });

  it("should wait and retry if all models are on cooldown", async () => {
    let callCount = 0;
    
    mockGroqService.generateStructured.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // model-A gets a short rate limit
        throw new GroqRateLimitError("Rate limit A", 100);
      }
      if (callCount === 2) {
        // model-B gets a short rate limit
        throw new GroqRateLimitError("Rate limit B", 200);
      }
      if (callCount === 3) {
        // model-A retries successfully after wait
        return { success: true };
      }
    });

    const start = Date.now();

    const result = await pipelineRunContext.run(
      { 
        blacklistedModels: new Set<string>(), 
        groqExcludedModels: new Set<string>(), 
        groqModelCooldowns: new Map<string, number>() 
      },
      async () => {
        return scheduler.generateStructured("test prompt", {}, "system instructions");
      }
    );

    const elapsed = Date.now() - start;

    expect(result).toEqual({ success: true });
    expect(callCount).toBe(3);
    expect(elapsed).toBeGreaterThanOrEqual(100); // Because it should have awaited the shortest cooldown
  });
  
  it("should permanently exclude a model if its cooldown is too long", async () => {
    mockGroqService.generateStructured.mockImplementation(async (prompt: string, schema: any, sys: any, config: any) => {
      if (config.model === "model-A") {
        throw new GroqRateLimitError("TPD limit", 150000); // 2.5 minutes
      }
      if (config.model === "model-B") {
        return { success: "B" };
      }
    });

    const excluded = new Set<string>();
    const result = await pipelineRunContext.run(
      { 
        blacklistedModels: new Set<string>(), 
        groqExcludedModels: excluded, 
        groqModelCooldowns: new Map<string, number>() 
      },
      async () => {
        return scheduler.generateStructured("test prompt", {}, "system instructions");
      }
    );

    expect(result).toEqual({ success: "B" });
    expect(excluded.has("model-A")).toBe(true);
  });
});
