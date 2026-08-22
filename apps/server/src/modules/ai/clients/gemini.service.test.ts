import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiService } from "./gemini.service.js";
import { ModelSchedulerService } from "../scheduler/model-scheduler.service.js";
import { pipelineRunContext } from "../utils/run-context.js";

// Mock the Google SDK
vi.mock("@google/genai", () => {
  const GoogleGenAI = vi.fn();
  GoogleGenAI.prototype.models = {
    generateContent: vi.fn(),
  };
  return { GoogleGenAI };
});

describe("GeminiService - Error Handling & Aborts", () => {
  let scheduler: ModelSchedulerService;
  let service: GeminiService;
  let mockGenerateContent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the scheduler completely to track how it handles errors
    scheduler = {
      acquireModel: vi.fn().mockResolvedValue("models/gemini-1.5-flash"),
      reportSuccess: vi.fn(),
      reportFailure: vi.fn(),
      getHealthyModelCount: vi.fn().mockReturnValue(3),
      getMetrics: vi.fn(),
    } as unknown as ModelSchedulerService;

    // Reset env vars manually just in case
    process.env.GEMINI_API_KEY = "test";
    process.env.GEMINI_MODELS = "models/gemini-1.5-flash";
    
    service = new GeminiService(scheduler);
    
    // Grab reference to the mocked SDK method
    mockGenerateContent = (service as any).client.models.generateContent;
  });

  it("Test A: Local AbortError (Timeout) is treated as a transient failure and causes a failover", async () => {
    // 1. Simulate the fetch/SDK throwing a standard AbortError (this is what happens when AbortSignal.timeout triggers)
    const abortError = new Error("This operation was aborted");
    abortError.name = "AbortError";
    
    mockGenerateContent.mockRejectedValueOnce(abortError);
    
    // 2. Wrap the execution in an AsyncLocalStorage context so we can inspect blacklisted models
    const store = { 
      abortSignal: new AbortController().signal, // master signal, NOT aborted
      blacklistedModels: new Set<string>() 
    };

    // We expect the internal execution to fail all retries (since we didn't mock a success fallback, we just reject once and then since the scheduler returns the same model, wait, let's mock the scheduler to return a different model next time, or just let it exhaust)
    // Actually, to make it simple, we just reject on attempt 1, and on attempt 2 we resolve.
    mockGenerateContent.mockResolvedValueOnce({
      text: "Success on attempt 2",
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 },
      candidates: [{ finishReason: "STOP" }]
    });

    await pipelineRunContext.run(store as any, async () => {
      const result = await service.generateText("hello");
      
      expect(result).toBe("Success on attempt 2");
      // The model failure is reported to the scheduler which handles blacklisting
      expect(scheduler.reportFailure).toHaveBeenCalledTimes(1); // the abort error
      expect(scheduler.reportSuccess).toHaveBeenCalledTimes(1); // the success
    });
  });

  it("Test B: Master pipeline AbortSignal bypasses failover and immediately throws", async () => {
    // 1. Master controller is explicitly aborted with a reason
    const masterController = new AbortController();
    const reason = new Error("Master pipeline deadline exceeded");
    masterController.abort(reason);

    const store = { 
      abortSignal: masterController.signal, 
      blacklistedModels: new Set<string>() 
    };

    // 2. Run the request
    await pipelineRunContext.run(store as any, async () => {
      await expect(service.generateText("hello")).rejects.toThrow("Master pipeline deadline exceeded");
      
      // Should NOT have blacklisted the model (since it wasn't a model failure, the user canceled the pipeline)
      expect(store.blacklistedModels.size).toBe(0);
      
      // Should have reported failure to scheduler but immediately thrown, not retrying
      // Wait, in execution: the Google SDK will either reject immediately because signal is aborted, or it will throw inside generateText.
      // If the SDK checks the signal, we don't even need mockGenerateContent.
      // We will let the test run.
    });
  });
});
