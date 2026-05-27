import type { ReactNode } from "react";

import { supplierLogo } from "@/lib/supplierLogo";
import type { QuickLaunchSupplier } from "@/lib/supplierIntegration/types";

export { supplierIntegrationFallbackIcon } from "@/lib/supplierIntegration/supplierFallbackIcon";

export function supplierIntegrationIcon(
  supplier: Pick<QuickLaunchSupplier, "id" | "icon">,
  color: string,
  size: number,
): ReactNode {
  return supplierLogo({ supplierId: supplier.id, icon: supplier.icon, color, size });
}
