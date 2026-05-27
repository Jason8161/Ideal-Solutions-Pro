import { Platform } from "react-native";

/** Lowe's US mobile app — region-agnostic App Store path (resolves to local storefront when available). */
export const LOWES_IOS_APP_STORE_URL =
  "https://apps.apple.com/app/lowes-home-improvement/id457954781";

/** Lowe's on Google Play (US listing; same package id worldwide). */
export const LOWES_ANDROID_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.lowes.android";

export const LOWES_WEBSITE_URL = "https://www.lowes.com/";

export function lowesStoreUrlForPlatform(): string {
  return Platform.OS === "ios" ? LOWES_IOS_APP_STORE_URL : LOWES_ANDROID_PLAY_STORE_URL;
}

/** Official retailer search URLs — opening these shows live site pricing at view time. */
export function homeDepotSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.homedepot.com/s/${q}`;
}

export function lowesSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.lowes.com/search?searchTerm=${q}`;
}

/** Google web search aimed at supply houses / distributors (live third-party results, not in-app pricing). */
export function supplierSearchUrl(query: string): string {
  const raw = query.trim() || "construction supplies";
  const composed = `${raw} construction supplier distributor`;
  return `https://www.google.com/search?q=${encodeURIComponent(composed)}`;
}

export function graingerSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.grainger.com/search?searchBar=true&searchQuery=${q}`;
}

/** Graybar global search (site layout may change; opens live Graybar results). */
export function graybarSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.graybar.com/global/search?search=${q}`;
}

export function rexelSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.rexelusa.com/catalogsearch/result/?q=${q}`;
}

export function johnstoneSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://products.johnstonesupply.com/search?k=${q}`;
}

export function plattSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.platt.com/search?text=${q}`;
}

export function wescoSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://buy.wesco.com/search?q=${q}`;
}

/** City Electric Supply (US) — public catalog search pattern. */
export function cityElectricSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.cityelectricsupply.com/search?q=${q}`;
}

export function fergusonSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.ferguson.com/search?searchTerm=${q}`;
}

export function hajocaSearchUrl(query: string): string {
  return supplierSearchUrl(query.trim() || "Hajoca");
}

export function abcSupplySearchUrl(query: string): string {
  return supplierSearchUrl(query.trim() || "ABC Supply");
}

export function beaconSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.becn.com/search?q=${q}`;
}

export function cedSearchUrl(query: string): string {
  return supplierSearchUrl(query.trim() || "Consolidated Electrical Distributors");
}

export function gexproSearchUrl(query: string): string {
  return supplierSearchUrl(query.trim() || "Gexpro");
}

export function winsupplySearchUrl(query: string): string {
  return supplierSearchUrl(query.trim() || "WinSupply");
}

export function bakerSearchUrl(query: string): string {
  return supplierSearchUrl(query.trim() || "Baker Distributing HVAC");
}

export function standardElectricSearchUrl(query: string): string {
  return supplierSearchUrl(query.trim() || "Standard Electric Supply");
}

export function fastenalSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.fastenal.com/product?query=${q}`;
}

export function elliottElectricSearchUrl(query: string): string {
  return supplierSearchUrl(query.trim() || "Elliott Electric Supply");
}

export function borderStatesSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim() || " ");
  return `https://www.borderstates.com/Search?q=${q}`;
}
