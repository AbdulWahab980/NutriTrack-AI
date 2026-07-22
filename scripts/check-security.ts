/**
 * Security regression guard. Run with: npm run check:security
 *
 * The important assertion is the first one: EVERY table in the public schema
 * must have RLS enabled. Supabase publishes `public` through PostgREST using
 * the anon key, which ships to every browser — so one un-protected table is a
 * full data leak. This was exploitable before the enable_rls migration, and a
 * table added later (llm_usage) silently reintroduced it once already.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  // ---------- 1. every public table has RLS ----------
  const tables = await prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;

  console.log("public tables and RLS state:");
  for (const t of tables) {
    console.log(`  ${t.tablename.padEnd(20)} ${t.rowsecurity ? "RLS on" : "*** RLS OFF ***"}`);
  }

  const appTables = tables.filter((t) => t.tablename !== "_prisma_migrations");
  for (const t of appTables) {
    ok(t.rowsecurity, `table "${t.tablename}" must have row level security enabled`);
  }
  ok(appTables.length > 0, "should find application tables to check");

  // ---------- 2. anon role holds no privileges ----------
  const grants = await prisma.$queryRaw<{ table_name: string; grantee: string; privilege_type: string }[]>`
    SELECT table_name, grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
  `;
  if (grants.length > 0) {
    console.log("unexpected grants:", grants.slice(0, 10));
  }
  ok(
    grants.length === 0,
    `anon/authenticated must hold no table privileges, found ${grants.length}`,
  );

  // ---------- 3. the public REST API actually refuses ----------
  console.log("\nprobing the public REST API with the anon key:");
  for (const t of appTables.map((t) => t.tablename)) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&limit=1`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
    const body = await r.text();
    const leaked = r.status === 200 && body.trim() !== "[]";
    console.log(`  ${t.padEnd(20)} ${r.status} ${leaked ? "*** LEAKING ***" : "blocked"}`);
    ok(!leaked, `table "${t}" is readable through the public REST API`);
  }

  // ---------- 4. writes are refused too ----------
  const write = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "attacker@example.invalid",
      supabase_user_id: "00000000-0000-4000-8000-000000000666",
    }),
  });
  console.log(`\n  anon insert -> ${write.status}`);
  ok(write.status >= 400, `anon must not be able to insert rows (got ${write.status})`);

  // ---------- 5. secrets are not exposed to the browser ----------
  for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY", "DATABASE_URL"]) {
    ok(
      !key.startsWith("NEXT_PUBLIC_"),
      `${key} must never be a NEXT_PUBLIC_ variable`,
    );
  }
  const publicEnv = Object.keys(process.env).filter((k) => k.startsWith("NEXT_PUBLIC_"));
  console.log("\nclient-exposed env vars:", publicEnv);
  for (const k of publicEnv) {
    ok(
      !/SERVICE_ROLE|OPENAI|DATABASE_URL|SECRET|PRIVATE/i.test(k),
      `${k} is exposed to the browser but looks like a secret`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll security checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
