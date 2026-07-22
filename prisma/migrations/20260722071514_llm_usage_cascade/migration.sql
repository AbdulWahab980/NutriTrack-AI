-- AddForeignKey
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
