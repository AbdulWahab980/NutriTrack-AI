-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "activity_level_enum" AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');

-- CreateEnum
CREATE TYPE "goal_enum" AS ENUM ('weight_loss', 'muscle_gain', 'maintenance', 'general_health');

-- CreateEnum
CREATE TYPE "living_situation_enum" AS ENUM ('hostel', 'home', 'pg', 'other');

-- CreateEnum
CREATE TYPE "kitchen_access_enum" AS ENUM ('fridge_only', 'kettle', 'induction', 'none');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabase_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "gender_enum" NOT NULL,
    "height_cm" DOUBLE PRECISION NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "activity_level" "activity_level_enum" NOT NULL,
    "goal" "goal_enum" NOT NULL,
    "living_situation" "living_situation_enum" NOT NULL,
    "daily_food_budget_pkr" DOUBLE PRECISION,
    "has_mess_plan" BOOLEAN,
    "mess_notes" TEXT,
    "kitchen_access" "kitchen_access_enum",
    "dietary_restrictions" TEXT[],
    "bmr_kcal" DOUBLE PRECISION NOT NULL,
    "tdee_kcal" DOUBLE PRECISION NOT NULL,
    "target_calories" DOUBLE PRECISION NOT NULL,
    "target_protein_g" DOUBLE PRECISION NOT NULL,
    "target_carbs_g" DOUBLE PRECISION NOT NULL,
    "target_fat_g" DOUBLE PRECISION NOT NULL,
    "target_water_ml" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_supabase_user_id_key" ON "users"("supabase_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
