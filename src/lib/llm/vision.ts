import { openai, ADVICE_MODEL } from "./client";
import {
  EXTRACTION_JSON_SCHEMA,
  extractedLogSchema,
  ExtractionError,
  type ExtractedLog,
} from "./extract";

/**
 * Photo path of the pipeline: an image -> the same structured meal log the
 * text extractor produces.
 *
 * Same hard guarantee as text: the schema has NO calorie/macro fields, so the
 * vision model can only name foods and estimate portions — never invent
 * nutrition numbers. Those still come from the nutrition service.
 *
 * Uses a vision-capable model (gpt-4o). Portion sizes from a photo are
 * inherently rougher, so items lean toward "medium"/"low" confidence.
 */

const VISION_SYSTEM_PROMPT = `You identify the foods and drinks in a photo of a meal,
often South Asian / Pakistani food. Rules:
- Never calculate calories or nutrition values — only name what you see and estimate amounts.
- Estimate a sensible quantity and unit for each item (e.g. 2 pieces, 1 bowl, 1 plate, 1 cup).
- Photos make portions uncertain: use "medium" confidence by default, "low" when the amount
  is a guess, "high" only when countable and clear (e.g. two visible eggs).
- Normalize colloquial units. Assign each item to the most likely meal_type.
- If you see a drink/water, include water_intake_ml in millilitres.
- If the image contains no identifiable food, return an empty meals array.
- Respond with JSON only, matching the given schema.`;

/** Accepts a data URL (e.g. "data:image/jpeg;base64,...."). */
export async function extractMealFromImage(dataUrl: string): Promise<ExtractedLog> {
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(dataUrl)) {
    throw new ExtractionError("That doesn't look like a supported image.");
  }

  let lastIssue = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await openai().chat.completions.create({
      model: ADVICE_MODEL, // gpt-4o — vision capable
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify the foods and drinks in this meal photo." },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
          ],
        },
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
    const result = extractedLogSchema.safeParse(parsed);
    if (result.success) return result.data;
    lastIssue = result.error.issues[0]?.message ?? "schema mismatch";
  }

  throw new ExtractionError(
    `Couldn't read that photo (${lastIssue}). Try a clearer, closer shot of the food.`,
  );
}
