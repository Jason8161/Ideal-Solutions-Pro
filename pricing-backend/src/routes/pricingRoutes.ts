import { Router } from "express";
import { buildCatalogStatus } from "../catalog/catalogStatus";
import { querySupplierProductCounts } from "../catalog/catalogImport";
import { parseSearchLengthQtyParams, parseVendorPresetFilter } from "../pricing/lengthQty";
import type { PricingOrchestrator } from "../pricing/PricingOrchestrator";
import { formatProviderError } from "../pricing/searchHelpers";
import { isAllowedVendorPreset } from "../pricing/vendorPresetMatch";
import { sendSearchResponse } from "../searchResponse";

export function createPricingRouter(orchestrator: PricingOrchestrator): Router {
  const r = Router();

  r.get("/v1/search/estimates", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const lengthQty = parseSearchLengthQtyParams(req.query as Record<string, unknown>);
    try {
      const payload = await orchestrator.searchEstimatesOnly(query, lengthQty);
      sendSearchResponse(res, payload);
    } catch (e) {
      const message = formatProviderError(e);
      console.error("[api/pricing/v1/search/estimates] unexpected failure", e);
      sendSearchResponse(res, {
        query,
        results: [],
        errors: [{ supplier: "server", message: message || "Search failed" }],
      });
    }
  });

  r.get("/v1/vendor/:preset/search", async (req, res) => {
    const preset = typeof req.params.preset === "string" ? req.params.preset : "";
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const lengthQty = parseSearchLengthQtyParams(req.query as Record<string, unknown>);
    if (!isAllowedVendorPreset(preset)) {
      res.status(400).json({
        query,
        results: [],
        errors: [{ supplier: "server", message: `Unknown vendor preset: ${preset}` }],
      });
      return;
    }
    try {
      const payload = await orchestrator.searchVendorPreset(query, lengthQty, preset);
      sendSearchResponse(res, payload);
    } catch (e) {
      const message = formatProviderError(e);
      console.error("[api/pricing/v1/vendor/:preset/search] unexpected failure", e);
      sendSearchResponse(res, {
        query,
        results: [],
        errors: [{ supplier: "server", message: message || "Search failed" }],
      });
    }
  });

  r.get("/v1/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const lengthQty = parseSearchLengthQtyParams(req.query as Record<string, unknown>);
    const vendorPresetFilter = parseVendorPresetFilter(req.query as Record<string, unknown>);
    try {
      const payload = await orchestrator.searchProducts(query, lengthQty, vendorPresetFilter);
      sendSearchResponse(res, payload);
    } catch (e) {
      const message = formatProviderError(e);
      console.error("[api/pricing/v1/search] unexpected failure", e);
      sendSearchResponse(res, {
        query,
        results: [],
        errors: [{ supplier: "server", message: message || "Search failed" }],
      });
    }
  });

  r.get("/v1/catalog/status", async (_req, res) => {
    try {
      res.json(await buildCatalogStatus());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Status unavailable";
      res.status(503).json({ ok: false, error: msg });
    }
  });

  r.get("/v1/catalog/suppliers", async (_req, res) => {
    try {
      const suppliers = await querySupplierProductCounts();
      res.json({ suppliers });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Suppliers unavailable";
      res.status(503).json({ error: msg, suppliers: [] });
    }
  });

  r.get("/v1/products/:supplier/:sku/price", async (req, res) => {
    try {
      const row = await orchestrator.getProductPrice(req.params.supplier, req.params.sku);
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(row);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lookup failed";
      res.status(500).json({ error: msg });
    }
  });

  r.post("/v1/admin/refresh-pricing", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.authorization;
    if (!secret || auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const out = await orchestrator.runWeeklyCatalogRefresh();
      res.json(out);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refresh failed";
      res.status(500).json({ error: msg });
    }
  });

  return r;
}
