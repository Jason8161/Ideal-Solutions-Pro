import "dotenv/config";
import cors from "cors";
import express from "express";
import cron from "node-cron";
import { buildCatalogStatus } from "./catalog/catalogStatus";
import { querySupplierProductCounts } from "./catalog/catalogImport";
import { WEEKLY_CATALOG_CRON, WEEKLY_CATALOG_CRON_LABEL } from "./catalog/cronSchedule";
import { probeInternetReachable } from "./net/probeInternet";
import { parseSearchLengthQtyParams, parseVendorPresetFilter } from "./pricing/lengthQty";
import { PricingOrchestrator } from "./pricing/PricingOrchestrator";
import { formatProviderError } from "./pricing/searchHelpers";
import { sendSearchResponse } from "./searchResponse";
import { createAiAssistanceRouter } from "./routes/aiAssistanceRoutes";
import { createPhotoEstimateRouter } from "./routes/photoEstimateRoutes";
import { createPricingRouter } from "./routes/pricingRoutes";
import { createServiceRequestRouter } from "./routes/serviceRequestRoutes";
import { createPayRouter } from "./routes/payRoutes";
import { createClockEventRouter } from "./routes/clockEventRoutes";
import { createAuthRouter } from "./routes/authRoutes";
import { createWorkspaceRouter } from "./routes/workspaceRoutes";
import { isDatabaseReachable } from "./db/pool";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "12mb" }));

const orchestrator = new PricingOrchestrator();

app.get("/health", async (_req, res) => {
  const db = Boolean(process.env.DATABASE_URL?.trim());
  const lowesLive = Boolean(process.env.UNWRANGLE_API_KEY?.trim());
  const homeDepotLive = Boolean(
    process.env.HOMEDEPOT_API_KEY?.trim() || process.env.UNWRANGLE_API_KEY?.trim(),
  );
  let catalogSummary: { supplierCount: number; productRows: number } | null = null;
  let databaseReachable = false;
  if (db) {
    try {
      const suppliers = await querySupplierProductCounts();
      databaseReachable = true;
      catalogSummary = {
        supplierCount: suppliers.length,
        productRows: suppliers.reduce((n, s) => n + s.productCount, 0),
      };
    } catch {
      catalogSummary = null;
    }
  }
  res.json({
    ok: true,
    service: "ideal-solutions-pricing-api",
    databaseConfigured: db,
    databaseReachable,
    databaseSetupHint: databaseReachable
      ? null
      : "Postgres unreachable or empty — run npm run setup:local in pricing-backend, then npm run dev",
    cronEnabled: process.env.ENABLE_CRON === "true",
    weeklyCatalogCron: WEEKLY_CATALOG_CRON_LABEL,
    catalogSummary,
    lowesLiveSearch: lowesLive,
    homeDepotLiveSearch: homeDepotLive,
    lowesLiveNote: lowesLive
      ? "Unwrangle third-party API (not Lowe's official)"
      : "Set UNWRANGLE_API_KEY for optional live Lowe's search; weekly CSV catalogs are the source of truth",
    homeDepotLiveNote: homeDepotLive
      ? "Unwrangle homedepot_search (not Home Depot official)"
      : "Set HOMEDEPOT_API_KEY or UNWRANGLE_API_KEY for optional live Home Depot search",
    homeDepotStoreConfigured: Boolean(process.env.HOMEDEPOT_STORE_NO?.trim()),
    homeDepotZipConfigured: Boolean(process.env.HOMEDEPOT_ZIPCODE?.trim()),
    cityElectricLiveSearch: false,
    cityElectricCatalogNote:
      "City Electric uses catalogs/cityelectric.csv — no Unwrangle live platform",
    aiAssistanceConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    serviceRequestForm: "/request-service",
    serviceRequestSubmit: "POST /api/service-requests/submit",
    serviceRequestInbox: "GET /api/service-requests/inbox?contractorToken=…",
    invoicePayPage: "/pay?invoice=…&amount=…&m=…",
    workspaceApi: "/api/workspace/company",
    workspaceInvites: "POST /api/workspace/invites",
  });
});

app.get("/catalog/status", async (_req, res) => {
  try {
    res.json(await buildCatalogStatus());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Status unavailable";
    res.status(503).json({ ok: false, error: msg });
  }
});

app.get("/catalog/suppliers", async (_req, res) => {
  try {
    const suppliers = await querySupplierProductCounts();
    res.json({ suppliers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Suppliers unavailable";
    res.status(503).json({ error: msg, suppliers: [] });
  }
});

/** Mobile app primary entry: `${PRICING_API_URL}/search?q=...` */
app.get("/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const lengthQty = parseSearchLengthQtyParams(req.query as Record<string, unknown>);
  const vendorPresetFilter = parseVendorPresetFilter(req.query as Record<string, unknown>);
  try {
    const payload = await orchestrator.searchProducts(query, lengthQty, vendorPresetFilter);
    sendSearchResponse(res, payload);
  } catch (e) {
    const message = formatProviderError(e);
    console.error("[search] unexpected failure", e);
    sendSearchResponse(res, {
      query,
      results: [],
      errors: [{ supplier: "server", message: message || "Search failed" }],
    });
  }
});

app.use("/api/pricing", createPricingRouter(orchestrator));
app.use("/api", createAiAssistanceRouter());
app.use("/api", createPhotoEstimateRouter());
app.use(createServiceRequestRouter());
app.use(createPayRouter());
app.use(createClockEventRouter());
app.use(createAuthRouter());
app.use(createWorkspaceRouter());

if (process.env.ENABLE_CRON === "true") {
  cron.schedule(WEEKLY_CATALOG_CRON, () => {
    void orchestrator.runWeeklyCatalogRefresh().then(
      (r) => console.log("[cron] weekly catalog refresh", r),
      (e) => console.error("[cron] weekly catalog refresh failed", e),
    );
  });
  console.log(`[cron] Weekly catalog refresh enabled (${WEEKLY_CATALOG_CRON_LABEL}).`);
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Pricing API listening on http://0.0.0.0:${port} (LAN: http://<this-host-ip>:${port})`);
  const unwrangle = Boolean(process.env.UNWRANGLE_API_KEY?.trim());
  const hdKey = Boolean(
    process.env.HOMEDEPOT_API_KEY?.trim() || process.env.UNWRANGLE_API_KEY?.trim(),
  );
  const hdStore = Boolean(process.env.HOMEDEPOT_STORE_NO?.trim());
  const hdZip = Boolean(process.env.HOMEDEPOT_ZIPCODE?.trim());
  console.log(
    `[config] lowes_live=${unwrangle} homedepot_live=${hdKey} homedepot_store=${hdStore} homedepot_zip=${hdZip} (restart after .env changes)`,
  );
  if (!hdKey) {
    console.log(
      "[config] Live Home Depot search disabled — set UNWRANGLE_API_KEY or HOMEDEPOT_API_KEY in pricing-backend/.env",
    );
  }
  void probeInternetReachable().then((ok) => {
    console.log(
      ok
        ? "[net] Outbound internet reachable from Node (live supplier APIs should work)."
        : "[net] Outbound internet NOT reachable from Node — lowes_live and other HTTP suppliers may fail.",
    );
  });
  if (process.env.DATABASE_URL?.trim()) {
    void isDatabaseReachable().then((ok) => {
      if (!ok) {
        console.warn(
          "[db] Postgres not reachable — catalog_db skipped; CSV file search still works. Run npm run setup:local when Docker is available.",
        );
      }
    });
  }
});
