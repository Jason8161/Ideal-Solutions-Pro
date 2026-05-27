import type { AccountingAppId, AccountingAppSelection } from "@/lib/accountingAppStorage";

/** Web entry points that usually hand off to the vendor app when installed. */
const PRESET_LOGIN_URL: Partial<Record<Exclude<AccountingAppId, "other" | "none">, string>> = {
  "quickbooks-online": "https://app.qbo.intuit.com/app/homepage",
  "quickbooks-desktop": "https://quickbooks.intuit.com/desktop/",
  xero: "https://login.xero.com/",
  freshbooks: "https://my.freshbooks.com/",
  "zoho-books": "https://books.zoho.com/",
  sage: "https://www.sage.com/en-us/",
  wave: "https://www.waveapps.com/",
  netsuite: "https://system.netsuite.com/pages/customerlogin.jsp",
  myob: "https://secure.myob.com/",
  bench: "https://bench.co/",
  zipbooks: "https://app.zipbooks.com/",
  patriot: "https://www.patriotsoftware.com/",
  odoo: "https://www.odoo.com/web/login",
  freeagent: "https://login.freeagent.com/",
};

/**
 * Returns a URL to open for the user&apos;s saved accounting app, or null if none / not applicable.
 */
export function getAccountingAppLaunchUrl(selection: AccountingAppSelection | null): string | null {
  if (!selection || selection.selectedAccountingAppId === "none") {
    return null;
  }
  if (selection.selectedAccountingAppId === "other") {
    const name = (selection.customAppName ?? selection.selectedAccountingAppName).trim() || "accounting software";
    return `https://www.google.com/search?q=${encodeURIComponent(`${name} login`)}`;
  }
  const id = selection.selectedAccountingAppId;
  const presetUrl = PRESET_LOGIN_URL[id];
  if (presetUrl) return presetUrl;
  const name = selection.selectedAccountingAppName.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} login`)}`;
}
