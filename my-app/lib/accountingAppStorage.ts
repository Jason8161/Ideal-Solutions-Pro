import AsyncStorage from "@react-native-async-storage/async-storage";

export const ACCOUNTING_APP_STORAGE_KEY = "ideal_solutions_accounting_app_v1";

export type AccountingAppId =
  | "quickbooks-online"
  | "quickbooks-desktop"
  | "xero"
  | "freshbooks"
  | "zoho-books"
  | "sage"
  | "wave"
  | "netsuite"
  | "myob"
  | "bench"
  | "zipbooks"
  | "patriot"
  | "odoo"
  | "freeagent"
  | "other"
  | "none";

export type AccountingAppPreset = {
  id: AccountingAppId;
  name: string;
  /** Matched by the in-app search (lowercased), e.g. "qb" → QuickBooks. */
  keywords?: readonly string[];
};

export const ACCOUNTING_APP_PRESETS: AccountingAppPreset[] = [
  {
    id: "quickbooks-online",
    name: "QuickBooks Online",
    keywords: ["qb", "qbo", "intuit", "online"],
  },
  {
    id: "quickbooks-desktop",
    name: "QuickBooks Desktop",
    keywords: ["qb", "intuit", "desktop"],
  },
  { id: "xero", name: "Xero" },
  { id: "freshbooks", name: "FreshBooks" },
  { id: "zoho-books", name: "Zoho Books", keywords: ["zoho"] },
  { id: "sage", name: "Sage", keywords: ["sage50", "intacct"] },
  { id: "wave", name: "Wave" },
  { id: "netsuite", name: "NetSuite", keywords: ["oracle", "erp"] },
  { id: "myob", name: "MYOB" },
  { id: "bench", name: "Bench", keywords: ["bookkeeping"] },
  { id: "zipbooks", name: "ZipBooks" },
  { id: "patriot", name: "Patriot Accounting", keywords: ["patriot software"] },
  { id: "odoo", name: "Odoo" },
  { id: "freeagent", name: "FreeAgent" },
  { id: "other", name: "Other" },
  { id: "none", name: "None" },
];

export type AccountingAppSelection = {
  selectedAccountingAppId: AccountingAppId;
  selectedAccountingAppName: string;
  customAppName?: string;
};

const VALID_IDS = new Set<AccountingAppId>(ACCOUNTING_APP_PRESETS.map((p) => p.id));

export function isAccountingAppId(raw: string): raw is AccountingAppId {
  return VALID_IDS.has(raw as AccountingAppId);
}

export function labelForAccountingAppId(id: AccountingAppId): string {
  return ACCOUNTING_APP_PRESETS.find((p) => p.id === id)?.name ?? id;
}

export function displayAccountingAppSelection(selection: AccountingAppSelection | null): string {
  if (!selection || selection.selectedAccountingAppId === "none") {
    return "Not selected";
  }
  if (selection.selectedAccountingAppId === "other") {
    const custom = selection.customAppName?.trim();
    if (custom) return custom;
    return selection.selectedAccountingAppName;
  }
  return selection.selectedAccountingAppName;
}

function selectionFromPreset(id: AccountingAppId, customAppName?: string): AccountingAppSelection {
  const name = labelForAccountingAppId(id);
  return {
    selectedAccountingAppId: id,
    selectedAccountingAppName: name,
    ...(id === "other" && customAppName !== undefined ? { customAppName } : {}),
  };
}

function parseStored(raw: string | null): AccountingAppSelection | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const id = (data as { selectedAccountingAppId?: unknown }).selectedAccountingAppId;
    if (typeof id !== "string" || !isAccountingAppId(id)) return null;
    const custom = (data as { customAppName?: unknown }).customAppName;
    const customAppName = typeof custom === "string" ? custom : undefined;
    const storedName = (data as { selectedAccountingAppName?: unknown }).selectedAccountingAppName;
    const selectedAccountingAppName =
      typeof storedName === "string" && storedName.trim()
        ? storedName.trim()
        : labelForAccountingAppId(id);
    return {
      selectedAccountingAppId: id,
      selectedAccountingAppName,
      ...(customAppName !== undefined ? { customAppName } : {}),
    };
  } catch {
    return null;
  }
}

export async function loadAccountingAppSelection(): Promise<AccountingAppSelection | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTING_APP_STORAGE_KEY);
    return parseStored(raw);
  } catch {
    return null;
  }
}

export async function saveAccountingAppSelection(selection: AccountingAppSelection): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTING_APP_STORAGE_KEY, JSON.stringify(selection));
}

export async function saveAccountingAppById(id: AccountingAppId, customAppName?: string): Promise<AccountingAppSelection> {
  const existing = await loadAccountingAppSelection();
  const custom =
    id === "other"
      ? (customAppName ?? existing?.customAppName ?? "")
      : undefined;
  const selection = selectionFromPreset(id, custom);
  if (id === "other" && custom !== undefined) {
    selection.customAppName = custom;
  }
  await saveAccountingAppSelection(selection);
  return selection;
}
