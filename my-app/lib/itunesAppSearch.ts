/**
 * Bank / app discovery via Apple’s iTunes Search API (public JSON, no API key).
 * Works on iOS and Android in-app; results are primarily from the U.S. App Store catalog.
 */
const ITUNES_SEARCH = "https://itunes.apple.com/search";

export type ItunesAppSearchResult = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  trackViewUrl: string;
  sellerUrl?: string;
};

function isOpenableHttpsUrl(raw: string): boolean {
  const s = raw.trim();
  return /^https:\/\//i.test(s);
}

/**
 * Prefer the publisher site when it is a normal https URL; otherwise use the App Store page URL.
 */
export function bestOpenUrlForItunesApp(r: ItunesAppSearchResult): string {
  if (r.sellerUrl && isOpenableHttpsUrl(r.sellerUrl)) {
    return r.sellerUrl.trim();
  }
  return r.trackViewUrl.trim();
}

export async function searchItunesApps(query: string, limit = 20): Promise<ItunesAppSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${ITUNES_SEARCH}?term=${encodeURIComponent(q)}&entity=software&limit=${Math.min(limit, 50)}&country=us`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`App search failed (${res.status})`);
  }
  const json = (await res.json()) as { results?: unknown[] };
  const out: ItunesAppSearchResult[] = [];
  for (const raw of json.results ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (typeof o.trackId !== "number" || typeof o.trackName !== "string") continue;
    if (typeof o.trackViewUrl !== "string") continue;
    out.push({
      trackId: o.trackId,
      trackName: o.trackName.trim(),
      artistName: typeof o.artistName === "string" ? o.artistName.trim() : "",
      artworkUrl100: typeof o.artworkUrl100 === "string" ? o.artworkUrl100 : undefined,
      trackViewUrl: o.trackViewUrl.trim(),
      sellerUrl: typeof o.sellerUrl === "string" ? o.sellerUrl.trim() : undefined,
    });
  }
  return out;
}
