-- llm_usage was created after the enable_rls migration, so it did not inherit
-- the deny-by-default posture. Any table added to `public` from now on must
-- get the same treatment — scripts/check-security.ts asserts this for every
-- table so the gap cannot reappear silently.

REVOKE ALL ON TABLE "llm_usage" FROM anon, authenticated;
ALTER TABLE "llm_usage" ENABLE ROW LEVEL SECURITY;
