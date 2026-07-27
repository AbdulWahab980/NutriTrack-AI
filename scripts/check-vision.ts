/**
 * Live check of the photo-scan extraction (Bug 5): a real food image ->
 * structured foods, with the same no-nutrition-fields guarantee as text.
 * Reads a base64 data URL from /tmp/meal.b64 (see check:vision npm script).
 * Run with: npm run check:vision
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { extractMealFromImage } from "../src/lib/llm/vision";

async function main() {
  const path = process.argv[2] || process.env.SCAN_B64_PATH || "/tmp/meal.b64";
  const dataUrl = readFileSync(path, "utf8").trim();
  const out = await extractMealFromImage(dataUrl);

  const items = out.meals.flatMap((m) => m.items);
  console.log("detected items:", items.map((i) => `${i.quantity} ${i.unit} ${i.name} (${i.confidence})`).join(" | "));
  console.log("meal types:", out.meals.map((m) => m.meal_type).join(", "));

  const fails: string[] = [];
  if (items.length === 0) fails.push("vision should detect at least one food item in a food photo");

  // The model must never leak nutrition fields — schema forbids them.
  const keys = new Set(items.flatMap((i) => Object.keys(i)));
  const allowed = ["name", "quantity", "unit", "confidence"];
  if (![...keys].every((k) => allowed.includes(k))) {
    fails.push(`items must only carry ${allowed.join(",")}, saw: ${[...keys].join(",")}`);
  }
  if (!items.every((i) => i.quantity > 0)) fails.push("every item needs a positive quantity");

  if (fails.length) {
    console.error("\nFAILED:");
    for (const f of fails) console.error("  x " + f);
    process.exit(1);
  }
  console.log("\nVision extraction check passed.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
