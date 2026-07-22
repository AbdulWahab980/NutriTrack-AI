/**
 * Live check of stage-1 extraction against the OpenAI API.
 * Run with: npm run check:extract   (costs a few tokens)
 */
import "dotenv/config";
import { extractMealLog } from "../src/lib/llm/extract";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

async function main() {
  // The spec's own example sentence (§3.2).
  const msg =
    "I had 2 parathas and a cup of tea for breakfast, daal chawal for lunch, " +
    "and I've drank about 1.5 liters of water so far.";
  const out = await extractMealLog(msg);
  console.log("input:", msg);
  console.log("extracted:", JSON.stringify(out, null, 2));

  const allItems = out.meals.flatMap((m) => m.items);
  const names = allItems.map((i) => i.name.toLowerCase()).join(" | ");

  ok(out.water_intake_ml === 1500, `water should be 1500ml, got ${out.water_intake_ml}`);
  ok(out.meals.some((m) => m.meal_type === "breakfast"), "should detect breakfast");
  ok(out.meals.some((m) => m.meal_type === "lunch"), "should detect lunch");
  ok(names.includes("paratha"), "should extract paratha");
  ok(names.includes("tea"), "should extract tea");
  ok(names.includes("daal") || names.includes("dal"), "should extract daal chawal");

  const paratha = allItems.find((i) => i.name.toLowerCase().includes("paratha"));
  ok(paratha?.quantity === 2, `paratha quantity should be 2, got ${paratha?.quantity}`);

  // The model must never invent nutrition numbers — the schema has no such
  // fields, so any leakage would show up as extra keys.
  const itemKeys = new Set(allItems.flatMap((i) => Object.keys(i)));
  ok(
    [...itemKeys].every((k) => ["name", "quantity", "unit", "confidence"].includes(k)),
    `items must not carry nutrition fields, saw: ${[...itemKeys].join(",")}`,
  );

  // Vague input should trigger a clarification rather than a confident guess.
  const vague = await extractMealLog("I had some daal today");
  console.log("\nvague input ->", JSON.stringify(vague, null, 2));
  const vagueItem = vague.meals.flatMap((m) => m.items)[0];
  ok(!!vagueItem, "vague input should still produce an item");
  ok(
    vagueItem?.confidence === "low" || vague.clarification_needed.length > 0,
    "vague quantity should be low-confidence or raise a clarification",
  );

  // A message with no food should not invent meals.
  const none = await extractMealLog("feeling tired today, didn't do much");
  console.log("\nno-food input ->", JSON.stringify(none, null, 2));
  ok(
    none.meals.flatMap((m) => m.items).length === 0,
    "should not invent food when none was mentioned",
  );
}

main()
  .then(() => {
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll extraction checks passed.");
  })
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  });
