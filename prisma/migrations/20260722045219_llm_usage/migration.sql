-- CreateEnum
CREATE TYPE "llm_call_kind_enum" AS ENUM ('extraction', 'advice', 'hostel');

-- CreateTable
CREATE TABLE "llm_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "usage_date" DATE NOT NULL,
    "kind" "llm_call_kind_enum" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "llm_usage_user_id_usage_date_kind_key" ON "llm_usage"("user_id", "usage_date", "kind");
