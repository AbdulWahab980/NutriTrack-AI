-- CreateEnum
CREATE TYPE "meal_type_enum" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "food_source_enum" AS ENUM ('nutritionix', 'usda', 'custom_desi', 'manual');

-- CreateEnum
CREATE TYPE "extraction_confidence_enum" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "source" "food_source_enum" NOT NULL,
    "default_unit" TEXT NOT NULL,
    "default_quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "calories_kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "carbs_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "fiber_g" DOUBLE PRECISION,
    "approx_cost_pkr" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "total_calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_protein_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_carbs_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_fat_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_water_ml" INTEGER NOT NULL DEFAULT 0,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_entries" (
    "id" TEXT NOT NULL,
    "daily_log_id" TEXT NOT NULL,
    "food_item_id" TEXT,
    "meal_type" "meal_type_enum" NOT NULL,
    "raw_input_text" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "calories_kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "carbs_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "extraction_confidence" "extraction_confidence_enum",
    "needs_manual_entry" BOOLEAN NOT NULL DEFAULT false,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_entries" (
    "id" TEXT NOT NULL,
    "daily_log_id" TEXT NOT NULL,
    "amount_ml" INTEGER NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_items_normalized_name_idx" ON "food_items"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "food_items_normalized_name_default_unit_key" ON "food_items"("normalized_name", "default_unit");

-- CreateIndex
CREATE INDEX "daily_logs_user_id_log_date_idx" ON "daily_logs"("user_id", "log_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_user_id_log_date_key" ON "daily_logs"("user_id", "log_date");

-- CreateIndex
CREATE INDEX "meal_entries_daily_log_id_idx" ON "meal_entries"("daily_log_id");

-- CreateIndex
CREATE INDEX "water_entries_daily_log_id_idx" ON "water_entries"("daily_log_id");

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_entries" ADD CONSTRAINT "water_entries_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
