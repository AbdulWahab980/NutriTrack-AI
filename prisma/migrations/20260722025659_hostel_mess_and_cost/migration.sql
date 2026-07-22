-- AlterTable
ALTER TABLE "meal_entries" ADD COLUMN     "estimated_cost_pkr" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "hostel_mess_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "meal_type" "meal_type_enum" NOT NULL,
    "day_of_week" INTEGER,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostel_mess_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hostel_mess_items_user_id_idx" ON "hostel_mess_items"("user_id");

-- AddForeignKey
ALTER TABLE "hostel_mess_items" ADD CONSTRAINT "hostel_mess_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
