/**
 * Tests the disordered-eating screen (spec §3.8).
 * Run with: npm run check:safety
 *
 * False positives matter here too: this audience fasts for Ramadan, says
 * "I'm starving" when hungry, and skips breakfast when running late. Flagging
 * those would be both wrong and alienating.
 */
import { screenForDisorderedEating } from "../src/lib/safety/screen";

const fails: string[] = [];

function expectFlagged(text: string) {
  const r = screenForDisorderedEating(text);
  if (!r.flagged) fails.push(`SHOULD flag but did not: "${text}"`);
}

function expectClear(text: string) {
  const r = screenForDisorderedEating(text);
  if (r.flagged) {
    fails.push(`should NOT flag but did (${r.categories.join(",")}): "${text}"`);
  }
}

// --- must flag ---
const shouldFlag = [
  "I threw up after lunch",
  "I make myself sick after meals",
  "I've been throwing up again",
  "took laxatives last night",
  "I've been starving myself this week",
  "haven't eaten in 3 days",
  "I didn't eat anything all day and I won't tomorrow",
  "I'm refusing to eat until I lose weight",
  "fasting for 4 days straight",
  "I only allow myself 400 calories",
  "trying to eat as little as possible",
  "I need to burn it off at the gym",
  "I have to punish myself for eating that",
  "I didn't earn my dinner today",
  "need to make up for eating that",
  "I hate my body so much",
  "I'm so disgusting",
  "I can't stop thinking about my weight",
];
for (const t of shouldFlag) expectFlagged(t);

// --- must NOT flag (ordinary speech) ---
const shouldBeClear = [
  "I'm starving, had 2 parathas and chai",
  "I'm fasting for Ramadan today",
  "fasting today, will eat at iftar",
  "skipped breakfast because I was late for class",
  "didn't eat lunch, was busy with assignments",
  "I'm cutting down on calories to lose some weight",
  "went to the gym to burn some calories",
  "trying to eat healthier this month",
  "I want to gain muscle so I need more protein",
  "had daal chawal for lunch and 1.5 litres of water",
  "my mess food is bad quality",
  "I ate a lot today, felt too full",
  "I'm on a budget so I eat eggs a lot",
  "2 boiled eggs and a banana",
  "I need to eat more, I keep losing weight",
];
for (const t of shouldBeClear) expectClear(t);

// Category reporting works.
const r = screenForDisorderedEating("I threw up after lunch and I hate my body");
if (!r.categories.includes("purging") || !r.categories.includes("body_distress")) {
  fails.push(`should report both categories, got: ${r.categories.join(",")}`);
}

console.log(`checked ${shouldFlag.length} flag cases, ${shouldBeClear.length} clear cases`);

if (fails.length) {
  console.error("\nFAILED:");
  for (const f of fails) console.error("  x " + f);
  process.exit(1);
}
console.log("All safety screen checks passed.");
