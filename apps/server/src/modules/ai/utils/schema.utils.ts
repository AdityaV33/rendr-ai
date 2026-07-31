import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Converts a Zod schema to a Gemini API-compatible JSON Schema.
 *
 * The Gemini API expects OpenAPI-style JSON schema but does not support
 * $schema, $ref, definitions, or additionalProperties fields.
 * This utility strips those properties recursively.
 *
 * Uses a type assertion for the Zod schema parameter because zod-to-json-schema
 * is typed against Zod v3 internals while this project uses Zod v4.
 * The runtime behavior is identical.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodToGeminiSchema(schema: any): object {
  const jsonSchema = zodToJsonSchema(schema, { target: "openApi3" });

  return stripUnsupportedFields(jsonSchema as Record<string, unknown>);
}

/**
 * Recursively removes fields not supported by the Gemini API responseSchema.
 */
function stripUnsupportedFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip fields unsupported by Gemini
    if (key === "$schema" || key === "$ref" || key === "definitions" || key === "additionalProperties") {
      continue;
    }

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = stripUnsupportedFields(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? stripUnsupportedFields(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}
