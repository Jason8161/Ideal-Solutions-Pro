import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("[db] DATABASE_URL is not set — pricing API will fail until configured.");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
});

let reachableCache: { ok: boolean; checkedAt: number } | null = null;
const REACHABLE_TTL_MS = 60_000;

/** Cached probe so searches skip Postgres when Docker/local DB is down. */
export async function isDatabaseReachable(): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  const now = Date.now();
  if (reachableCache && now - reachableCache.checkedAt < REACHABLE_TTL_MS) {
    return reachableCache.ok;
  }
  try {
    await pool.query("SELECT 1");
    reachableCache = { ok: true, checkedAt: now };
    return true;
  } catch {
    reachableCache = { ok: false, checkedAt: now };
    return false;
  }
}

/** Throws a clear error before queries if the DB is not configured. */
export function requireDatabaseUrl(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL is not set on the pricing API. Copy pricing-backend/env.example to .env, set DATABASE_URL, run npm run migrate, npm run seed:csv, then restart the server.",
    );
  }
}
