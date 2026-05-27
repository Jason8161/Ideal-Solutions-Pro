import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ideal_solutions_crew_invite_codes_v1";

export type CrewInviteRecord = {
  employeeId: string;
  code: string;
  createdAt: string;
};

function randomCode(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CREW-${part}`;
}

async function loadAll(): Promise<CrewInviteRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CrewInviteRecord[]) : [];
  } catch {
    return [];
  }
}

async function saveAll(rows: CrewInviteRecord[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(rows));
}

export async function getOrCreateInviteCode(employeeId: string): Promise<string> {
  const rows = await loadAll();
  const hit = rows.find((r) => r.employeeId === employeeId);
  if (hit) return hit.code;
  const code = randomCode();
  rows.push({ employeeId, code, createdAt: new Date().toISOString() });
  await saveAll(rows);
  return code;
}

export function buildEmployeeInviteDeepLink(code: string): string {
  const base = (process.env.EXPO_PUBLIC_EMPLOYEE_INVITE_BASE_URL ?? "idealsolutions://employee-invite").trim();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}code=${encodeURIComponent(code)}`;
}
