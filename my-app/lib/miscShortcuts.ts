import {
  CUSTOM_MISC_APP_PREFIX,
  customMiscShortcutId,
  loadCustomMiscApps,
  parseCustomMiscShortcutId,
  type CustomMiscApp,
} from "@/lib/miscCustomApps";
import {
  miscAppById,
  labelForMiscApp,
  type MiscAppDefinition,
  type MiscAppId,
} from "@/lib/miscAppsCatalog";

export type MiscShortcutId = MiscAppId | `${typeof CUSTOM_MISC_APP_PREFIX}${string}`;

export type ResolvedMiscShortcut =
  | { kind: "catalog"; id: MiscAppId; def: MiscAppDefinition }
  | { kind: "custom"; id: string; shortcutId: string; custom: CustomMiscApp };

export function isCatalogMiscShortcutId(id: string): id is MiscAppId {
  return miscAppById(id) != null;
}

export function isCustomMiscShortcutId(id: string): boolean {
  return id.startsWith(CUSTOM_MISC_APP_PREFIX);
}

export async function labelForMiscShortcut(id: string): Promise<string> {
  if (isCatalogMiscShortcutId(id)) return labelForMiscApp(id);
  const customId = parseCustomMiscShortcutId(id);
  if (!customId) return id;
  const customs = await loadCustomMiscApps();
  return customs.find((c) => c.id === customId)?.name ?? id;
}

export async function resolveMiscShortcuts(ids: string[]): Promise<ResolvedMiscShortcut[]> {
  const customs = await loadCustomMiscApps();
  const customById = new Map(customs.map((c) => [c.id, c]));
  const out: ResolvedMiscShortcut[] = [];

  for (const id of ids) {
    const catalog = miscAppById(id);
    if (catalog) {
      out.push({ kind: "catalog", id: catalog.id, def: catalog });
      continue;
    }
    const customId = parseCustomMiscShortcutId(id);
    if (customId) {
      const custom = customById.get(customId);
      if (custom) {
        out.push({ kind: "custom", id: customId, shortcutId: id, custom });
      }
    }
  }

  return out;
}

export function resolveCustomMiscShortcut(
  custom: CustomMiscApp,
): ResolvedMiscShortcut {
  return {
    kind: "custom",
    id: custom.id,
    shortcutId: customMiscShortcutId(custom.id),
    custom,
  };
}
