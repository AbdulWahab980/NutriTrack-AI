/**
 * Seeds the custom desi-food dataset into food_items (spec §10).
 * Idempotent — safe to re-run. Run with: npm run seed:foods
 *
 * Aliases are stored as their own rows sharing the same values, because
 * lookup is a direct normalized-name match.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DESI_FOODS } from "../src/data/desi-foods";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

async function main() {
  let written = 0;

  for (const food of DESI_FOODS) {
    const names = [food.name, ...(food.aliases ?? [])];
    for (const name of names) {
      await prisma.foodItem.upsert({
        where: {
          normalizedName_defaultUnit: {
            normalizedName: normalize(name),
            defaultUnit: food.defaultUnit,
          },
        },
        update: {
          caloriesKcal: food.caloriesKcal,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          fiberG: food.fiberG ?? null,
          approxCostPkr: food.approxCostPkr ?? null,
          defaultQuantity: food.defaultQuantity,
        },
        create: {
          // Aliases keep their own display name so the confirm-back echoes
          // what the user actually said.
          name,
          normalizedName: normalize(name),
          source: "CUSTOM_DESI",
          defaultUnit: food.defaultUnit,
          defaultQuantity: food.defaultQuantity,
          caloriesKcal: food.caloriesKcal,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          fiberG: food.fiberG ?? null,
          approxCostPkr: food.approxCostPkr ?? null,
        },
      });
      written++;
    }
  }

  const total = await prisma.foodItem.count();
  console.log(`Seeded ${written} rows from ${DESI_FOODS.length} foods.`);
  console.log(`food_items now contains ${total} rows.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e.message);
    process.exit(1);
  });
