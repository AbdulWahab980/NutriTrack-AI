-- CreateTable
CREATE TABLE "ai_feedback" (
    "id" TEXT NOT NULL,
    "daily_log_id" TEXT NOT NULL,
    "feedback_text" TEXT NOT NULL,
    "suggested_actions" JSONB,
    "user_rating" INTEGER,
    "flagged_disordered_eating" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_feedback_daily_log_id_idx" ON "ai_feedback"("daily_log_id");

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
