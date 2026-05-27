import { Alert, Linking } from "react-native";

import { getBankLoginLaunchUrl } from "@/lib/bankLoginLaunchUrl";

async function openFirstAvailable(urls: readonly string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      const ok = await Linking.canOpenURL(url).catch(() => false);
      if (ok) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

function stripLeadingWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function hostSuffixes(hostname: string): string[] {
  const h = stripLeadingWww(hostname);
  const parts = h.split(".").filter(Boolean);
  if (parts.length < 2) return [h];
  const out: string[] = [];
  for (let i = 0; i <= parts.length - 2; i++) {
    out.push(parts.slice(i).join("."));
  }
  return out;
}

/**
 * Base registrable host → custom URL schemes that usually open the bank’s native app
 * (when installed). Order is try-first preference; unknown banks rely on https / universal links.
 */
const NATIVE_SCHEMES_BY_BASE_HOST: Record<string, readonly string[]> = {
  "ally.com": ["allybank://", "ally://"],
  "bankofamerica.com": ["bofa://", "bankofamerica://"],
  "capitalone.com": ["capitalone://"],
  "chase.com": ["chase://"],
  "citi.com": ["citi://", "citimobile://"],
  "citizensbank.com": ["citizens://"],
  "discover.com": ["discover://"],
  "53.com": ["fifththird://"],
  "fifththird.com": ["fifththird://"],
  "huntington.com": ["huntington://"],
  "key.com": ["keybank://"],
  "navyfederal.org": ["nfcu://", "navyfederal://"],
  "pnc.com": ["pnc://"],
  "regions.com": ["regions://"],
  "schwab.com": ["schwab://"],
  "td.com": ["tdbank://", "td://"],
  "tdbank.com": ["tdbank://", "td://"],
  "truist.com": ["truist://", "suntrust://"],
  "usbank.com": ["usbank://"],
  "wellsfargo.com": ["wellsfargo://", "wf://"],
};

function schemesForHostname(hostname: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const suf of hostSuffixes(hostname)) {
    const list = NATIVE_SCHEMES_BY_BASE_HOST[suf];
    if (!list) continue;
    for (const s of list) {
      if (!seen.has(s)) {
        seen.add(s);
        ordered.push(s);
      }
    }
  }
  return ordered;
}

/**
 * Collect native-app URL candidates for a bank shortcut (custom schemes only).
 * If the saved URL is already a non-http(s) scheme, that single URL is used.
 */
function collectBankNativeLaunchCandidates(shortcut: { openUrl: string }): string[] {
  const raw = shortcut.openUrl.trim();
  if (!raw) return [];

  if (/^https?:\/\//i.test(raw) === false && /^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return [raw];
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (urls: readonly string[]) => {
    for (const u of urls) {
      if (!seen.has(u)) {
        seen.add(u);
        ordered.push(u);
      }
    }
  };

  try {
    if (/^https?:\/\//i.test(raw)) {
      push(schemesForHostname(new URL(raw).hostname));
    }
  } catch {
    /* ignore */
  }

  const web = getBankLoginLaunchUrl(shortcut);
  try {
    if (/^https?:\/\//i.test(web)) {
      push(schemesForHostname(new URL(web).hostname));
    }
  } catch {
    /* ignore */
  }

  return ordered;
}

/**
 * Opens the bank’s mobile app when a matching URL scheme is installed; otherwise opens
 * the resolved sign-in / web URL from {@link getBankLoginLaunchUrl}.
 */
export async function openBankShortcutFromHome(shortcut: { label: string; openUrl: string }): Promise<void> {
  const webUrl = getBankLoginLaunchUrl(shortcut);
  const natives = collectBankNativeLaunchCandidates(shortcut);
  if (natives.length > 0) {
    const opened = await openFirstAvailable(natives);
    if (opened) return;
  }
  try {
    await Linking.openURL(webUrl);
  } catch {
    Alert.alert("Could not open link", "Check the URL or try opening it from your browser.");
  }
}
