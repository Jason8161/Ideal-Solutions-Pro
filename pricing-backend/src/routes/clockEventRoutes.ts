import { Router } from "express";

import { batchSyncClockEvents } from "../clockEvents/store";

export function createClockEventRouter(): Router {
  const router = Router();

  router.post("/api/clock-events/batch", async (req, res) => {
    try {
      const events = Array.isArray(req.body?.events) ? req.body.events : [];
      if (events.length === 0) {
        res.status(400).json({ ok: false, error: "events array is required." });
        return;
      }
      if (events.length > 50) {
        res.status(400).json({ ok: false, error: "Maximum 50 events per batch." });
        return;
      }
      const result = await batchSyncClockEvents(req.headers.authorization, events);
      res.json({ ok: true, ...result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Batch sync failed.";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 500;
      res.status(status).json({ ok: false, error: msg });
    }
  });

  router.get("/api/clock-events/health", (_req, res) => {
    res.json({ ok: true, service: "clock-events-api" });
  });

  return router;
}
