"""
nutrition_service.py

Handles all nutrition-data lookups for NutriTrack AI.

Lookup order (never let the LLM invent numbers):
  1. Local DB cache (food_items table) — includes your custom desi-food dataset
  2. Redis cache (for API responses, short TTL to reduce duplicate calls)
  3. Nutritionix API (primary — has natural-language food parsing)
  4. USDA FoodData Central (fallback — better for raw/generic ingredients)
  5. If all fail -> return a "needs_manual_entry" flag, never a guessed number

Environment variables required:
  NUTRITIONIX_APP_ID
  NUTRITIONIX_API_KEY
  USDA_API_KEY
  REDIS_URL
  DATABASE_URL
"""

import os
import json
import logging
import hashlib
from dataclasses import dataclass, asdict
from typing import Optional

import httpx
import redis.asyncio as redis
import asyncpg

logger = logging.getLogger("nutrition_service")

NUTRITIONIX_APP_ID = os.environ["NUTRITIONIX_APP_ID"]
NUTRITIONIX_API_KEY = os.environ["NUTRITIONIX_API_KEY"]
USDA_API_KEY = os.environ["USDA_API_KEY"]
REDIS_URL = os.environ["REDIS_URL"]

NUTRITIONIX_NL_ENDPOINT = "https://trackapi.nutritionix.com/v2/natural/nutrients"
USDA_SEARCH_ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search"

CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days — food nutrition data doesn't change


@dataclass
class NutritionResult:
    name: str
    quantity: float
    unit: str
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: Optional[float]
    source: str  # 'local_db' | 'nutritionix' | 'usda' | 'unmatched'
    matched: bool


class NutritionService:
    def __init__(self, db_pool: asyncpg.Pool, redis_client: redis.Redis):
        self.db_pool = db_pool
        self.redis = redis_client

    # ---------- Public entrypoint ----------

    async def lookup(self, food_name: str, quantity: float, unit: str) -> NutritionResult:
        """
        Main entrypoint. Call this for every extracted food item.
        """
        normalized = self._normalize(food_name)

        # 1. Local DB (custom desi dataset + previously cached lookups)
        local_hit = await self._lookup_local_db(normalized)
        if local_hit:
            return self._scale(local_hit, quantity, unit, source="local_db")

        # 2. Redis cache of prior API calls
        cache_key = f"nutrition:{normalized}"
        cached = await self.redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            return self._scale(data, quantity, unit, source=data.get("source", "cache"))

        # 3. Nutritionix (primary external source)
        result = await self._query_nutritionix(food_name, quantity, unit)
        if result:
            await self._cache_and_store(normalized, result)
            return result

        # 4. USDA fallback
        result = await self._query_usda(food_name, quantity, unit)
        if result:
            await self._cache_and_store(normalized, result)
            return result

        # 5. Nothing found — do NOT guess. Flag for manual entry / user clarification.
        logger.warning(f"No nutrition match found for '{food_name}'")
        return NutritionResult(
            name=food_name, quantity=quantity, unit=unit,
            calories_kcal=0, protein_g=0, carbs_g=0, fat_g=0, fiber_g=None,
            source="unmatched", matched=False
        )

    # ---------- Local DB ----------

    async def _lookup_local_db(self, normalized_name: str) -> Optional[dict]:
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT name, default_quantity, default_unit,
                       calories_kcal, protein_g, carbs_g, fat_g, fiber_g, source
                FROM food_items
                WHERE normalized_name = $1
                LIMIT 1
                """,
                normalized_name,
            )
            return dict(row) if row else None

    # ---------- Nutritionix ----------

    async def _query_nutritionix(self, food_name: str, quantity: float, unit: str) -> Optional[NutritionResult]:
        query = f"{quantity} {unit} {food_name}"
        headers = {
            "x-app-id": NUTRITIONIX_APP_ID,
            "x-app-key": NUTRITIONIX_API_KEY,
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    NUTRITIONIX_NL_ENDPOINT,
                    headers=headers,
                    json={"query": query},
                )
            if resp.status_code != 200:
                logger.warning(f"Nutritionix returned {resp.status_code} for '{query}'")
                return None

            foods = resp.json().get("foods", [])
            if not foods:
                return None

            food = foods[0]  # first match
            return NutritionResult(
                name=food.get("food_name", food_name),
                quantity=quantity,
                unit=unit,
                calories_kcal=food.get("nf_calories", 0) or 0,
                protein_g=food.get("nf_protein", 0) or 0,
                carbs_g=food.get("nf_total_carbohydrate", 0) or 0,
                fat_g=food.get("nf_total_fat", 0) or 0,
                fiber_g=food.get("nf_dietary_fiber"),
                source="nutritionix",
                matched=True,
            )
        except (httpx.TimeoutException, httpx.HTTPError) as e:
            logger.error(f"Nutritionix request failed: {e}")
            return None

    # ---------- USDA fallback ----------

    async def _query_usda(self, food_name: str, quantity: float, unit: str) -> Optional[NutritionResult]:
        params = {"api_key": USDA_API_KEY, "query": food_name, "pageSize": 1}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(USDA_SEARCH_ENDPOINT, params=params)
            if resp.status_code != 200:
                logger.warning(f"USDA returned {resp.status_code} for '{food_name}'")
                return None

            foods = resp.json().get("foods", [])
            if not foods:
                return None

            food = foods[0]
            nutrients = {n["nutrientName"]: n["value"] for n in food.get("foodNutrients", [])}

            return NutritionResult(
                name=food.get("description", food_name),
                quantity=quantity,
                unit=unit,
                calories_kcal=nutrients.get("Energy", 0),
                protein_g=nutrients.get("Protein", 0),
                carbs_g=nutrients.get("Carbohydrate, by difference", 0),
                fat_g=nutrients.get("Total lipid (fat)", 0),
                fiber_g=nutrients.get("Fiber, total dietary"),
                source="usda",
                matched=True,
            )
        except (httpx.TimeoutException, httpx.HTTPError) as e:
            logger.error(f"USDA request failed: {e}")
            return None

    # ---------- Helpers ----------

    async def _cache_and_store(self, normalized_name: str, result: NutritionResult):
        """Cache in Redis (fast) and persist to DB (permanent, builds your dataset over time)."""
        cache_key = f"nutrition:{normalized_name}"
        await self.redis.set(cache_key, json.dumps(asdict(result)), ex=CACHE_TTL_SECONDS)

        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO food_items
                    (name, normalized_name, source, default_unit, default_quantity,
                     calories_kcal, protein_g, carbs_g, fat_g, fiber_g)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT DO NOTHING
                """,
                result.name, normalized_name, result.source, result.unit, result.quantity,
                result.calories_kcal, result.protein_g, result.carbs_g, result.fat_g, result.fiber_g,
            )

    @staticmethod
    def _normalize(name: str) -> str:
        return name.strip().lower()

    @staticmethod
    def _scale(base: dict, quantity: float, unit: str, source: str) -> NutritionResult:
        """Scale stored per-default-quantity values to the actually logged quantity."""
        base_qty = base.get("default_quantity", 1) or 1
        factor = quantity / base_qty if base_qty else 1

        return NutritionResult(
            name=base["name"],
            quantity=quantity,
            unit=unit,
            calories_kcal=round(base["calories_kcal"] * factor, 2),
            protein_g=round(base["protein_g"] * factor, 2),
            carbs_g=round(base["carbs_g"] * factor, 2),
            fat_g=round(base["fat_g"] * factor, 2),
            fiber_g=round(base["fiber_g"] * factor, 2) if base.get("fiber_g") else None,
            source=source,
            matched=True,
        )
