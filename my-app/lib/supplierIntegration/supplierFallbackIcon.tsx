import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";

import { materialSupplierById } from "@/lib/materialSuppliers";
import type { MaterialSupplierDefinition } from "@/lib/materialSuppliers";
import type { QuickLaunchSupplier, SupplierIconKind } from "@/lib/supplierIntegration/types";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICON_MCI: Record<SupplierIconKind, MciName> = {
  store: "store",
  hammer: "hammer",
  warehouse: "warehouse",
  cart: "cart",
  bolt: "flash",
};

function materialSupplierVectorIcon(
  supplier: MaterialSupplierDefinition,
  color: string,
  size: number,
): ReactNode {
  if (supplier.id === "amazon") {
    return <Ionicons name="logo-amazon" size={size} color={color} />;
  }
  const name = ICON_MCI[supplier.icon] ?? "store";
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

/** Vector icon when no bundled supplier logo exists. */
export function supplierIntegrationFallbackIcon(
  supplier: Pick<QuickLaunchSupplier, "id" | "icon">,
  color: string,
  size: number,
): ReactNode {
  const catalog = materialSupplierById(supplier.id);
  if (catalog) {
    return materialSupplierVectorIcon(catalog, color, size);
  }
  if (supplier.id === "amazon") {
    return <Ionicons name="logo-amazon" size={size} color={color} />;
  }
  const name = ICON_MCI[supplier.icon] ?? "store";
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
