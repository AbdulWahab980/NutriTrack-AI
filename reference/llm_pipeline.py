"""
llm_pipeline.py  (OpenAI version)

Two-stage LLM pipeline for NutriTrack AI:

  Stage 1 (extract_meal_log): free-text user message -> structured JSON
           (meals, items, quantities, water). Uses OpenAI's strict
           json_schema response format to force valid structured output.
           The LLM does NOT calculate nutrition values here — that's
           nutrition_service.py's job.

  Stage 2 (generate_feedback): structured daily totals + user profile
           + real nutrition-API numbers -> natural language feedback.
           The LLM only reasons over numbers it's given; it never invents them.

Environment variable required:
  OPENAI_API_KEY
"""

import os
import json
import logging
from typing import Optional

from openai import OpenAI

logger = logging.getLogger("llm_pipeline")

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

EXTRACTION_MODEL = "gpt-4o-mini"   # cheap + fast, plenty accurate for structured extraction
ADVICE_MODEL = "gpt-4o"            # better reasoning for personalized advice

# ============================================================
# STAGE 1 — STRUCTURED EXTRACTION (OpenAI strict JSON schema)
# ============================================================

EXTRACTION_SCHEMA = {
    "name": "log_meal_data",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "meals": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "meal_type": {
                            "type": "string",
                            "enum": ["breakfast", "lunch", "dinner", "snack"]
                        },
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "quantity": {"type": "number"},
                                    "unit": {"type": "string"},
                                    "confidence": {
                                        "type": "string",
                                        "enum": ["high", "medium", "low"]
                                    }
                                },
                                "required": ["name", "quantity", "unit", "confidence"],
                                "additionalProperties": False
                            }
                        }
                    },
                    "required": ["meal_type", "items"],
                    "additionalProperties": False
                }
            },
            "water_intake_ml": {"type": "integer"},
            "clarification_needed": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["meals", "water_intake_ml", "clarification_needed"],
        "additionalProperties": False
    }
}

EXTRACTION_SYSTEM_PROMPT = """You extract structured meal and water-intake data from casual,
conversational messages (often about South Asian / Pakistani food). Rules:

- Never calculate calories or nutrition values — only extract what was said.
- If a quantity isn't stated, assume a standard single serving and mark confidence as "medium".
- If quantity is genuinely impossible to guess (e.g. "I had some daal"), still assume 1 standard
  serving, mark confidence "low", and add a clarifying question to clarification_needed.
- Normalize colloquial units (e.g. "a glass of water" -> 250 ml, "a bowl" -> keep as unit "bowl").
- Water mentioned in any unit must be converted to milliliters in water_intake_ml.
- Respond with JSON only, matching the given schema.
"""


def extract_meal_log(user_message: str) -> dict:
    """
    Stage 1: Convert free-text into structured JSON via forced schema output.
    Returns a dict matching the log_meal_data schema.
    """
    response = client.chat.completions.create(
        model=EXTRACTION_MODEL,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_schema", "json_schema": EXTRACTION_SCHEMA},
    )

    try:
        return json.loads(response.choices[0].message.content)
    except (json.JSONDecodeError, IndexError, AttributeError) as e:
        logger.error(f"Extraction parsing failed: {e}")
        return {"meals": [], "water_intake_ml": 0, "clarification_needed": []}


# ============================================================
# STAGE 2 — ADVICE GENERATION
# ============================================================

ADVICE_SYSTEM_PROMPT = """You are NutriTrack AI, a supportive nutrition-logging assistant.
You are NOT a doctor and must never diagnose or give medical verdicts.

You will receive:
1. The user's profile (age, weight, height, activity level, goal, living situation, budget if hostel)
2. Today's logged totals (calories, protein, carbs, fat, water) — these numbers come from a
   verified nutrition database, treat them as ground truth. Never recalculate or override them.
3. The user's daily targets

Your job:
- Compare totals to targets factually and specifically (use real numbers, e.g. "32g protein short")
- Never say the user "is healthy" or "is unhealthy" — describe gaps and patterns only
- If living_situation is "hostel", suggestions must be budget-aware and realistic for
  mess-hall/limited-kitchen access — use the user's stated budget
- Suggestions must be specific and actionable (name a food, a quantity, and if hostel mode,
  an approximate cost)
- Never use moralizing language ("bad food," "cheat meal," "guilty")
- If the message contains signs of disordered eating (extreme restriction, compensatory
  behavior, obsessive language about weight), do not give dietary advice — instead gently
  suggest speaking with a doctor or counselor, and stop nutrition coaching for that turn
- Keep tone warm, direct, and non-judgmental — like a knowledgeable friend, not a clinician
- Always end with one concrete next action, not generic advice
- Respond in 3-5 sentences, plain text, no headers or markdown
"""


def generate_feedback(
    profile: dict,
    daily_totals: dict,
    targets: dict,
    raw_user_message: Optional[str] = None,
) -> str:
    """
    Stage 2: Generate natural-language feedback from verified numeric data.

    profile: {age, gender, height_cm, weight_kg, activity_level, goal,
              living_situation, daily_food_budget_pkr, kitchen_access}
    daily_totals: {calories_kcal, protein_g, carbs_g, fat_g, water_ml}
    targets: {target_calories, target_protein_g, target_carbs_g, target_fat_g, target_water_ml}
    raw_user_message: optional, the original message, used only for disordered-eating detection
    """
    context = {
        "profile": profile,
        "daily_totals": daily_totals,
        "targets": targets,
    }

    user_content = (
        f"Here is today's data:\n{json.dumps(context, indent=2)}\n\n"
        f"Generate the feedback message for the user now."
    )
    if raw_user_message:
        user_content += f"\n\nOriginal user message for context: {raw_user_message}"

    response = client.chat.completions.create(
        model=ADVICE_MODEL,
        max_tokens=400,
        messages=[
            {"role": "system", "content": ADVICE_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    )

    return response.choices[0].message.content.strip()


# ============================================================
# Example end-to-end usage (wire this into your API route)
# ============================================================

if __name__ == "__main__":
    # 1. Extract
    user_msg = "I had 2 parathas and a cup of tea for breakfast, daal chawal for lunch, and I've drank about 1.5 liters of water so far."
    extracted = extract_meal_log(user_msg)
    print("Extracted:", json.dumps(extracted, indent=2))

    # 2. -> nutrition_service.py would resolve each item to real macro values here <-
    # 3. -> totals get summed and saved to daily_logs table <-

    # 4. Generate feedback (example with placeholder totals)
    example_profile = {
        "age": 21, "gender": "male", "height_cm": 175, "weight_kg": 68,
        "activity_level": "moderate", "goal": "muscle_gain",
        "living_situation": "hostel", "daily_food_budget_pkr": 500,
        "kitchen_access": "kettle",
    }
    example_totals = {"calories_kcal": 1450, "protein_g": 48, "carbs_g": 190, "fat_g": 40, "water_ml": 1500}
    example_targets = {"target_calories": 2400, "target_protein_g": 130, "target_carbs_g": 280, "target_fat_g": 70, "target_water_ml": 2500}

    feedback = generate_feedback(example_profile, example_totals, example_targets, user_msg)
    print("\nFeedback:", feedback)
