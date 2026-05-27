import { persistRoleAsBoss } from "@/lib/auth/sessionRole";
import { loadCompanyProfile } from "@/lib/profileStorage";

import { hasCloudApi, registerBossCompany } from "./client";
import { getOrCreateDeviceId } from "./deviceId";
import {
  loadBossCloudSession,
  saveBossCloudSession,
  type BossCloudSession,
} from "./bossSession";

/** Ensure boss company exists on cloud; no-op when API URL unset. */
export async function ensureBossCloudCompany(): Promise<BossCloudSession | null> {
  if (!hasCloudApi()) return null;
  const existing = await loadBossCloudSession();
  if (existing) return existing;

  const profile = await loadCompanyProfile();
  const name = (profile?.companyName ?? "My Company").trim() || "My Company";
  const bossDeviceId = await getOrCreateDeviceId();
  const { company, userId } = await registerBossCompany(bossDeviceId, name);
  await persistRoleAsBoss();
  return saveBossCloudSession(company, userId, bossDeviceId);
}
