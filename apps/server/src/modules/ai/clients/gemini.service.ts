import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env.js";
import { InternalServerError } from "../../lib/http-error.js";

export class GeminiService {
  private readonly client: GoogleGenAI;

  // Encapsulated Gemini configuration
  private readonly generationConfig = {
    temperature: env.GEMINI_TEMPERATURE,
    maxOutputTokens: env.GEMINI_MAX_OUTPUT_TOKENS,
  };
  private readonly requestTimeoutMs = env.GEMINI_TIMEOUT_MS;

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });
  }

  /**
   * Generates unstructured text based on a given prompt.
   * Includes retry and timeout mechanisms.
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      return await this.withRetry(async (activeModel) => {
        const response = await this.withTimeout(
          this.client.models.generateContent({
            model: activeModel,
            contents: prompt,
            config: {
              ...this.generationConfig,
              systemInstruction,
            },
          })
        );

        if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
          throw new Error("MAX_TOKENS_EXCEEDED");
        }

        if (!response.text) {
          throw new Error("Empty response from Gemini API");
        }

        return response.text;
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Generates a structured JSON response mapped to type T based on the provided schema.
   */
  async generateStructured<T>(
    prompt: string,
    responseSchema: object,
    systemInstruction?: string,
    config?: { temperature?: number },
  ): Promise<T> {
    try {
      return await this.withRetry(async (activeModel) => {
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
          })
        );

        if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
          console.warn("[GeminiService] Response truncated: MAX_TOKENS reached.");
          throw new Error("MAX_TOKENS_EXCEEDED");
        }

        if (!response.text) {
          throw new Error("Empty response from Gemini API");
        }

        return this.parseStructuredResponse<T>(response.text);
      });
    } catch (error) {
      this.handleError(error);
    }
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
  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Request timed out"));
      }, this.requestTimeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Executes a given async function routing through fallback models on availability errors.
   */
  private async withRetry<T>(fn: (model: string) => Promise<T>): Promise<T> {
    const models = env.GEMINI_MODELS;
    const attemptedModels: string[] = [];

    console.log(`[GeminiService] Starting request with primary model: ${models[0]}`);

    for (let i = 0; i < models.length; i++) {
      const currentModel = models[i];
      attemptedModels.push(currentModel);

      try {
        const result = await fn(currentModel);
        if (i > 0) {
          console.log(`[GeminiService] Final successful fallback model: ${currentModel}`);
        }
        return result;
      } catch (error: unknown) {
        // Determine if error is transient safely without using 'any'
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

        if (!isTransient) {
          throw error; // Schema validation failure, malformed JSON, invalid prompt
        }

        let reason = "Unknown transient error";
        if (isRateLimit) reason = "429 Quota Exceeded / Rate Limited";
        else if (isNotFound) reason = "404 Model Unavailable / Deprecated";
        else if (isServerFailure) reason = `${status} Server Error`;
        else if (isTimeout) reason = "Request Timeout";
        else if (isNetworkFailure) reason = "Network Failure";

        if (i < models.length - 1) {
          const nextModel = models[i + 1];
          console.log(`[GeminiService] Request failed on ${currentModel}. Reason: ${reason}`);
          console.log(`[GeminiService] Fallback switching to next priority model: ${nextModel}`);
        } else {
          console.log(`[GeminiService] Request failed on ${currentModel}. Reason: ${reason}`);
        }
      }
    }
    
    console.error(`[GeminiService] All fallback models exhausted. Models attempted: ${attemptedModels.join(", ")}`);
    throw new InternalServerError("An error occurred while communicating with the AI service. All fallback models failed.");
  }
}
