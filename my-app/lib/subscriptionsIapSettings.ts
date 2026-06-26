import type { Href } from "expo-router";
import { Platform } from "react-native";

import type { SettingsRouteId } from "@/lib/settingsGroups";

export const SUBSCRIPTIONS_IAP_HUB_TITLE = "Subscriptions and IAP";
export const SUBSCRIPTIONS_IAP_HUB_SUBTITLE =
  Platform.OS === "ios"
    ? "Plan tiers, store add-ons, and monthly AI usage ΓÇö billed through Apple."
    : Platform.OS === "android"
      ? "Plan tiers, store add-ons, and monthly AI usage ΓÇö billed through Google Play."
      : "Plan tiers, store add-ons, and monthly AI usage ΓÇö billed through Apple or Google.";

/** Screens nested under Subscriptions and IAP (not listed on the billing group hub). */
export const SUBSCRIPTIONS_IAP_NESTED_ROUTES: readonly SettingsRouteId[] = [
  "subscribe",
  "in-app-purchases",
  "ai-usage",
] as const;

export type SubscriptionsIapNavItem = {
  route: SettingsRouteId;
  title: string;
  hint: string;
};

export const SUBSCRIPTIONS_IAP_NAV_ITEMS: readonly SubscriptionsIapNavItem[] = [
  {
    route: "subscribe",
    title: "Subscription",
    hint: "Side Hustle, Boss Man, and other plan tiers.",
  },
  {
    route: "in-app-purchases",
    title: "In-App Purchases",
    hint: "AI add-ons, misc apps, materials, and other one-time store items.",
  },
  {
    route: "ai-usage",
    title: "AI usage",
    hint: "Monthly AI quota, trial usage, and warnings.",
  },
] as const;

export function subscriptionsIapHubHref(): Href {
  return "/settings/subscriptions-iap" as Href;
}

export function isSubscriptionsIapNestedRoute(route: SettingsRouteId): boolean {
  return (SUBSCRIPTIONS_IAP_NESTED_ROUTES as readonly string[]).includes(route);
}
