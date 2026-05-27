import type { ReactNode } from "react";

import type { MaterialSupplierDefinition } from "@/lib/materialSuppliers";
import { supplierLogo } from "@/lib/supplierLogo";

export function materialSupplierIcon(
  supplier: MaterialSupplierDefinition,
  color: string,
  size: number,
): ReactNode {
  return supplierLogo({ supplierId: supplier.id, icon: supplier.icon, color, size });
}
