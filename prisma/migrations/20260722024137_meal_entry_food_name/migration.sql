/*
  Warnings:

  - Added the required column `food_name` to the `meal_entries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "meal_entries" ADD COLUMN     "food_name" TEXT NOT NULL;
