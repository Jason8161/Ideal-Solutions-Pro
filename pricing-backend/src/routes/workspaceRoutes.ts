import { Router } from "express";

import type { MessageChannelType } from "../workspace/types";
import {
  buildInviteLink,
  createInvite,
  createMessage,
  listEmployees,
  listInvites,
  listJobAssignments,
  listMessages,
  listNotifications,
  redeemInvite,
  registerPushToken,
  requireAuth,
  resolveAuth,
  upsertCompanyForBoss,
  upsertJobAssignment,
} from "../workspace/store";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isChannelType(v: unknown): v is MessageChannelType {
  return v === "team" || v === "dm" || v === "job";
}

export function createWorkspaceRouter(): Router {
  const router = Router();

  router.get("/api/workspace/health", (_req, res) => {
    res.json({ ok: true, service: "ideal-workspace-api" });
  });

  /** Boss: register or refresh company on cloud (device id + company name). */
  router.post("/api/workspace/company", async (req, res) => {
    try {
      const bossDeviceId = str(req.body?.bossDeviceId) || str(req.headers["x-boss-device-id"]);
      const name = str(req.body?.name);
      if (!bossDeviceId) {
        res.status(400).json({ ok: false, error: "bossDeviceId is required." });
        return;
      }
      const existing = await resolveAuth(req.headers.authorization);
      if (existing?.user.roleId === "boss") {
        res.json({
          ok: true,
          company: existing.company,
          bossToken: existing.company.bossToken,
          userId: existing.user.id,
        });
        return;
      }
      const result = await upsertCompanyForBoss(bossDeviceId, name);
      res.json({
        ok: true,
        created: result.created,
        company: result.company,
        bossToken: result.bossToken,
        userId: result.bossUser.id,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Company setup failed.";
      res.status(500).json({ ok: false, error: msg });
    }
  });

  router.get("/api/workspace/company", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      res.json({ ok: true, company: auth.company, user: auth.user, employee: auth.employee });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      res.status(401).json({ ok: false, error: msg });
    }
  });

  router.post("/api/workspace/invites", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      if (auth.user.roleId !== "boss") {
        res.status(403).json({ ok: false, error: "Only boss can create invites." });
        return;
      }
      const invite = await createInvite(auth, {
        phone: str(req.body?.phone),
        email: str(req.body?.email),
        employeeId: str(req.body?.employeeId) || undefined,
        localEmployeeId: str(req.body?.localEmployeeId) || undefined,
        firstName: str(req.body?.firstName) || undefined,
        lastName: str(req.body?.lastName) || undefined,
        expiresInDays:
          typeof req.body?.expiresInDays === "number" ? req.body.expiresInDays : undefined,
      });
      const baseUrl = str(req.body?.appBaseUrl) || str(process.env.WORKSPACE_APP_BASE_URL);
      const inviteLink = baseUrl ? buildInviteLink(baseUrl, invite.code) : null;
      res.json({ ok: true, invite, inviteLink });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create invite.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.get("/api/workspace/invites", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      if (auth.user.roleId !== "boss") {
        res.status(403).json({ ok: false, error: "Only boss can list invites." });
        return;
      }
      const invites = await listInvites(auth);
      res.json({ ok: true, invites });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      res.status(401).json({ ok: false, error: msg });
    }
  });

  router.post("/api/workspace/invites/redeem", async (req, res) => {
    try {
      const code = str(req.body?.code);
      if (!code) {
        res.status(400).json({ ok: false, error: "Invite code is required." });
        return;
      }
      const auth = await redeemInvite({
        code,
        displayName: str(req.body?.displayName) || undefined,
        phone: str(req.body?.phone) || undefined,
        email: str(req.body?.email) || undefined,
        deviceId: str(req.body?.deviceId) || undefined,
      });
      res.json({
        ok: true,
        authToken: auth.user.authToken,
        user: auth.user,
        company: auth.company,
        employee: auth.employee,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not redeem invite.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.get("/api/workspace/employees", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      const employees = await listEmployees(auth);
      res.json({ ok: true, employees });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      res.status(401).json({ ok: false, error: msg });
    }
  });

  router.get("/api/workspace/messages", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      const channelType = req.query.channelType;
      const channelId = str(req.query.channelId) || "default";
      if (!isChannelType(channelType)) {
        res.status(400).json({ ok: false, error: "channelType must be team, dm, or job." });
        return;
      }
      const since = str(req.query.since) || undefined;
      const messages = await listMessages(auth, channelType, channelId, since);
      res.json({ ok: true, messages });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load messages.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.post("/api/workspace/messages", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      const channelType = req.body?.channelType;
      const channelId = str(req.body?.channelId) || "default";
      const body = str(req.body?.body);
      if (!isChannelType(channelType)) {
        res.status(400).json({ ok: false, error: "channelType must be team, dm, or job." });
        return;
      }
      if (!body) {
        res.status(400).json({ ok: false, error: "Message body is required." });
        return;
      }
      const message = await createMessage(auth, channelType, channelId, body);
      res.json({ ok: true, message });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send message.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.get("/api/workspace/assignments", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      const employeeId = str(req.query.employeeId) || undefined;
      const assignments = await listJobAssignments(auth, employeeId);
      res.json({ ok: true, assignments });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load assignments.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.post("/api/workspace/assignments", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      const jobId = str(req.body?.jobId);
      const employeeId = str(req.body?.employeeId);
      if (!jobId || !employeeId) {
        res.status(400).json({ ok: false, error: "jobId and employeeId are required." });
        return;
      }
      const assignment = await upsertJobAssignment(auth, jobId, employeeId);
      res.json({ ok: true, assignment });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not assign job.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.get("/api/workspace/notifications", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      const notifications = await listNotifications(auth);
      res.json({ ok: true, notifications });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      res.status(401).json({ ok: false, error: msg });
    }
  });

  router.post("/api/workspace/push-token", async (req, res) => {
    try {
      const auth = await requireAuth(req.headers.authorization);
      const expoPushToken = str(req.body?.expoPushToken);
      if (!expoPushToken) {
        res.status(400).json({ ok: false, error: "expoPushToken is required." });
        return;
      }
      await registerPushToken(auth, expoPushToken, str(req.body?.platform));
      res.json({ ok: true, registered: true, note: "Server push send is phase 2." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not register push token.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  return router;
}
