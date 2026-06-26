import type { Href } from "expo-router";
import { Platform } from "react-native";

/** Route segment under `/settings/in-app-purchases/`. */
export type IapCategorySlug = "ai-addons" | "misc-apps" | "materials" | "crew-ai";

export type IapCategory = {
  slug: IapCategorySlug;
  title: string;
  hint: string;
  /** wired = purchase UI exists; coming-soon = placeholder screen */
  status: "wired" | "coming-soon";
};

export const IAP_HUB_TITLE = "In-App Purchases";
export const IAP_HUB_SUBTITLE =
  Platform.OS === "ios"
    ? "One-time packs and add-ons billed through Apple ΓÇö separate from your subscription tier."
    : Platform.OS === "android"
      ? "One-time packs and add-ons billed through Google Play ΓÇö separate from your subscription tier."
      : "One-time packs and add-ons billed through Apple or Google ΓÇö separate from your subscription tier.";

export const IAP_CATEGORIES: readonly IapCategory[] = [
  {
    slug: "ai-addons",
    title: "AI add-ons",
    hint: "Extra AI question packs when you need more than your plan includes.",
    status: "wired",
  },
  {
    slug: "misc-apps",
    title: "Misc apps",
    hint: "Premium shortcut packs and curated third-party app bundles for your home screen.",
    status: "coming-soon",
  },
  {
    slug: "materials",
    title: "Materials & ordering",
    hint: "In-app supplier ordering and material lookup add-ons for supply houses.",
    status: "coming-soon",
  },
  {
    slug: "crew-ai",
    title: "Crew AI (legacy)",
    hint: "Grandfathered employee AI store entitlements ΓÇö new crew AI is included with Pro+.",
    status: "coming-soon",
  },
] as const;

export function isIapCategorySlug(value: string): value is IapCategorySlug {
  return IAP_CATEGORIES.some((c) => c.slug === value);
}

export function getIapCategory(slug: IapCategorySlug): IapCategory | undefined {
  return IAP_CATEGORIES.find((c) => c.slug === slug);
}

/** Categories shown in settings navigation ΓÇö excludes placeholders until store products exist. */
export function getIapNavCategories(): readonly IapCategory[] {
  return IAP_CATEGORIES.filter((c) => c.status === "wired");
}

export function iapHubHref(): Href {
  return "/settings/in-app-purchases" as Href;
}

export function iapCategoryHref(slug: IapCategorySlug): Href {
  return `/settings/in-app-purchases/${slug}` as Href;
}

export function iapCategoryBackHref(): Href {
  return iapHubHref();
}

export function iapCategoryBackLabel(): string {
  return `ΓåÉ ${IAP_HUB_TITLE}`;
}
