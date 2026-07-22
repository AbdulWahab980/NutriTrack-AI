-- Lock down direct API access to application tables.
--
-- Supabase exposes every table in `public` through PostgREST at
-- https://<ref>.supabase.co/rest/v1/<table>, authorised with the anon key.
-- That key is NEXT_PUBLIC_ and ships to every browser, so without this
-- migration any visitor could read every user's email, body metrics, and
-- full food history. Verified exploitable before this change.
--
-- This app never reads or writes data through the Supabase client — it uses
-- Supabase for authentication only, and all data access goes through Prisma
-- over a direct Postgres connection as the table owner. Table owners bypass
-- RLS (we deliberately do not FORCE it), so enabling RLS with no policies
-- blocks PostgREST completely while leaving the application unaffected.
--
-- Two independent layers, on purpose:
--   1. REVOKE  — the anon/authenticated roles hold no privileges at all.
--   2. RLS     — even if a privilege is granted later, no policy exists,
--                so every row is filtered out by default.

-- ---------- 1. Remove privileges from the public-facing roles ----------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Stop future tables from being granted to those roles automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- ---------- 2. Enable RLS with no policies (deny-by-default) ----------
ALTER TABLE "users"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_profiles"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_logs"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meal_entries"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "water_entries"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "weight_entries"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_feedback"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hostel_mess_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminder_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_requests"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_items"        ENABLE ROW LEVEL SECURITY;
