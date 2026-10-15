import { env } from "../../../config/env.js";
import { InternalServerError } from "../../lib/http-error.js";
import { zodToGeminiSchema } from "../utils/schema.utils.js";
import { pipelineRunContext } from "../utils/run-context.js";

export class GroqRateLimitError extends Error {
  constructor(message: string, public readonly retryAfterMs: number) { super(message); this.name = "GroqRateLimitError"; }
}
export class GroqTransientError extends Error {
  constructor(message: string) { super(message); this.name = "GroqTransientError"; }
}
export class GroqPermanentError extends Error {
  constructor(message: string) { super(message); this.name = "GroqPermanentError"; }
}
export class GroqStructuredOutputError extends Error {
  constructor(message: string) { super(message); this.name = "GroqStructuredOutputError"; }
}
export class GroqTimeoutError extends Error {
  constructor(message: string) { super(message); this.name = "GroqTimeoutError"; }
}

export class GroqService {
  private readonly baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  private get apiKey(): string {
    if (!env.GROQ_API_KEY) {
      throw new InternalServerError("GROQ_API_KEY is not configured.");
    }
    return env.GROQ_API_KEY;
  }

  /**
   * Generates a structured JSON response mapped to type T based on the provided schema.
   * Relies on Groq's JSON mode (OpenAI compatibility).
   */
  async generateStructured<T>(
    prompt: string,
     
    responseSchema: any,
    systemInstruction?: string,
    config?: { temperature?: number; timeoutMs?: number; taskName?: string; model: string }
  ): Promise<T> {
    const taskName = config?.taskName || "Groq Structured Generation";
    const timeoutMs = config?.timeoutMs || 30000;
    const model = config?.model;
    
    if (!model) {
      throw new InternalServerError("A valid Groq model must be provided.");
    }
    
    // responseSchema is a Zod schema. We must convert it to a JSON Schema string to instruct Groq.
    const jsonSchemaObj = zodToGeminiSchema(responseSchema);
    const augmentedSystem = `${systemInstruction || ''}\n\nYou MUST return ONLY a valid JSON object. Adhere strictly to this JSON schema:\n${JSON.stringify(jsonSchemaObj, null, 2)}`;


    const body = {
      model: model,
      messages: [
        { role: "system", content: augmentedSystem },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: config?.temperature ?? 0.2,
      max_tokens: 4000,
    };

    console.log(`[GroqService] Task: ${taskName} | Model: ${model}`);
    const start = performance.now();

    const runContext = pipelineRunContext.getStore();
    const signals: AbortSignal[] = [AbortSignal.timeout(timeoutMs)];
    if (runContext?.abortSignal) {
      signals.push(runContext.abortSignal);
    }
    const combinedSignal = AbortSignal.any(signals);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: combinedSignal
      });

      if (!response.ok) {
        let errBody = "";
        try { errBody = await response.text(); } catch { /* ignore */ }
        console.error(`[GroqService] HTTP ${response.status} ${response.statusText}\n${errBody}`);
        
        if (response.status === 429) {
          let retryAfterMs = 60000;
          const retryHeader = response.headers.get("retry-after");
          if (retryHeader) {
            const parsed = parseFloat(retryHeader);
            if (!isNaN(parsed)) retryAfterMs = parsed * 1000;
          } else {
            const match = errBody.match(/try again in (?:(\d+)m)?([\d.]+)s/);
            if (match) {
              const m = match[1] ? parseInt(match[1]) : 0;
              const s = parseFloat(match[2]);
              retryAfterMs = (m * 60 + s) * 1000;
            }
          }
          throw new GroqRateLimitError(`Groq Rate Limit Exceeded (429): ${errBody}`, retryAfterMs);
        } else if (response.status >= 500) {
          throw new GroqTransientError(`Groq Transient Error (${response.status}): ${errBody}`);
        } else if (errBody.includes("json_validate_failed")) {
           throw new GroqStructuredOutputError(`Groq JSON Validation Error: ${errBody}`);
        } else {
          throw new GroqPermanentError(`Groq Permanent Error (${response.status}): ${errBody}`);
        }
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new GroqTransientError("Empty response from Groq API");
      }

      const usage = data.usage;
      const tokensMsg = usage ? ` | Tokens: P=${usage.prompt_tokens}, O=${usage.completion_tokens}, T=${usage.total_tokens}` : "";
      
      console.log(`[GroqService] Generation: Success (${((performance.now() - start)/1000).toFixed(1)}s)${tokensMsg}`);
      return this.parseStructuredResponse<T>(content, responseSchema);
    } catch (error) {
      const duration = ((performance.now() - start)/1000).toFixed(1);
      
      const isAbort = error instanceof Error && error.name === "AbortError";
      const isMasterAbort = isAbort && combinedSignal.reason?.message?.includes("Master pipeline deadline exceeded");
      
      if (isMasterAbort) {
        console.error(`[GroqService] Task: ${taskName} [MASTER PIPELINE ABORTED in ${duration}s]`);
        throw combinedSignal.reason;
      }
      if (isAbort || (error instanceof Error && error.name === "TimeoutError")) {
        console.error(`[GroqService] Task: ${taskName} [TIMED OUT in ${duration}s]`);
        throw new GroqTimeoutError("Request timed out or was aborted");
      }
      
      console.error(`[GroqService] Task: ${taskName} [FAILED in ${duration}s]`, error instanceof Error ? error.message : "Unknown Error");
      throw error;
    }
  }

  private parseStructuredResponse<T>(text: string, schema: any): T {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    const firstBrace = cleaned.search(/[{[]/);
    const lastBrace = cleaned.search(/[}\]][^}\]]*$/);
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1).trim();
    }

    try {
      const parsedJson = JSON.parse(cleaned);
      if (schema && schema.parse) {
        return schema.parse(parsedJson) as T;
      }
      return parsedJson as T;
    } catch (error: any) {
      console.error("[GroqService] Failed to parse structured JSON response or validation failed.");
      throw new GroqStructuredOutputError(`Malformed JSON or Schema Validation Failed: ${error?.message || "Unknown error"}`);
    }
  }


}
