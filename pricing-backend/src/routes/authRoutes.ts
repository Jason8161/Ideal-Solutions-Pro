import { Router } from "express";

import { hashPassword, validateServerPassword, verifyPassword } from "../auth/password";
import {
  createSession,
  defaultProfileFromAccount,
  findAccountByEmail,
  newUserId,
  normalizeEmail,
  recordResetRequest,
  saveAccount,
} from "../auth/store";
import type { AppAccountRecord } from "../auth/types";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function bool(v: unknown): boolean {
  return v === true;
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/api/auth/register", async (req, res) => {
    try {
      const email = normalizeEmail(str(req.body?.email));
      const password = str(req.body?.password);
      const fullName = str(req.body?.fullName);
      const companyName = str(req.body?.companyName);
      const persistSession = bool(req.body?.persistSession);

      if (!email || !email.includes("@")) {
        res.status(400).json({ ok: false, error: "Enter a valid email address." });
        return;
      }
      if (!fullName) {
        res.status(400).json({ ok: false, error: "Full name is required." });
        return;
      }
      const passwordError = validateServerPassword(password);
      if (passwordError) {
        res.status(400).json({ ok: false, error: passwordError });
        return;
      }
      if (await findAccountByEmail(email)) {
        res.status(409).json({ ok: false, error: "An account with this email already exists." });
        return;
      }

      const now = new Date().toISOString();
      const account: AppAccountRecord = {
        userId: newUserId(),
        email,
        passwordHash: hashPassword(password),
        fullName,
        companyName,
        selectedTrialPlan: "helper",
        subscriptionTier: "helper",
        trialStartDate: now,
        aiRequestsUsed: 0,
        storageUsed: 0,
        createdAt: now,
        updatedAt: now,
      };
      await saveAccount(account);
      const session = await createSession(account.userId, persistSession);

      res.json({
        ok: true,
        token: session.token,
        userId: account.userId,
        expiresAt: session.expiresAt,
        profile: defaultProfileFromAccount(account),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Registration failed.";
      res.status(500).json({ ok: false, error: msg });
    }
  });

  router.post("/api/auth/login", async (req, res) => {
    try {
      const email = normalizeEmail(str(req.body?.email));
      const password = str(req.body?.password);
      const persistSession = bool(req.body?.persistSession);

      if (!email || !password) {
        res.status(400).json({ ok: false, error: "Email and password are required." });
        return;
      }

      const account = await findAccountByEmail(email);
      if (!account || !verifyPassword(password, account.passwordHash)) {
        res.status(401).json({ ok: false, error: "Incorrect email or password." });
        return;
      }

      const session = await createSession(account.userId, persistSession);
      res.json({
        ok: true,
        token: session.token,
        userId: account.userId,
        expiresAt: session.expiresAt,
        profile: defaultProfileFromAccount(account),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed.";
      res.status(500).json({ ok: false, error: msg });
    }
  });

  router.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const email = normalizeEmail(str(req.body?.email));
      if (!email || !email.includes("@")) {
        res.status(400).json({ ok: false, error: "Enter a valid email address." });
        return;
      }

      await recordResetRequest(email);
      const account = await findAccountByEmail(email);
      res.json({
        ok: true,
        message: account
          ? "If an account exists for that email, reset instructions will be sent when email delivery is enabled."
          : "If an account exists for that email, reset instructions will be sent when email delivery is enabled.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not process reset request.";
      res.status(500).json({ ok: false, error: msg });
    }
  });

  return router;
}
