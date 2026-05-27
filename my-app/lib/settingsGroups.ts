import type { Href } from "expo-router";

/** Route segment under `/settings/` (filename without extension). */
export type SettingsRouteId =
  | "user-info"
  | "business-card-qr"
  | "business-card-display"
  | "virtual-business-card"
  | "logos"
  | "social-media"
  | "display"
  | "suppliers"
  | "material-suppliers"
  | "supplier-integration"
  | "misc-apps"
  | "integrations"
  | "maps-addresses"
  | "payment-apps"
  | "accounting-billing"
  | "invoice-customization"
  | "invoice-payments"
  | "subscribe"
  | "ai-usage"
  | "ai-addons"
  | "storage-backup"
  | "my-crew"
  | "employee-ai"
  | "clock-verification"
  | "backup"
  | "backup-restore"
  | "services-description"
  | "legal-data-privacy"
  | "legal-liability"
  | "legal-stuff";

export type SettingsGroupId =
  | "company"
  | "appearance"
  | "jobs"
  | "billing"
  | "team"
  | "data"
  | "legal";

export type SettingsNavItem = {
  route: SettingsRouteId;
  title: string;
  hint?: string;
};

export type SettingsGroup = {
  id: SettingsGroupId;
  title: string;
  subtitle: string;
  items: SettingsNavItem[];
};

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    id: "company",
    title: "Company & profile",
    subtitle: "Your business identity, cards, and online presence.",
    items: [
      { route: "user-info", title: "User info", hint: "Company name, contact, and profile details." },
      { route: "virtual-business-card", title: "Virtual Business Card", hint: "Design templates, preview, save, and share your card." },
      { route: "business-card-qr", title: "Business card QR", hint: "QR code customers scan for your card." },
      { route: "business-card-display", title: "Business card display", hint: "Which fields show on the live card screen." },
      { route: "logos", title: "Logos", hint: "Company logo for splash screen and documents." },
      { route: "social-media", title: "Social media", hint: "Links shown on your business card." },
    ],
  },
  {
    id: "appearance",
    title: "Display",
    subtitle: "Wallpaper brightness on all screens.",
    items: [{ route: "display", title: "Display", hint: "Background brightness on all screens." }],
  },
  {
    id: "jobs",
    title: "Jobs, materials & apps",
    subtitle: "Suppliers, material search, maps, and shortcut apps.",
    items: [
      { route: "suppliers", title: "My supply houses", hint: "Distributors you buy from on the job." },
      {
        route: "integrations",
        title: "Supported Integrations",
        hint: "Curated suppliers and app shortcuts (Dropbox, Maps, Gmail, and more).",
      },
      { route: "maps-addresses", title: "Maps & addresses", hint: "Default map app and address search." },
    ],
  },
  {
    id: "billing",
    title: "Billing & payments",
    subtitle: "How you get paid, invoice look, and subscription.",
    items: [
      { route: "payment-apps", title: "Payment methods", hint: "Venmo, Square, Cash App, and more on Getting Paid." },
      { route: "invoice-payments", title: "Invoice payments", hint: "Pay-online link on invoice texts and emails." },
      { route: "accounting-billing", title: "Accounting & billing", hint: "Bookkeeping app and bank shortcuts from home." },
      { route: "invoice-customization", title: "Invoice customization", hint: "Logo, colors, and layout on invoices." },
      { route: "subscribe", title: "Subscription", hint: "Plan tier and app subscription." },
      { route: "ai-usage", title: "AI usage", hint: "Monthly AI quota, trial usage, and warnings." },
      {
        route: "ai-addons",
        title: "AI add-ons",
        hint: "Extra AI question packs when you need more than your plan includes.",
      },
    ],
  },
  {
    id: "team",
    title: "Team & AI",
    subtitle: "Crew, employees, and company policy for AI.",
    items: [
      { route: "my-crew", title: "My crew", hint: "Employees and crew members on jobs." },
      {
        route: "clock-verification",
        title: "Clock verification",
        hint: "GPS, geo-fence, photo, and offline punch settings.",
      },
      { route: "employee-ai", title: "Crew AI", hint: "Crew AI included with Pro+ app subscription." },
    ],
  },
  {
    id: "data",
    title: "Data & backup",
    subtitle: "Export and restore app data on this device.",
    items: [
      { route: "storage-backup", title: "Storage & cloud backup", hint: "Local-only files and external backup preferences." },
      { route: "backup-restore", title: "Backup & restore", hint: "Save or load a backup file on this device." },
    ],
  },
  {
    id: "legal",
    title: "Support & legal",
    subtitle: "Terms, disclosures, and privacy notices.",
    items: [
      {
        route: "legal-stuff",
        title: "Legal Stuff",
        hint: "Privacy, terms, AI disclaimer, GPS consent, deletion, and EULA.",
      },
      {
        route: "services-description",
        title: "Services Description",
        hint: "What the app provides and does not provide.",
      },
      {
        route: "legal-data-privacy",
        title: "Data & Privacy",
        hint: "Operational data collected and what not to upload.",
      },
      {
        route: "legal-liability",
        title: "Limitation of Liability",
        hint: "Workforce compliance and liability limits.",
      },
    ],
  },
] as const;

const ROUTE_TO_GROUP = new Map<SettingsRouteId, SettingsGroupId>(
  SETTINGS_GROUPS.flatMap((g) => g.items.map((item) => [item.route, g.id] as const)),
);

export function getSettingsGroup(id: SettingsGroupId): SettingsGroup | undefined {
  return SETTINGS_GROUPS.find((g) => g.id === id);
}

export function isSettingsGroupId(value: string): value is SettingsGroupId {
  return SETTINGS_GROUPS.some((g) => g.id === value);
}

export function settingsGroupHref(groupId: SettingsGroupId): Href {
  return `/settings/group/${groupId}` as Href;
}

export function settingsItemHref(route: SettingsRouteId): Href {
  return `/settings/${route}` as Href;
}

export function settingsBackHref(route: SettingsRouteId): Href {
  const groupId = ROUTE_TO_GROUP.get(route);
  return groupId ? settingsGroupHref(groupId) : ("/settings" as Href);
}

export function settingsBackLabel(route: SettingsRouteId): string {
  const groupId = ROUTE_TO_GROUP.get(route);
  if (!groupId) return "← Settings";
  const group = getSettingsGroup(groupId);
  return group ? `← ${group.title}` : "← Settings";
}
