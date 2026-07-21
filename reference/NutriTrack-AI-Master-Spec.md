# YoKnow - NutriTrack AI — Master Build Specification
### AI-Powered Meal & Water Tracking Agent for Students & Hostel Residents

This is a single, complete build document. Everything a developer (human or AI coding agent) needs to build this end-to-end without needing follow-up clarification is contained here.

---

## 1. Product Vision

An AI agent that lets a person casually describe what they ate and drank in a day (via chat, text, or voice), and in return gives them **accurate, personalized, non-judgmental nutritional feedback** — with special support for **hostel/dorm residents** who have limited food control, tight budgets, and mess-hall constraints.

**What this product is NOT:**
- Not a medical diagnostic tool
- Not a calorie-shaming app
- Not a generic "eat more vegetables" chatbot with no real data behind it

**What it IS:**
- A structured, API-backed nutrition logger with an LLM as the interface layer
- A personalized coach that adapts advice to budget, location (hostel/home), and goals

---

## 2. Target Users

| User Type | Key Need |
|---|---|
| University hostel student | Cheap, mess-hall-realistic food swaps |
| Fitness-conscious student | Macro tracking, goal-based targets |
| Busy professional | Fast logging, weekly trends, no micromanagement |

Primary persona: **Pakistani/South Asian university student living in a hostel**, budget-constrained, limited cooking access, eats mess food + occasional outside food.

---

## 3. Core Features (all must work end-to-end)

