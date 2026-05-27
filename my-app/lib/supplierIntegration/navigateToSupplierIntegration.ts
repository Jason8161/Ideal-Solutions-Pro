import type { Router } from "expo-router";
import type { Href } from "expo-router";

import { deferRouterPush } from "@/lib/deferNavigation";

/** Canonical settings route for supplier catalog, favorites, and launch options. */
export const SUPPLIER_INTEGRATION_SETTINGS_HREF = "/settings/integrations" as Href;

/**
 * Open Supplier Integrations from Materials search or other non-settings screens.
 * Navigation is deferred to avoid iOS Fabric unmount races with in-flight Linking probes.
 */
export function navigateToSupplierIntegrationSettings(router: Router): void {
  deferRouterPush(router, SUPPLIER_INTEGRATION_SETTINGS_HREF);
}
