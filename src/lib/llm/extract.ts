import { z } from "zod";
import { EXTRACTION_MODEL, openai } from "./client";

/**
 * Stage 1 of the pipeline (spec §6): free text -> structured JSON.
 *
 * The model's ONLY job here is to say what was eaten and how much. It is
 * structurally prevented from emitting calories or macros — those fields do
 * not exist in the schema — so nutrition numbers can only ever come from the
 * nutrition service. See reference/llm_pipeline.py for the original.
 */

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const CONFIDENCE = ["high", "medium", "low"] as const;

export const extractedLogSchema = z.object({
  meals: z.array(
    z.object({
      meal_type: z.enum(MEAL_TYPES),
      items: z.array(
        z.object({
          name: z.string().min(1),
          quantity: z.number().positive(),
          unit: z.string().min(1),
          confidence: z.enum(CONFIDENCE),
        }),
      ),
    }),
  ),
  water_intake_ml: z.number().int().min(0),
  clarification_needed: z.array(z.string()),
});

export type ExtractedLog = z.infer<typeof extractedLogSchema>;
export type ExtractedItem = ExtractedLog["meals"][number]["items"][number];

/**
 * JSON Schema handed to OpenAI in strict mode. Kept hand-written (rather than
 * generated from the Zod schema) so the exact contract sent to the model is
 * visible and reviewable — this is the accuracy-critical boundary.
 */
const EXTRACTION_JSON_SCHEMA = {
  name: "log_meal_data",
  strict: true,
  schema: {
    type: "object",
    properties: {
      meals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            meal_type: { type: "string", enum: MEAL_TYPES },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  confidence: { type: "string", enum: CONFIDENCE },
                },
                required: ["name", "quantity", "unit", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["meal_type", "items"],
          additionalProperties: false,
        },
      },
      water_intake_ml: { type: "integer" },
      clarification_needed: { type: "array", items: { type: "string" } },
    },
    required: ["meals", "water_intake_ml", "clarification_needed"],
    additionalProperties: false,
  },
} as const;

const SYSTEM_PROMPT = `You extract structured meal and water-intake data from casual,
conversational messages (often about South Asian / Pakistani food). Rules:

- Never calculate calories or nutrition values — only extract what was said.
- If a quantity isn't stated, assume a standard single serving and mark confidence as "medium".
- If quantity is genuinely impossible to guess (e.g. "I had some daal"), still assume 1 standard
  serving, mark confidence "low", and add a clarifying question to clarification_needed.
- Normalize colloquial units (e.g. "a glass of water" -> 250 ml, "a bowl" -> keep as unit "bowl").
- Water mentioned in any unit must be converted to millilitres in water_intake_ml.
- Only include a meal object if the user actually mentioned food for it. If the user mentioned
  no food at all, return an empty meals array.
- If the meal is not stated, infer it from context or time words; otherwise use "snack".
- Respond with JSON only, matching the given schema.`;

export class ExtractionError extends Error {}

/** Runs stage 1. Retries once if the model returns something unparseable. */
export async function extractMealLog(userMessage: string): Promise<ExtractedLog> {
  let lastIssue = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await openai().chat.completions.create({
      model: EXTRACTION_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_schema", json_schema: EXTRACTION_JSON_SCHEMA },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      lastIssue = "empty response";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      lastIssue = "invalid JSON";
      continue;
    }

    // Strict mode should guarantee shape, but validate anyway — this is the
    // boundary where a malformed value would otherwise reach the database.
    const result = extractedLogSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    lastIssue = result.error.issues[0]?.message ?? "schema mismatch";
  }

  throw new ExtractionError(
    `Could not understand that message (${lastIssue}). Try rephrasing what you ate.`,
  );
}
