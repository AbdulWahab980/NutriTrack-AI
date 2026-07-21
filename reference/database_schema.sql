-- ============================================================
-- NutriTrack AI — PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,   -- bcrypt/argon2 hash, never plaintext
    full_name       VARCHAR(150) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ
);

-- ============================================================
-- USER PROFILE (onboarding data + calculated targets)
-- ============================================================
CREATE TYPE living_situation_enum AS ENUM ('hostel', 'home', 'pg', 'other');
CREATE TYPE activity_level_enum AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE goal_enum AS ENUM ('weight_loss', 'muscle_gain', 'maintenance', 'general_health');
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TABLE user_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    age                 SMALLINT NOT NULL CHECK (age BETWEEN 10 AND 100),
    gender              gender_enum NOT NULL,
    height_cm           NUMERIC(5,2) NOT NULL CHECK (height_cm > 0),
    weight_kg           NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0),
    activity_level      activity_level_enum NOT NULL,
    goal                goal_enum NOT NULL,
    living_situation     living_situation_enum NOT NULL,

    -- hostel-specific fields (nullable, only used if living_situation = 'hostel')
    daily_food_budget_pkr   NUMERIC(8,2),
    has_mess_plan           BOOLEAN,
    kitchen_access          VARCHAR(50), -- 'fridge_only' | 'kettle' | 'induction' | 'none'
    dietary_restrictions    TEXT[],       -- e.g. ARRAY['vegetarian','lactose_intolerant']

    -- calculated targets (recomputed whenever profile changes)
    bmr_kcal            NUMERIC(6,2) NOT NULL,
    tdee_kcal           NUMERIC(6,2) NOT NULL,
    target_calories     NUMERIC(6,2) NOT NULL,
    target_protein_g    NUMERIC(6,2) NOT NULL,
    target_carbs_g       NUMERIC(6,2) NOT NULL,
    target_fat_g         NUMERIC(6,2) NOT NULL,
    target_water_ml     INTEGER NOT NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FOOD REFERENCE CACHE
-- Local cache of nutrition-API lookups + your custom desi-food dataset.
-- Always check this table BEFORE calling an external API (cost + latency + reliability).
-- ============================================================
CREATE TYPE food_source_enum AS ENUM ('nutritionix', 'usda', 'custom_desi', 'manual');

CREATE TABLE food_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(200) NOT NULL,
    normalized_name     VARCHAR(200) NOT NULL, -- lowercase, trimmed, for fast lookup/matching
    source              food_source_enum NOT NULL,
    default_unit        VARCHAR(30) NOT NULL,   -- 'piece','bowl','cup','g','ml'
    default_quantity    NUMERIC(8,2) NOT NULL DEFAULT 1,
    calories_kcal       NUMERIC(8,2) NOT NULL,
    protein_g           NUMERIC(8,2) NOT NULL,
    carbs_g             NUMERIC(8,2) NOT NULL,
    fat_g               NUMERIC(8,2) NOT NULL,
    fiber_g             NUMERIC(8,2),
    approx_cost_pkr     NUMERIC(8,2),           -- used for hostel budget suggestions
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_items_normalized_name ON food_items USING gin (normalized_name gin_trgm_ops);
-- requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- DAILY LOG (one row per user per day — aggregation anchor)
-- ============================================================
CREATE TABLE daily_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date            DATE NOT NULL,
    total_calories       NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_protein_g      NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_carbs_g        NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_fat_g          NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_water_ml       INTEGER NOT NULL DEFAULT 0,
    is_finalized         BOOLEAN NOT NULL DEFAULT false, -- locks after day rolls over; editable same-day only
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, log_date)
);

CREATE INDEX idx_daily_logs_user_date ON daily_logs (user_id, log_date DESC);

-- ============================================================
-- MEAL ENTRIES (individual logged items within a day)
-- ============================================================
CREATE TYPE meal_type_enum AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

CREATE TABLE meal_entries (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id        UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    food_item_id         UUID REFERENCES food_items(id), -- nullable if unmatched/manual entry
    meal_type            meal_type_enum NOT NULL,
    raw_input_text        TEXT NOT NULL,   -- original user phrase, kept for audit/debugging extraction
    quantity              NUMERIC(8,2) NOT NULL,
    unit                  VARCHAR(30) NOT NULL,
    calories_kcal          NUMERIC(8,2) NOT NULL,
    protein_g              NUMERIC(8,2) NOT NULL,
    carbs_g                NUMERIC(8,2) NOT NULL,
    fat_g                   NUMERIC(8,2) NOT NULL,
    extraction_confidence   VARCHAR(10),   -- 'high' | 'medium' | 'low'
    logged_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_entries_daily_log ON meal_entries (daily_log_id);

-- ============================================================
-- WATER LOG (individual entries, summed into daily_logs.total_water_ml)
-- ============================================================
CREATE TABLE water_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id    UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    amount_ml       INTEGER NOT NULL CHECK (amount_ml > 0),
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_water_entries_daily_log ON water_entries (daily_log_id);

-- ============================================================
-- AI FEEDBACK LOG (stores generated advice per day — for history + user feedback loop)
-- ============================================================
CREATE TABLE ai_feedback (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id        UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    feedback_text        TEXT NOT NULL,
    suggested_actions     JSONB,             -- structured list of suggestions shown to user
    user_rating           SMALLINT,          -- thumbs up/down: 1 = helpful, -1 = not helpful, NULL = no feedback
    flagged_disordered_eating BOOLEAN NOT NULL DEFAULT false,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STREAKS / GAMIFICATION
-- ============================================================
CREATE TABLE user_streaks (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_logging_streak    INTEGER NOT NULL DEFAULT 0,
    longest_logging_streak     INTEGER NOT NULL DEFAULT 0,
    current_water_streak        INTEGER NOT NULL DEFAULT 0,
    longest_water_streak         INTEGER NOT NULL DEFAULT 0,
    last_logged_date              DATE,
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- HOSTEL MESS MENU (optional, saved recurring mess meals for quick logging)
-- ============================================================
CREATE TABLE hostel_mess_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_type        meal_type_enum NOT NULL,
    day_of_week      SMALLINT CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    description       VARCHAR(300) NOT NULL, -- e.g. "Daal chawal + salad"
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TABLE reminder_settings (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    water_reminders_enabled   BOOLEAN NOT NULL DEFAULT true,
    water_reminder_interval_min INTEGER NOT NULL DEFAULT 120,
    meal_reminders_enabled     BOOLEAN NOT NULL DEFAULT true,
    weekly_summary_enabled      BOOLEAN NOT NULL DEFAULT true,
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT / DATA EXPORT REQUESTS (privacy compliance)
-- ============================================================
CREATE TABLE data_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type    VARCHAR(20) NOT NULL, -- 'export' | 'delete'
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

-- ============================================================
-- TRIGGER: auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_daily_logs_updated_at BEFORE UPDATE ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
