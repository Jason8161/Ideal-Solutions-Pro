import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ideal_solutions_my_crew_v1";

export type CrewRoleKey = "lead-man" | "tech" | "journeyman" | "helper" | "default";

/** Which stored rate table to use for labor billing. */
export type LaborRateTable = "project" | "service_call" | "emergency";

export type MyCrewSettings = {
  /** Default sales tax percent for estimates (e.g. "8.25" = 8.25%). */
  defaultTaxPercent: string;
  /** Project / job labor — fallback when no crew role is chosen ($/hr). */
  defaultLaborRate: string;
  rateLeadMan: string;
  rateTech: string;
  rateJourneyman: string;
  rateHelper: string;
  /** Service call labor rates ($/hr). */
  serviceCallDefaultLaborRate: string;
  serviceCallRateLeadMan: string;
  serviceCallRateTech: string;
  serviceCallRateJourneyman: string;
  serviceCallRateHelper: string;
  /** Emergency call labor rates ($/hr). */
  emergencyDefaultLaborRate: string;
  emergencyRateLeadMan: string;
  emergencyRateTech: string;
  emergencyRateJourneyman: string;
  emergencyRateHelper: string;
};

export const defaultMyCrewSettings = (): MyCrewSettings => ({
  defaultTaxPercent: "",
  defaultLaborRate: "",
  rateLeadMan: "",
  rateTech: "",
  rateJourneyman: "",
  rateHelper: "",
  serviceCallDefaultLaborRate: "",
  serviceCallRateLeadMan: "",
  serviceCallRateTech: "",
  serviceCallRateJourneyman: "",
  serviceCallRateHelper: "",
  emergencyDefaultLaborRate: "",
  emergencyRateLeadMan: "",
  emergencyRateTech: "",
  emergencyRateJourneyman: "",
  emergencyRateHelper: "",
});

const PROJECT_ROLE_RATE_KEYS: Record<Exclude<CrewRoleKey, "default">, keyof MyCrewSettings> = {
  "lead-man": "rateLeadMan",
  tech: "rateTech",
  journeyman: "rateJourneyman",
  helper: "rateHelper",
};

const SERVICE_CALL_ROLE_RATE_KEYS: Record<Exclude<CrewRoleKey, "default">, keyof MyCrewSettings> = {
  "lead-man": "serviceCallRateLeadMan",
  tech: "serviceCallRateTech",
  journeyman: "serviceCallRateJourneyman",
  helper: "serviceCallRateHelper",
};

const EMERGENCY_ROLE_RATE_KEYS: Record<Exclude<CrewRoleKey, "default">, keyof MyCrewSettings> = {
  "lead-man": "emergencyRateLeadMan",
  tech: "emergencyRateTech",
  journeyman: "emergencyRateJourneyman",
  helper: "emergencyRateHelper",
};

const DEFAULT_RATE_KEY_BY_TABLE: Record<LaborRateTable, keyof MyCrewSettings> = {
  project: "defaultLaborRate",
  service_call: "serviceCallDefaultLaborRate",
  emergency: "emergencyDefaultLaborRate",
};

const ROLE_RATE_KEYS_BY_TABLE: Record<
  LaborRateTable,
  Record<Exclude<CrewRoleKey, "default">, keyof MyCrewSettings>
> = {
  project: PROJECT_ROLE_RATE_KEYS,
  service_call: SERVICE_CALL_ROLE_RATE_KEYS,
  emergency: EMERGENCY_ROLE_RATE_KEYS,
};

export const CREW_ROLE_LABELS: Record<CrewRoleKey, string> = {
  "lead-man": "Lead man",
  tech: "Tech",
  journeyman: "Journeyman",
  helper: "Helper",
  default: "Default rate",
};

export const LABOR_RATE_TABLE_LABELS: Record<LaborRateTable, string> = {
  project: "Project labor",
  service_call: "Service call labor",
  emergency: "Emergency call labor",
};

/** @deprecated Use rateForCrewRoleInTable(settings, role, "project") */
export function rateForCrewRole(settings: MyCrewSettings, role: CrewRoleKey): string {
  return rateForCrewRoleInTable(settings, role, "project");
}

export function rateForCrewRoleInTable(
  settings: MyCrewSettings,
  role: CrewRoleKey,
  table: LaborRateTable,
): string {
  if (role === "default") return settings[DEFAULT_RATE_KEY_BY_TABLE[table]] ?? "";
  const key = ROLE_RATE_KEYS_BY_TABLE[table][role];
  return settings[key] ?? "";
}

const STRING_KEYS: (keyof MyCrewSettings)[] = [
  "defaultTaxPercent",
  "defaultLaborRate",
  "rateLeadMan",
  "rateTech",
  "rateJourneyman",
  "rateHelper",
  "serviceCallDefaultLaborRate",
  "serviceCallRateLeadMan",
  "serviceCallRateTech",
  "serviceCallRateJourneyman",
  "serviceCallRateHelper",
  "emergencyDefaultLaborRate",
  "emergencyRateLeadMan",
  "emergencyRateTech",
  "emergencyRateJourneyman",
  "emergencyRateHelper",
];

export async function loadMyCrewSettings(): Promise<MyCrewSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultMyCrewSettings();
    const parsed = JSON.parse(raw) as Partial<MyCrewSettings>;
    const base = defaultMyCrewSettings();
    const next = { ...base };
    for (const key of STRING_KEYS) {
      const v = parsed[key];
      if (typeof v === "string") next[key] = v;
    }
    return next;
  } catch {
    return defaultMyCrewSettings();
  }
}

export async function saveMyCrewSettings(settings: MyCrewSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

/** Parse a money or percent string; returns 0 if invalid. */
export function parseNumericInput(s: string): number {
  const t = s.trim().replace(/,/g, "");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}
