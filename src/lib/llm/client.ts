import OpenAI from "openai";
import { requireEnv } from "@/lib/env";

let client: OpenAI | undefined;

/** Lazily constructed so a missing key fails at call time, not import time. */
export function openai(): OpenAI {
  client ??= new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return client;
}

/** Cheap and fast — structured extraction needs no deep reasoning. */
export const EXTRACTION_MODEL = process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4o-mini";
/** Better reasoning for personalised advice (Phase 5). */
export const ADVICE_MODEL = process.env.OPENAI_ADVICE_MODEL ?? "gpt-4o";
