/**
 * Resolves a saved bank shortcut URL into something that usually lands on sign-in
 * (mobile banking / secure session) instead of a marketing homepage or App Store page.
 */

/** Base registrable-style host (lowercase, no leading www.) → sign-in entry URL. */
const KNOWN_BANK_LOGIN_BY_BASE_HOST: Record<string, string> = {
  "ally.com": "https://secure.ally.com/",
  "bankofamerica.com": "https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go",
  "capitalone.com": "https://verified.capitalone.com/auth/signin",
  "chase.com": "https://secure.chase.com/web/auth/",
  "citi.com": "https://online.citi.com/US/ag/citibankAg",
  "citizensbank.com": "https://www.citizensbankonline.com/",
  "discover.com": "https://portal.discover.com/",
  "53.com": "https://www.53.com/content/fifth-third/en/login.html",
  "fifththird.com": "https://www.53.com/content/fifth-third/en/login.html",
  "huntington.com": "https://onlinebanking.huntington.com/Auth/Login",
  "key.com": "https://ibx.key.com/ibxolb/login/index.html",
  "navyfederal.org": "https://digital.navyfederal.org/signin",
  "pnc.com": "https://www.onlinebanking.pnc.com/",
  "regions.com": "https://www.regions.com/banking/online_banking",
  "schwab.com": "https://client.schwab.com/Login/SignOn/Customer",
  "td.com": "https://onlinebanking.tdbank.com/",
  "tdbank.com": "https://onlinebanking.tdbank.com/",
  "truist.com": "https://www.truist.com/digital/login",
  "usbank.com": "https://onlinebanking.usbank.com/",
  "wellsfargo.com": "https://connect.wellsfargo.com/auth/login/present",
};

function looksLikeLikelyBankLoginUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    /\b(login|signin|sign-on|auth|session|olb|onlinebanking|digitalbanking|secure\.|verified\.)\b/.test(lower) ||
    /\/(login|signin|sign-in|auth|session|logon|signon)\b/i.test(lower)
  );
}

function isAppStoreOrItunesWebUrl(url: string): boolean {
  return /apps\.apple\.com|itunes\.apple\.com/i.test(url);
}

function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** e.g. www.chase.com → chase.com; onlinebanking.usbank.com → onlinebanking.usbank.com */
function stripLeadingWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** Yield host and parent suffixes: secure.chase.com → secure.chase.com, chase.com */
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

function isGenericHomePath(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/g, "") || "/";
    return path === "/" || path === "";
  } catch {
    return false;
  }
}

/**
 * URL to open when the user chooses “Open bank” from the home Accountant/Billing tile.
 */
export function getBankLoginLaunchUrl(shortcut: { label: string; openUrl: string }): string {
  const raw = shortcut.openUrl.trim();
  if (!raw) return raw;

  if (isAppStoreOrItunesWebUrl(raw)) {
    const q = `${shortcut.label.trim()} online banking sign in`;
    return googleSearchUrl(q);
  }

  if (!/^https:\/\//i.test(raw)) {
    return raw;
  }

  if (looksLikeLikelyBankLoginUrl(raw)) {
    return raw;
  }

  if (!isGenericHomePath(raw)) {
    return raw;
  }

  try {
    const hostname = new URL(raw).hostname;
    for (const suffix of hostSuffixes(hostname)) {
      const hit = KNOWN_BANK_LOGIN_BY_BASE_HOST[suffix];
      if (hit) return hit;
    }
  } catch {
    return raw;
  }

  const q = `${shortcut.label.trim()} online banking sign in`;
  return googleSearchUrl(q);
}