### 3.1 Onboarding & Profile
- Name, age, gender, height, weight
- Activity level (sedentary / light / moderate / active / very active)
- Goal: weight loss / muscle gain / maintenance / general health
- Living situation: **Hostel / Home / PG / Other**
- If Hostel selected → follow-up questions:
  - Daily food budget (in PKR)
  - Mess meal plan? (yes/no, what's typically served)
  - Access to: fridge / kettle / induction stove / none
  - Dietary restrictions (vegetarian, allergies, etc.)
- Calculate and store: BMR (Mifflin-St Jeor equation), TDEE, daily calorie target, macro targets (protein/carbs/fat), daily water target (35ml × body weight kg, adjustable)
- Editable anytime from a Profile screen

### 3.2 Conversational Logging (core interaction)
User types naturally, e.g.:
> "I had 2 parathas and a cup of tea for breakfast, daal chawal for lunch, and I've drank about 1.5 liters of water so far."

Agent must:
1. Extract structured data (see Section 6 — extraction schema)
2. Match each food item against a nutrition database
3. Ask a clarifying question ONLY if a quantity is truly ambiguous (e.g., "how many rotis?") — otherwise assume standard serving sizes and state the assumption
4. Confirm back to user in plain language before finalizing the log ("Got it: 2 parathas (~600 kcal), tea with milk (~60 kcal), 1 bowl daal chawal (~450 kcal). Logged.")

Also support:
- Editing/deleting a logged item
- Logging via voice-to-text (mobile)
- Logging via photo (v2 feature, see Section 9)

### 3.3 Nutrition Analysis Engine
- Real nutrition data pulled from an API (never hallucinated by the LLM — see Section 7)
- Running daily totals: calories, protein, carbs, fat, fiber, water
- Compare against personalized targets
- Flag gaps: e.g., "You're 40g short on protein today" — not vague, always numeric and specific

### 3.4 Feedback & Suggestions (the "advice" layer)
- **No health verdicts.** Never says "you are healthy" or "you are unhealthy."
- Instead: "Your protein and water intake were below target today. Here's what would close the gap."
- Suggestions must be:
  - Realistic for the user's context (hostel mess / home kitchen / budget)
  - Specific with quantities ("add 2 boiled eggs — ~150 PKR, +12g protein")
  - Never generic filler like "eat healthy" or "drink more water" without a concrete action

### 3.5 Hostel Mode (key differentiator)
- User can input what their mess is serving that day (or select from a saved list of common mess meals)
- Agent suggests **budget-aware, hostel-feasible add-ons**:
  - Cheap protein: boiled eggs, chana, peanut butter, milk, yogurt
  - No-cook options if no stove access
  - Nearby cheap food options if user allows location (optional, v2)
- Weekly hostel meal-budget tracker

### 3.6 History, Trends & Analytics
- Daily view, weekly view, monthly view
- Trend graphs: calories, protein, water, weight (if logged)
- **No single-day verdicts** — insights are framed over trends ("You've hit your protein target 3 of the last 7 days")
- Streak tracking for consistent logging and water intake

### 3.7 Reminders
- Water intake reminders (customizable frequency)
- Meal-logging reminders if user hasn't logged by a certain time
- Optional weekly summary notification/email

### 3.8 Disclaimers & Safety (non-negotiable)
- Persistent, visible disclaimer: *"NutriTrack AI provides general nutrition guidance, not medical advice. Consult a doctor or registered dietitian for medical conditions, eating disorders, or before making major dietary changes."*
- If user input suggests disordered eating patterns (extreme restriction, purging language, etc.), the agent must NOT give calorie/diet guidance and must gently direct the user to professional support instead.
- No BMI-shaming, no "good food/bad food" moralizing language anywhere in the UI or agent responses.

---

## 4. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| **Reliability** | Nutrition API calls must have fallback (cached local desi-food database) if API fails or times out |
| **Accuracy** | LLM never invents calorie/macro numbers — always sourced from API or verified local dataset |
| **Latency** | Log confirmation should return in under 3 seconds |
| **Security** | End-to-end encryption for data in transit (TLS 1.3); data at rest encrypted (AES-256) |
| **Privacy** | User health/food data never sold or shared with third parties; clear privacy policy; GDPR-style data export & delete-my-data option |
| **Auth** | Secure authentication (email/password with hashing via bcrypt/argon2, or OAuth) |
| **Scalability** | Stateless backend, horizontally scalable; database indexed on user_id + date |
| **Offline resilience** | Log entries queue locally and sync when connection returns (mobile) |
| **Track record / audit** | Every log entry is immutable once a day closes, but editable same-day; full history retained and exportable (CSV/PDF) |

---

## 5. Tech Stack (Recommended)

| Layer | Technology | Why |
|---|---|---|
| Frontend (Web) | React + TypeScript, Tailwind CSS | Fast, maintainable, matches design system easily |
| Frontend (Mobile) | React Native or Flutter | Single codebase for iOS/Android |
| Backend | Node.js (Express/Fastify) or Python (FastAPI) | FastAPI preferred if doing heavier data/LLM orchestration |
| LLM | Claude (Sonnet class) or GPT-4o via API, function-calling enabled | Structured extraction + natural advice generation |
| Nutrition Data | Nutritionix API (primary, has NLP food parsing) + USDA FoodData Central (fallback/raw ingredients) + custom desi-food dataset (built by you) | Coverage for South Asian food is the gap — must self-build this dataset |
| Database | PostgreSQL | Relational, good for structured logs + trends |
| Cache | Redis | Cache nutrition lookups, reduce API calls/cost |
| Auth | Firebase Auth or Auth0 (or custom JWT) | Fast to implement securely |
| Hosting | Vercel/Netlify (frontend), Railway/Render/AWS (backend) | Cost-effective for MVP |
| Encryption | TLS 1.3 (in transit), AES-256 (at rest via DB-level encryption) | Baseline security requirement |
| Analytics/Charts | Recharts or Chart.js | Trend visualizations |
| Notifications | Firebase Cloud Messaging (push), SendGrid (email) | Reminders and summaries |

---

## 6. LLM Extraction Schema (structured output — critical for accuracy)

The LLM's FIRST job on every message is to extract structured JSON. It must NOT calculate calories itself.

```json
{
  "date": "2026-07-20",
  "meals": [
    {
      "meal_type": "breakfast",
      "items": [
        {"name": "paratha", "quantity": 2, "unit": "piece", "confidence": "high"},
        {"name": "tea with milk", "quantity": 1, "unit": "cup", "confidence": "high"}
      ]
    },
    {
      "meal_type": "lunch",
      "items": [
        {"name": "daal chawal", "quantity": 1, "unit": "bowl", "confidence": "medium"}
      ]
    }
  ],
  "water_intake_ml": 1500,
  "clarification_needed": []
}
```

The LLM's SECOND job (after nutrition API returns real numbers) is to generate the natural-language summary and suggestions — using only the numbers returned by the API, never inventing its own.

---

## 7. System Prompt for the Advice-Generation LLM Call

```
You are NutriTrack AI, a supportive nutrition-logging assistant. You are NOT a doctor and must never diagnose or give medical verdicts.

You will receive:
1. The user's profile (age, weight, height, activity level, goal, living situation, budget if hostel)
2. Today's logged totals (calories, protein, carbs, fat, water) — these numbers come from a verified nutrition database, treat them as ground truth
3. The user's daily targets

Your job:
- Compare totals to targets factually and specifically (use real numbers, e.g. "32g protein short")
- Never say the user "is healthy" or "is unhealthy" — describe gaps and patterns only
- If living_situation is "hostel", suggestions must be budget-aware and realistic for mess-hall/limited-kitchen access — use the user's stated budget
- Suggestions must be specific and actionable (name a food, a quantity, and if hostel mode, an approximate cost)
- Never use moralizing language ("bad food," "cheat meal," "guilty")
- If the message contains signs of disordered eating (extreme restriction, compensatory behavior, obsessive language about weight), do not give dietary advice — instead gently suggest speaking with a doctor or counselor, and stop nutrition coaching for that turn
- Keep tone warm, direct, and non-judgmental — like a knowledgeable friend, not a clinician
- Always end with one concrete next action, not generic advice
```

---

## 8. Design System

### Colors
| Use | Hex |
|---|---|
| Primary Green | `#2E7D32` |
| Secondary Green (accents/success) | `#66BB6A` |
| Light Green (backgrounds) | `#E8F5E9` |
| White | `#FFFFFF` |
| Text (dark) | `#1B1B1B` |
| Text (muted) | `#5F6368` |
| Warning/Alert (used sparingly, not red-alarming) | `#F9A825` |

Keep it clean: white backgrounds, green for primary actions/progress bars/success states, no clutter, generous white space.

### Typography (not stylish — clean, readable, functional)
- **Primary font:** Inter (clean, highly legible, free, works great for data-heavy UI)
- **Alternative:** Roboto or system-ui font stack
- Headings: 600 weight, Body: 400 weight
- No decorative/script fonts anywhere — this is a data/health app, clarity over style

### UI Principles
- Progress bars/rings for calories, protein, water (green fill on white/light-green track)
- Card-based layout for meal logs
- Bottom nav (mobile): Log, Today, Trends, Profile
- Minimal icons, no emoji-heavy design — keep it professional/clean

---

## 9. Future / v2 Features (not required for MVP, but worth planning for)

- Food photo recognition (image → food identification → log)
- Barcode scanning for packaged food
- Integration with fitness trackers (Google Fit / Apple Health) for activity-adjusted targets
- Social/accountability features (share streaks with friends)
- Dietitian marketplace (connect users to real professionals for paid consults)
- Local/nearby cheap food finder for hostel students (maps integration)

---

## 10. MVP Build Order (recommended sequence)

1. Auth + Profile + Onboarding (with hostel branch)
2. Structured chat-based logging (LLM extraction → confirm → save)
3. Nutrition API integration (Nutritionix/USDA) + Redis caching
4. Daily dashboard (totals vs targets, progress rings)
5. Advice-generation LLM call (Section 7 prompt)
6. Hostel mode budget-aware suggestions
7. History/trends view
8. Reminders (water + logging)
9. Security hardening (encryption, auth review, data export/delete)
10. Custom desi-food dataset to fill API gaps

---

## 11. API Keys / Accounts You'll Need

- Anthropic or OpenAI API key (LLM)
- Nutritionix API (app ID + key) — free tier available
- USDA FoodData Central API key — free
- Firebase project (auth + push notifications) or Auth0
- SendGrid (or similar) for email summaries
- Hosting provider account (Railway/Render/AWS/Vercel)

---

## 12. Success Metrics (how you'll know it's working)

- Daily active logging rate (% of users who log at least 1 meal/day)
- Logging streak retention (7-day, 30-day)
- Water target hit-rate improvement over time
- User-reported clarity of suggestions (in-app feedback thumbs up/down on advice)
- Hostel-mode users specifically: % who report following a suggested swap

---

**End of spec.** This document is meant to be handed to a developer or AI coding agent (e.g. Claude Code) as a single complete brief — every feature, requirement, schema, prompt, and design decision needed to build v1 without back-and-forth is included above.
