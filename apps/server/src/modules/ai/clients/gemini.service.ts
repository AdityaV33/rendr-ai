import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env.js";
import { InternalServerError } from "../../lib/http-error.js";

import { ModelSchedulerService } from "../scheduler/model-scheduler.service.js";

export class GeminiService {
  private readonly client: GoogleGenAI;
  private readonly scheduler: ModelSchedulerService;

  // Encapsulated Gemini configuration
  private readonly generationConfig = {
    temperature: env.GEMINI_TEMPERATURE,
    maxOutputTokens: env.GEMINI_MAX_OUTPUT_TOKENS,
  };
  private readonly defaultRequestTimeoutMs = env.GEMINI_TIMEOUT_MS;

  // Metrics for Benchmarking
  private totalApiCalls = 0;
  private totalPromptTokens = 0;
  private totalCompletionTokens = 0;
  private maxTokenSplits = 0;

  constructor(scheduler: ModelSchedulerService) {
    this.scheduler = scheduler;
    this.client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });
  }

  public getMetrics() {
    return {
      apiCalls: this.totalApiCalls,
      promptTokens: this.totalPromptTokens,
      completionTokens: this.totalCompletionTokens,
      maxTokenSplits: this.maxTokenSplits
    };
  }

  public recordMaxTokenSplit() {
    this.maxTokenSplits++;
  }

  public getSchedulerMetrics() {
    return this.scheduler.getMetrics();
  }

  public getHealthyModelCount(): number {
    return this.scheduler.getHealthyModelCount();
  }

  /**
   * Generates unstructured text based on a given prompt.
   * Includes retry and timeout mechanisms.
   */
  async generateText(prompt: string, systemInstruction?: string, config?: { timeoutMs?: number; taskName?: string }): Promise<string> {
    const timeoutMs = config?.timeoutMs || this.defaultRequestTimeoutMs;
    const taskName = config?.taskName || "Text Generation";
    
    return this.executeWithScheduler(async (activeModel) => {
      const response = await this.withTimeout(
        this.client.models.generateContent({
          model: activeModel,
          contents: prompt,
          config: {
            ...this.generationConfig,
            systemInstruction,
          },
        }),
        timeoutMs
      );

      this.totalApiCalls++;
      if (response.usageMetadata) {
        this.totalPromptTokens += response.usageMetadata.promptTokenCount || 0;
        this.totalCompletionTokens += response.usageMetadata.candidatesTokenCount || 0;
      }

      if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        throw new Error("MAX_TOKENS_EXCEEDED");
      }

      if (!response.text) {
        throw new Error("Empty response from Gemini API");
      }

      return response.text;
    }, taskName);
  }

  /**
   * Generates a structured JSON response mapped to type T based on the provided schema.
   */
  async generateStructured<T>(
    prompt: string,
    responseSchema: object,
    systemInstruction?: string,
    config?: { temperature?: number; timeoutMs?: number; taskName?: string },
  ): Promise<T> {
    const timeoutMs = config?.timeoutMs || this.defaultRequestTimeoutMs;
    const taskName = config?.taskName || "Structured Generation";
    
    return this.executeWithScheduler(async (activeModel) => {
      const response = await this.withTimeout(
        this.client.models.generateContent({
          model: activeModel,
          contents: prompt,
          config: {
            ...this.generationConfig,
            ...config,
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
        timeoutMs
      );

      this.totalApiCalls++;
      if (response.usageMetadata) {
        this.totalPromptTokens += response.usageMetadata.promptTokenCount || 0;
        this.totalCompletionTokens += response.usageMetadata.candidatesTokenCount || 0;
      }

      if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        console.warn("[GeminiService] Response truncated: MAX_TOKENS reached.");
        throw new Error("MAX_TOKENS_EXCEEDED");
      }

      if (!response.text) {
        throw new Error("Empty response from Gemini API");
      }

      return this.parseStructuredResponse<T>(response.text);
    }, taskName);
  }

  /**
   * Dedicated helper for parsing structured responses.
   * Will be reused by future planner, generator, and refiner services.
   */
  private parseStructuredResponse<T>(text: string): T {
    let cleaned = text.trim();

    // 1. Remove markdown code fences if present (e.g., ```json ... ``` or ``` ...)
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    // 2. Extract substring between first { or [ and last } or ] to handle preamble/postscript text
    const firstBrace = cleaned.search(/[{[]/);
    const lastBrace = cleaned.search(/[}\]][^}\]]*$/);
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1).trim();
    }

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      console.error("[GeminiService] Failed to parse structured JSON response.");
      throw new Error("Malformed JSON response from AI service.");
    }
  }

  /**
   * Centralized error handler to map SDK errors to application errors.
   */
  private handleError(error: unknown): never {
    if (error instanceof InternalServerError) {
      throw error;
    }

    if (error instanceof Error && error.message === "MAX_TOKENS_EXCEEDED") {
      throw error; // Allow this specific domain error to propagate
    }

    // Only log safe debugging information, not the full error payload which might contain sensitive data
    if (error instanceof Error) {
      console.error(`Gemini API Error: ${error.message}`);
    } else {
      console.error("Gemini API Error: Unknown error");
    }

    throw new InternalServerError("An error occurred while communicating with the AI service.");
  }

  /**
   * Enforces a maximum execution time for the provided promise.
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Request timed out"));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Executes a given async function using the ModelSchedulerService.
   */
  private async executeWithScheduler<T>(fn: (model: string) => Promise<T>, taskName: string): Promise<T> {
    const maxRetries = env.GEMINI_MODELS.length * 2; // Allow enough retries across models
    let attempt = 0;
    const taskStart = performance.now();
    const attemptsLog: string[] = [];

    while (attempt < maxRetries) {
      attempt++;
      const acquireStart = performance.now();
      const activeModel = await this.scheduler.acquireModel();
      const acquireDuration = performance.now() - acquireStart;
      
      const startTime = performance.now();

      try {
        const result = await fn(activeModel);
        const duration = performance.now() - startTime;
        this.scheduler.reportSuccess(activeModel, duration, acquireDuration);
        
        attemptsLog.push(`Attempt ${attempt}\nModel: ${activeModel}\nAcquire: ${acquireDuration.toFixed(0)}ms\nGeneration: Success (${(duration/1000).toFixed(1)}s)`);
        
        console.log(`\n--- Task: ${taskName} ---\n${attemptsLog.join("\n\n")}\n\nTotal:\nAttempts: ${attempt}\nTotal Time: ${((performance.now() - taskStart)/1000).toFixed(1)}s\n-------------------------`);
        
        return result;
      } catch (error: unknown) {
        const duration = performance.now() - startTime;
        this.scheduler.reportFailure(activeModel, error, acquireDuration);

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
        
        let resultReason = "Error";
        if (isTimeout) resultReason = `Timeout (${(duration/1000).toFixed(1)}s)`;
        else if (isRateLimit) resultReason = `429 Rate Limit (${(duration/1000).toFixed(1)}s)`;
        else if (isServerFailure) resultReason = `${status} Server Error (${(duration/1000).toFixed(1)}s)`;
        else if (isNetworkFailure) resultReason = `Network Error (${(duration/1000).toFixed(1)}s)`;
        
        attemptsLog.push(`Attempt ${attempt}\nModel: ${activeModel}\nAcquire: ${acquireDuration.toFixed(0)}ms\nGeneration: ${resultReason}`);

        if (!isTransient) {
          console.log(`\n--- Task: ${taskName} ---\n${attemptsLog.join("\n\n")}\n\nTotal:\nAttempts: ${attempt}\nTotal Time: ${((performance.now() - taskStart)/1000).toFixed(1)}s\n-------------------------`);
          // If it's a fatal error (like malformed JSON or validation), rethrow immediately.
          // The scheduler has already recorded the failure (but did not cool it down).
          this.handleError(error);
        }

        // It's a transient error, so we continue the while loop to retry with a new model
      }
    }

    console.log(`\n--- Task: ${taskName} [FAILED] ---\n${attemptsLog.join("\n\n")}\n\nTotal:\nAttempts: ${attempt}\nTotal Time: ${((performance.now() - taskStart)/1000).toFixed(1)}s\n-------------------------`);
    throw new InternalServerError("An error occurred while communicating with the AI service. Max scheduling retries exhausted.");
  }
}
