import express, { Router } from "express";
import path from "path";

import {
  createServiceRequest,
  getServiceRequestById,
  listServiceRequestsForToken,
  updateServiceRequestStatus,
} from "../serviceRequests/store";
import type {
  PublicServiceRequestSubmitBody,
  ServiceRequestPriority,
  ServiceRequestWorkflowStatus,
} from "../serviceRequests/types";

const PRIORITIES: ServiceRequestPriority[] = ["normal", "urgent", "emergency"];
const WORKFLOW_STATUSES: ServiceRequestWorkflowStatus[] = [
  "new",
  "scheduled",
  "in_progress",
  "completed",
  "canceled",
];

function isPriority(v: unknown): v is ServiceRequestPriority {
  return typeof v === "string" && PRIORITIES.includes(v as ServiceRequestPriority);
}

function isWorkflowStatus(v: unknown): v is ServiceRequestWorkflowStatus {
  return typeof v === "string" && WORKFLOW_STATUSES.includes(v as ServiceRequestWorkflowStatus);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function validateSubmit(body: PublicServiceRequestSubmitBody | undefined): string | null {
  const b = body ?? ({} as PublicServiceRequestSubmitBody);
  if (!str(b.contractorToken)) return "Missing contractor token.";
  const hasName = str(b.customerName);
  const hasPhone = str(b.phone);
  const hasEmail = str(b.email);
  if (!hasName && !hasPhone && !hasEmail) {
    return "Enter at least your name, phone, or email.";
  }
  if (!str(b.description)) return "Describe the service needed.";
  if (!isPriority(b.priority)) return "Choose a priority (normal, urgent, or emergency).";
  return null;
}

export function createServiceRequestRouter(): Router {
  const router = Router();

  const publicDir = path.join(process.cwd(), "public");
  router.use("/public", express.static(publicDir));

  const requestServiceHtml = path.join(publicDir, "request-service.html");

  router.get("/request-service", (_req, res) => {
    res.sendFile(requestServiceHtml);
  });

  router.get("/request-service.html", (_req, res) => {
    res.sendFile(requestServiceHtml);
  });

  router.get("/request-service/:token", (_req, res) => {
    res.sendFile(requestServiceHtml);
  });

  /** Short customer link: https://your-api.example.com/r/{contractorToken} */
  router.get("/r/:token", (_req, res) => {
    res.sendFile(requestServiceHtml);
  });

  router.post("/api/service-requests/submit", async (req, res) => {
    const body = (req.body ?? {}) as PublicServiceRequestSubmitBody;
    const err = validateSubmit(body);
    if (err) {
      res.status(400).json({ ok: false, error: err });
      return;
    }
    try {
      const record = await createServiceRequest(body);
      res.status(201).json({
        ok: true,
        id: record.id,
        message: "Your service request has been sent.",
        submittedAt: record.submittedAt,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save request";
      res.status(500).json({ ok: false, error: msg });
    }
  });

  router.get("/api/service-requests/inbox", async (req, res) => {
    const token =
      typeof req.query.contractorToken === "string" ? req.query.contractorToken.trim() : "";
    if (!token) {
      res.status(400).json({ ok: false, error: "contractorToken is required", requests: [] });
      return;
    }
    try {
      const requests = await listServiceRequestsForToken(token);
      res.json({ ok: true, requests });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Inbox unavailable";
      res.status(500).json({ ok: false, error: msg, requests: [] });
    }
  });

  router.get("/api/service-requests/:id", async (req, res) => {
    const token =
      typeof req.query.contractorToken === "string" ? req.query.contractorToken.trim() : "";
    const record = await getServiceRequestById(req.params.id);
    if (!record || (token && record.contractorToken !== token)) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    res.json({ ok: true, request: record });
  });

  router.patch("/api/service-requests/:id/status", async (req, res) => {
    const token =
      typeof req.body?.contractorToken === "string" ? req.body.contractorToken.trim() : "";
    const workflowStatus = req.body?.workflowStatus;
    if (!token) {
      res.status(400).json({ ok: false, error: "contractorToken is required" });
      return;
    }
    if (!isWorkflowStatus(workflowStatus)) {
      res.status(400).json({ ok: false, error: "Invalid workflowStatus" });
      return;
    }
    const updated = await updateServiceRequestStatus(req.params.id, token, workflowStatus);
    if (!updated) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    res.json({ ok: true, request: updated });
  });

  return router;
}
