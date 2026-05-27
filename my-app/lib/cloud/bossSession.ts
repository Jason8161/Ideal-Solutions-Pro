import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CloudCompany } from "@/lib/cloud/types";

const BOSS_CLOUD_KEY = "ideal_boss_cloud_session_v1";

export type BossCloudSession = {
  companyId: string;
  companyName: string;
  bossToken: string;
  bossUserId: string;
  bossDeviceId: string;
  linkedAt: string;
};

export async function loadBossCloudSession(): Promise<BossCloudSession | null> {
  try {
    const raw = await AsyncStorage.getItem(BOSS_CLOUD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BossCloudSession>;
    if (!parsed.bossToken?.trim() || !parsed.companyId?.trim()) return null;
    return {
      companyId: parsed.companyId.trim(),
      companyName: (parsed.companyName ?? "").trim(),
      bossToken: parsed.bossToken.trim(),
      bossUserId: (parsed.bossUserId ?? "").trim(),
      bossDeviceId: (parsed.bossDeviceId ?? "").trim(),
      linkedAt: parsed.linkedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveBossCloudSession(
  company: CloudCompany,
  bossUserId: string,
  bossDeviceId: string,
): Promise<BossCloudSession> {
  const session: BossCloudSession = {
    companyId: company.id,
    companyName: company.name,
    bossToken: company.bossToken,
    bossUserId,
    bossDeviceId,
    linkedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(BOSS_CLOUD_KEY, JSON.stringify(session));
  return session;
}

export async function clearBossCloudSession(): Promise<void> {
  await AsyncStorage.removeItem(BOSS_CLOUD_KEY);
}
