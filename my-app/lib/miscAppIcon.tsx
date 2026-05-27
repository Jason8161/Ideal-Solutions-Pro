import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";

import type { MiscAppDefinition } from "@/lib/miscAppsCatalog";
import type { ResolvedMiscShortcut } from "@/lib/miscShortcuts";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICON_MCI: Record<MiscAppDefinition["icon"], MciName> = {
  "chart-line": "chart-line",
  newspaper: "newspaper-variant-outline",
  "weather-partly-cloudy": "weather-partly-cloudy",
  map: "map-marker-radius",
  calculator: "calculator",
  gamepad: "gamepad-variant",
  casino: "cards-playing",
  social: "account-group",
  entertainment: "play-circle",
  finance: "cash",
};

export function miscAppIcon(app: MiscAppDefinition, color: string, size: number): ReactNode {
  const name = ICON_MCI[app.icon] ?? "application";
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function miscShortcutIcon(entry: ResolvedMiscShortcut, color: string, size: number): ReactNode {
  if (entry.kind === "catalog") {
    return miscAppIcon(entry.def, color, size);
  }
  return <MaterialCommunityIcons name="cellphone-link" size={size} color={color} />;
}
