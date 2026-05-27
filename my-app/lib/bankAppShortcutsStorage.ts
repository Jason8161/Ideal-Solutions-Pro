import AsyncStorage from "@react-native-async-storage/async-storage";

const BANK_APP_SHORTCUTS_KEY = "ideal_solutions_bank_app_shortcuts_v1";
const PREFERRED_BANK_ID_KEY = "ideal_solutions_preferred_bank_id_v1";

export type BankAppShortcut = {
  id: string;
  /** Display name, e.g. "Chase", "Wells Fargo". */
  label: string;
  /** URL or custom scheme the bank app handles, e.g. https://… or chase://… */
  openUrl: string;
};

function generateId(): string {
  return `bank_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isValidShortcut(x: unknown): x is BankAppShortcut {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.label === "string" &&
    o.label.trim().length > 0 &&
    typeof o.openUrl === "string" &&
    o.openUrl.trim().length > 0
  );
}

export function looksLikeOpenableUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  return /^[a-z][a-z0-9+.-]*:/i.test(s);
}

export async function loadBankAppShortcuts(): Promise<BankAppShortcut[]> {
  try {
    const raw = await AsyncStorage.getItem(BANK_APP_SHORTCUTS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isValidShortcut);
  } catch {
    return [];
  }
}

export async function saveBankAppShortcuts(list: readonly BankAppShortcut[]): Promise<void> {
  await AsyncStorage.setItem(BANK_APP_SHORTCUTS_KEY, JSON.stringify([...list]));
}

export async function addBankAppShortcut(label: string, openUrl: string): Promise<BankAppShortcut> {
  const list = await loadBankAppShortcuts();
  const shortcut: BankAppShortcut = {
    id: generateId(),
    label: label.trim(),
    openUrl: openUrl.trim(),
  };
  await saveBankAppShortcuts([...list, shortcut]);
  return shortcut;
}

export async function loadPreferredBankId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFERRED_BANK_ID_KEY);
    if (!raw || !raw.trim()) return null;
    return raw.trim();
  } catch {
    return null;
  }
}

export async function savePreferredBankId(id: string | null): Promise<void> {
  if (id == null || id === "") {
    await AsyncStorage.removeItem(PREFERRED_BANK_ID_KEY);
    return;
  }
  await AsyncStorage.setItem(PREFERRED_BANK_ID_KEY, id);
}

export async function removeBankAppShortcut(id: string): Promise<void> {
  const preferred = await loadPreferredBankId();
  if (preferred === id) {
    await savePreferredBankId(null);
  }
  const list = (await loadBankAppShortcuts()).filter((b) => b.id !== id);
  await saveBankAppShortcuts(list);
}
