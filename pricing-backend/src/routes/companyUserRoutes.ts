import { Router } from "express";

import { hashPassword, validateServerPassword } from "../auth/password";
import {
  findAccountByEmail,
  newUserId,
  normalizeEmail,
  saveAccount,
} from "../auth/store";
import type { AppAccountRecord } from "../auth/types";
import { requireCompanyAuth } from "../company/authContext";
import { isBossRole } from "../company/employeeGuard";
import { COMPANY_ROLE_IDS, roleLabel, isCompanyRoleId } from "../company/roles";
import {
  acceptCompanyInvite,
  buildCompanyInviteLink,
  createCompanyInvite,
  findInviteByCode,
  listAuditEvents,
  listCompanyInvites,
  listCompanyUsers,
  recordAuditEvent,
  setMemberStatus,
  updateMemberRole,
} from "../company/store";
import { accountLookup } from "../company/authContext";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function createCompanyUserRouter(): Router {
  const router = Router();

  router.get("/api/company/roles", (_req, res) => {
    res.json({
      ok: true,
      roles: COMPANY_ROLE_IDS.map((id: (typeof COMPANY_ROLE_IDS)[number]) => ({ id, label: roleLabel(id) })),
    });
  });

  router.get("/api/company/me", async (req, res) => {
    try {
      const ctx = await requireCompanyAuth(req.headers.authorization);
      res.json({ ok: true, company: { id: ctx.companyId, name: ctx.companyName }, user: ctx });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      res.status(401).json({ ok: false, error: msg });
    }
  });

  router.get("/api/company/users", async (req, res) => {
    try {
      const ctx = await requireCompanyAuth(req.headers.authorization);
      if (!isBossRole(ctx.roleId)) {
        res.status(403).json({ ok: false, error: "Boss access required." });
        return;
      }
      const users = await listCompanyUsers(ctx.companyId, accountLookup);
      res.json({ ok: true, users, subscriptionTier: ctx.subscriptionTier });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      const status = msg === "Unauthorized" || msg === "Company membership required." ? 401 : 403;
      res.status(status).json({ ok: false, error: msg });
    }
  });

  router.post("/api/company/invites", async (req, res) => {
    try {
      const ctx = await requireCompanyAuth(req.headers.authorization);
      if (!isBossRole(ctx.roleId)) {
        res.status(403).json({ ok: false, error: "Boss access required." });
        return;
      }
      const email = str(req.body?.email);
      const roleId = str(req.body?.roleId);
      if (!isCompanyRoleId(roleId)) {
        res.status(400).json({ ok: false, error: "roleId is required." });
        return;
      }
      const invite = await createCompanyInvite(ctx, {
        email,
        roleId,
        expiresInDays:
          typeof req.body?.expiresInDays === "number" ? req.body.expiresInDays : undefined,
      });
      const baseUrl = str(req.body?.appBaseUrl) || str(process.env.WORKSPACE_APP_BASE_URL);
      const inviteLink = baseUrl ? buildCompanyInviteLink(baseUrl, invite.code) : null;
      res.json({ ok: true, invite, inviteLink });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create invite.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.get("/api/company/invites", async (req, res) => {
    try {
      const ctx = await requireCompanyAuth(req.headers.authorization);
      if (!isBossRole(ctx.roleId)) {
        res.status(403).json({ ok: false, error: "Boss access required." });
        return;
      }
      const invites = await listCompanyInvites(ctx.companyId);
      res.json({ ok: true, invites });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      res.status(401).json({ ok: false, error: msg });
    }
  });

  router.get("/api/company/invites/preview", async (req, res) => {
    try {
      const code = str(req.query.code);
      if (!code) {
        res.status(400).json({ ok: false, error: "code is required." });
        return;
      }
      const invite = await findInviteByCode(code);
      if (!invite) {
        res.status(404).json({ ok: false, error: "Invalid invite code." });
        return;
      }
      res.json({
        ok: true,
        invite: {
          email: invite.email,
          roleId: invite.roleId,
          roleLabel: roleLabel(invite.roleId),
          expiresAt: invite.expiresAt,
          accepted: Boolean(invite.acceptedAt),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load invite.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.post("/api/company/invites/accept", async (req, res) => {
    try {
      const code = str(req.body?.code);
      const password = str(req.body?.password);
      const fullName = str(req.body?.fullName);
      if (!code) {
        res.status(400).json({ ok: false, error: "Invite code is required." });
        return;
      }
      const passwordError = validateServerPassword(password);
      if (passwordError) {
        res.status(400).json({ ok: false, error: passwordError });
        return;
      }

      const result = await acceptCompanyInvite(
        { code, password, fullName: fullName || undefined },
        async (args: {
          email: string;
          password: string;
          fullName: string;
          companyName: string;
        }) => {
          const { email, password: pw, fullName: name, companyName } = args;
          const normalized = normalizeEmail(email);
          if (await findAccountByEmail(normalized)) {
            throw new Error("An account with this email already exists. Sign in instead.");
          }
          const now = new Date().toISOString();
          const account: AppAccountRecord = {
            userId: newUserId(),
            email: normalized,
            passwordHash: hashPassword(pw),
            fullName: name,
            companyName,
            companyId: null,
            roleId: null,
            selectedTrialPlan: null,
            subscriptionTier: "locked",
            trialStartDate: null,
            aiRequestsUsed: 0,
            storageUsed: 0,
            createdAt: now,
            updatedAt: now,
          };
          await saveAccount(account);
          return { userId: account.userId };
        },
      );

      const account = await findAccountByEmail(result.invite.email);
      if (account) {
        account.companyId = result.company.id;
        account.roleId = result.member.roleId;
        account.companyName = result.company.name;
        account.updatedAt = new Date().toISOString();
        await saveAccount(account);
      }

      res.json({
        ok: true,
        message: "Account created. Sign in with your email and password.",
        company: result.company,
        roleId: result.member.roleId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not accept invite.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.patch("/api/company/users/:userId/role", async (req, res) => {
    try {
      const ctx = await requireCompanyAuth(req.headers.authorization);
      if (!isBossRole(ctx.roleId)) {
        res.status(403).json({ ok: false, error: "Boss access required." });
        return;
      }
      const userId = str(req.params.userId);
      const roleId = str(req.body?.roleId);
      if (!isCompanyRoleId(roleId)) {
        res.status(400).json({ ok: false, error: "Invalid roleId." });
        return;
      }
      const member = await updateMemberRole(ctx, userId, roleId);
      res.json({ ok: true, member });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update role.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.patch("/api/company/users/:userId/status", async (req, res) => {
    try {
      const ctx = await requireCompanyAuth(req.headers.authorization);
      if (!isBossRole(ctx.roleId)) {
        res.status(403).json({ ok: false, error: "Boss access required." });
        return;
      }
      const userId = str(req.params.userId);
      const status = str(req.body?.status);
      if (status !== "active" && status !== "disabled" && status !== "invited") {
        res.status(400).json({ ok: false, error: "status must be active, disabled, or invited." });
        return;
      }
      const member = await setMemberStatus(ctx, userId, status);
      res.json({ ok: true, member });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update status.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  router.get("/api/company/audit", async (req, res) => {
    try {
      const ctx = await requireCompanyAuth(req.headers.authorization);
      if (!isBossRole(ctx.roleId)) {
        res.status(403).json({ ok: false, error: "Boss access required." });
        return;
      }
      const limit =
        typeof req.query.limit === "string" ? Math.min(Number(req.query.limit) || 100, 500) : 100;
      const events = await listAuditEvents(ctx.companyId, limit);
      res.json({ ok: true, events });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      res.status(401).json({ ok: false, error: msg });
    }
  });

  router.post("/api/company/audit", async (req, res) => {
    try {
      const ctx = await requireCompanyAuth(req.headers.authorization);
      const action = str(req.body?.action);
      if (!action) {
        res.status(400).json({ ok: false, error: "action is required." });
        return;
      }
      const event = await recordAuditEvent({
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: action as Parameters<typeof recordAuditEvent>[0]["action"],
        entityType: str(req.body?.entityType) || null,
        entityId: str(req.body?.entityId) || null,
        metadata:
          typeof req.body?.metadata === "object" && req.body.metadata
            ? (req.body.metadata as Record<string, unknown>)
            : {},
      });
      res.json({ ok: true, event });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not record audit event.";
      res.status(400).json({ ok: false, error: msg });
    }
  });

  return router;
}
