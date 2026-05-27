import { pool } from "../db/pool";
import { getNextWeeklyCatalogRun, WEEKLY_CATALOG_CRON, WEEKLY_CATALOG_CRON_LABEL } from "./cronSchedule";
import { querySupplierProductCounts } from "./catalogImport";

export type RefreshStateRow = {
  last_run_started_at: Date | null;
  last_run_finished_at: Date | null;
  last_run_provider: string | null;
  last_run_rows: number | null;
  last_error: string | null;
  last_weekly_run_started_at: Date | null;
  last_weekly_run_finished_at: Date | null;
  last_weekly_run_rows: number | null;
  last_weekly_supplier_counts: Record<string, number> | null;
};

export async function loadRefreshState(): Promise<RefreshStateRow | null> {
  const { rows } = await pool.query<RefreshStateRow>(`
    SELECT
      last_run_started_at,
      last_run_finished_at,
      last_run_provider,
      last_run_rows,
      last_error,
      last_weekly_run_started_at,
      last_weekly_run_finished_at,
      last_weekly_run_rows,
      last_weekly_supplier_counts
    FROM pricing_refresh_state
    WHERE id = 1
  `);
  return rows[0] ?? null;
}

export async function buildCatalogStatus() {
  const state = await loadRefreshState();
  const suppliers = await querySupplierProductCounts();
  const cronEnabled = process.env.ENABLE_CRON === "true";

  return {
    ok: true,
    cronEnabled,
    schedule: {
      expression: WEEKLY_CATALOG_CRON,
      label: WEEKLY_CATALOG_CRON_LABEL,
      nextRun: cronEnabled ? getNextWeeklyCatalogRun().toISOString() : null,
    },
    lastRefresh: state
      ? {
          startedAt: state.last_run_started_at?.toISOString() ?? null,
          finishedAt: state.last_run_finished_at?.toISOString() ?? null,
          provider: state.last_run_provider,
          rows: state.last_run_rows ?? 0,
          error: state.last_error,
        }
      : null,
    lastWeeklyCatalogRefresh: state
      ? {
          startedAt: state.last_weekly_run_started_at?.toISOString() ?? null,
          finishedAt: state.last_weekly_run_finished_at?.toISOString() ?? null,
          rows: state.last_weekly_run_rows ?? 0,
          supplierCounts: state.last_weekly_supplier_counts ?? {},
          error: state.last_error,
        }
      : null,
    suppliers,
    catalogsDir: process.env.CATALOGS_DIR?.trim() || "./catalogs",
    sourceNote:
      "Each supplier value is one store catalog (Home Depot, Lowe's, Graybar, etc.). Data is loaded from CSV files in catalogs/ — not live-scraped for most retailers.",
  };
}
