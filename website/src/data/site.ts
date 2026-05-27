export const BRAND_NAME = "Ideal Solutions Pro";
export const BRAND_TAGLINE = "Made for a contractor by a contractor";
export const BRAND_DESCRIPTION =
  "Your jobsite command center — AI, jobs, pay, and calendar in one app for electrical and construction contractors.";

export const SITE_DOMAIN = "www.idealsolutionspro.com";
export const SITE_ORIGIN = `https://${SITE_DOMAIN}`;

export const CONTACT_EMAIL = "hello@idealsolutionspro.com";
export const PRIVACY_EMAIL = "privacy@idealsolutionspro.com";
export const LEGAL_EMAIL = "legal@idealsolutionspro.com";

export const PLAN_PICKER_HEADLINE =
  "Pick the plan that fits how you run jobs. Start on Helper Mode free, then step up when the work gets bigger.";

export const PLAN_PICKER_FAIR_USE_NOTE =
  "AI is included with your subscription (daily limits on Helper and Side Job). No separate AI bill — upgrade the app when you need more.";

export function siteUrl(): string {
  return import.meta.env.PUBLIC_SITE_URL || SITE_ORIGIN;
}

export function waitlistFormAction(): string | undefined {
  const url = import.meta.env.PUBLIC_WAITLIST_FORM_ACTION;
  return url && url.length > 0 ? url : undefined;
}

export function contactFormAction(): string | undefined {
  const url = import.meta.env.PUBLIC_CONTACT_FORM_ACTION;
  if (url && url.length > 0) return url;
  return waitlistFormAction();
}

export function appStoreUrl(): string | undefined {
  const url = import.meta.env.PUBLIC_APP_STORE_URL;
  return url && url.length > 0 ? url : undefined;
}

export function playStoreUrl(): string | undefined {
  const url = import.meta.env.PUBLIC_PLAY_STORE_URL;
  return url && url.length > 0 ? url : undefined;
}

export type NavLink = {
  href: string;
  label: string;
  variant?: "legal";
};

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/legal", label: "Legal Stuff", variant: "legal" },
] as const;

/** Footer / secondary links (not in main header). */
export const FOOTER_LINKS: readonly NavLink[] = [
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
] as const;

/** Primary logo for header/footer (marketing asset). */
export const BRAND_LOGO_SRC = "/images/brand-logo.png";
