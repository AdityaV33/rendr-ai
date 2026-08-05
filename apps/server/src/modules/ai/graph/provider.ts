/**
 * AI Provider abstraction for LangGraph orchestration.
 * Prepares the project for future providers like OpenAI, Claude, and Ollama.
 * This is additive and DOES NOT replace the existing GeminiService.
 */

export interface AIProvider {
  id: string;
  name: string;
  generateText(prompt: string): Promise<string>;
  generateStructured<T>(prompt: string, schema: unknown): Promise<T>;
}

export class GeminiProvider implements AIProvider {
  id = "gemini";
  name = "Google Gemini";

  async generateText(prompt: string): Promise<string> {
    // TODO: Connect to existing Gemini instance or wrapper
    throw new Error("Not implemented in foundation block");
  }

  async generateStructured<T>(prompt: string, schema: unknown): Promise<T> {
    // TODO: Connect to existing Gemini instance or wrapper
    throw new Error("Not implemented in foundation block");
  }
}
