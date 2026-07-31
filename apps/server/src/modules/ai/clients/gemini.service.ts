import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env.js";
import { InternalServerError } from "../../lib/http-error.js";

export class GeminiService {
  private readonly client: GoogleGenAI;

  // Encapsulated Gemini configuration
  private readonly model = "gemini-2.0-flash";
  private readonly generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 8192,
  };
  private readonly requestTimeoutMs = 60000;

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
      return await this.withRetry(async () => {
        const response = await this.withTimeout(
          this.client.models.generateContent({
            model: this.model,
            contents: prompt,
            config: {
              ...this.generationConfig,
              systemInstruction,
            },
          })
        );

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
      return await this.withRetry(async () => {
        const response = await this.withTimeout(
          this.client.models.generateContent({
            model: this.model,
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
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      console.error("Failed to parse structured response from Gemini API");
      throw new Error("Malformed JSON response from AI service.");
    }
  }

  /**
   * Centralized error handler to map SDK errors to application errors.
   */
  private handleError(error: unknown): never {
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
   * Executes a given async function with an exponential backoff retry mechanism.
   * Only retries transient failures.
   */
  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (error: unknown) {
        attempt++;

        // Determine if error is transient safely without using 'any'
        const isTimeout = error instanceof Error && error.message === "Request timed out";
        
        const errObj = error as Record<string, unknown>;
        const status = typeof errObj?.status === "number" ? errObj.status : undefined;
        const code = typeof errObj?.code === "string" ? errObj.code : undefined;
        const name = error instanceof Error ? error.name : typeof errObj?.name === "string" ? errObj.name : undefined;

        const isRateLimit = status === 429;
        const isServerFailure = status !== undefined && status >= 500 && status < 600;
        const isNetworkFailure = code === "ECONNRESET" || code === "ETIMEDOUT" || name === "FetchError";

        const isTransient = isTimeout || isRateLimit || isServerFailure || isNetworkFailure;

        if (!isTransient || attempt >= maxRetries) {
          throw error;
        }

        console.log(`Gemini API transient failure (attempt ${attempt}). Retrying...`);
        const backoffTime = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }
    
    throw new Error("Max retries exceeded");
  }
}
