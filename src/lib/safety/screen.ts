/**
 * Deterministic screen for signs of disordered eating (spec §3.8).
 *
 * Why not just ask the model: this decision gates whether we show calorie and
 * diet guidance at all. A regex cannot be talked out of its answer by clever
 * phrasing, cannot hallucinate, and behaves identically every time. The LLM
 * prompt carries the same instruction as a second layer, but this screen is
 * the one that actually decides.
 *
 * This is a screen, not a diagnosis. It errs toward offering support: a false
 * positive costs one turn of nutrition advice, a false negative could matter
 * much more. Phrases are kept specific to avoid firing on ordinary speech —
 * "I'm starving" means hungry, "starving myself" does not.
 */

export type ScreenResult = {
  flagged: boolean;
  /** Which category tripped, for logging/tuning. Never shown to the user. */
  categories: string[];
};

const PATTERNS: { category: string; patterns: RegExp[] }[] = [
  {
    category: "purging",
    patterns: [
      /\b(throw|threw|throwing)\s+(it\s+)?up\b/i,
      /\bmake\s+myself\s+(sick|throw\s+up|vomit)\b/i,
      /\bmade\s+myself\s+(sick|throw\s+up|vomit)\b/i,
      /\bvomit(ed|ing)?\s+(after|it|them)\b/i,
      /\bpurg(e|ed|ing)\b/i,
      /\blaxative/i,
    ],
  },
  {
    category: "extreme_restriction",
    patterns: [
      /\bstarv(e|ing)\s+myself\b/i,
      /\bnot\s+eat(ing)?\s+(for|until)\b/i,
      /\bhaven'?t\s+eaten\s+(in|for)\s+\d+\s*(day|days)\b/i,
      /\bdidn'?t\s+eat\s+(anything\s+)?(all\s+day|for\s+days|yesterday\s+either)\b/i,
      /\brefus(e|ing)\s+to\s+eat\b/i,
      /\bskip(ping|ped)?\s+(all\s+)?meals?\s+(again|today\s+too|every\s+day)\b/i,
      /\bfast(ing)?\s+for\s+\d+\s*(day|days)\b/i,
      /\bonly\s+(allow(ed)?|let)\s+myself\b/i,
      /\beat\s+as\s+little\s+as\s+possible\b/i,
    ],
  },
  {
    category: "compensatory",
    patterns: [
      /\b(burn|work)\s+(it|this|that)\s+off\b/i,
      /\bpunish\s+myself\b/i,
      /\bearn\s+(my|the)\s+(food|meal|calories|dinner|lunch)\b/i,
      /\bdeserve\s+to\s+eat\b/i,
      /\bmake\s+up\s+for\s+(eating|it)\b/i,
      /\bcompensate\s+for\s+(eating|the\s+calories)\b/i,
    ],
  },
  {
    category: "body_distress",
    patterns: [
      /\b(hate|disgusted\s+by|ashamed\s+of)\s+my\s+(body|self|weight|thighs|stomach)\b/i,
      /\bi'?m\s+(so\s+)?(disgusting|worthless|repulsive)\b/i,
      /\bfeel\s+(so\s+)?(fat|disgusting)\s+(and|after)\b/i,
      /\bcan'?t\s+stop\s+thinking\s+about\s+(my\s+weight|calories|how\s+fat)\b/i,
    ],
  },
];

export function screenForDisorderedEating(text: string): ScreenResult {
  const categories: string[] = [];

  for (const { category, patterns } of PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      categories.push(category);
    }
  }

  return { flagged: categories.length > 0, categories };
}

/**
 * Shown instead of nutrition guidance when the screen trips. Deliberately
 * warm and non-clinical, names no numbers, and gives no diet direction.
 */
export const SUPPORT_MESSAGE = {
  heading: "Let's pause the numbers for a moment",
  body:
    "Some of what you wrote sounds like it might be weighing on you, and calorie " +
    "targets aren't the right answer to that. You deserve support from someone " +
    "who can actually listen.",
  suggestions: [
    "Talk to a doctor, a registered dietitian, or a counsellor — your university almost certainly has free counselling you can book.",
    "Tell someone you trust how you've been feeling. It doesn't have to be a big conversation.",
    "If things feel urgent, please reach out to a local health service or emergency line right away.",
  ],
  footer:
    "NutriTrack AI isn't able to help with this, and won't give you diet advice here. That's not a judgement — it's just not what this tool is for.",
} as const;
