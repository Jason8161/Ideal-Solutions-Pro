import type { Href } from "expo-router";

import { Alert } from "react-native";



import { HOME_MENU_ITEMS, HOME_SOCIAL_MEDIA_TILE, type HomeMenuItem } from "@/lib/homeMenuItems";
import { reorderHomeGridKeysForBusiness } from "@/lib/tradeAiSuggestions";



/** Home / hub tile key for saved material lists. */

export const MATERIAL_LIST_MENU_KEY = "material-list";



/** Job Folder / Boss Man tile key for supplier catalog search (disabled until launch). */

export const MATERIAL_SEARCH_MENU_KEY = "materials";



export function isMaterialListMenuKey(key: string): boolean {

  return key === MATERIAL_LIST_MENU_KEY;

}



export function isMaterialSearchMenuKey(key: string): boolean {

  return key === MATERIAL_SEARCH_MENU_KEY;

}



export function isMaterialListHref(href: string): boolean {

  return href.split("?")[0] === "/material-list";

}



export function isMaterialSearchHref(href: string): boolean {

  return href.split("?")[0] === "/materials-search";

}



export function alertComingSoon(): void {

  Alert.alert("Coming Soon", "Coming Soon!");

}



/** @deprecated Use {@link alertComingSoon} — kept for call sites that gate material search. */

export const alertMaterialSearchComingSoon = alertComingSoon;



/** When true, `/material-list` redirects after the coming-soon alert. */

export const MATERIAL_LIST_SCREEN_DISABLED = false;



/** @deprecated Materials search is enabled; kept for any stale imports. */

export const MATERIAL_SEARCH_DISABLED = false;



/** Display order for the completed-profile home scroll list (7 tiles). */

export const HOME_GRID_TILE_KEYS = [

  "ai-assistance",

  "job-folder",

  "todo",

  "getting-paid",

  "calendar",

  "social-media",

  "misc-apps",

] as const;



/** All home menu tiles in scroll order — AI, Job Folder, Accounting, Getting Paid, Calendar, Social, Misc Apps. */

export function buildHomeGridRows(businessType = ""): HomeMenuItem[] {

  const byKey = new Map<string, HomeMenuItem>();

  for (const item of HOME_MENU_ITEMS) {

    byKey.set(item.key, item);

  }

  byKey.set(HOME_SOCIAL_MEDIA_TILE.key, HOME_SOCIAL_MEDIA_TILE);

  const keys = reorderHomeGridKeysForBusiness(businessType, HOME_GRID_TILE_KEYS);

  return keys.map((key) => {

    const item = byKey.get(key);

    if (!item) {

      throw new Error(`Missing home grid tile: ${key}`);

    }

    return item;

  });

}



/** Routes opened from home tiles — never subscription / paywall screens. */

export const HOME_TILE_ROUTES: Record<string, Href> = {

  "ai-assistance": "/ai-assistance",

  calendar: "/calendar",

  "getting-paid": "/getting-paid",

  "job-folder": "/job-folder/boss-man",

  "misc-apps": "/misc-apps",

};



export function isSubscriptionRoute(href: string): boolean {

  return href === "/subscribe" || href === "/settings/subscribe" || href.startsWith("/settings/subscribe");

}



export function homeMenuItemRoute(item: HomeMenuItem): Href | null {

  if (isMaterialSearchMenuKey(item.key)) {

    return "/materials-search";

  }

  if (item.href != null && isMaterialSearchHref(item.href)) {

    return "/materials-search";

  }

  const mapped = HOME_TILE_ROUTES[item.key];

  if (mapped) return mapped;

  if (!item.href || isSubscriptionRoute(item.href)) return null;

  return item.href as Href;

}

