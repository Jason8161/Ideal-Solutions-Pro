/**
 * Marketing pricing copy — keep in sync with my-app/lib/subscriptions/tiers.ts
 * (SUBSCRIPTION_PLANS, AI_ADDON_PACKS, TRIAL_DAYS, TRIAL_AI_REQUESTS_TOTAL).
 */

export type PricingTierId =
  | "side_hustle"
  | "boss_man"
  | "super_boss_man"
  | "enterprise_boss_man";

export type PricingTier = {
  id: PricingTierId;
  name: string;
  priceMonthly: number;
  priceLabel: string;
  tagline: string;
  features: string[];
  employeeNote?: string;
  ctaLabel: string;
  ctaHref: string;
  mostPopular?: boolean;
  /** RevenueCat store product id — wire CTAs when live */
  revenueCatProductId: string;
  revenueCatEntitlementId: string;
};

export const PRICING_HERO = {
  title: "Simple Pricing Built for Contractors",
  subtitle:
    "Powerful AI tools, scheduling, estimating, and crew management — without overpriced enterprise software. Local-first storage keeps subscriptions affordable.",
};

export const FREE_TRIAL = {
  title: "7-Day Free Trial",
  highlights: [
    "Full access to features on your selected plan tier",
    "Only 5 AI requests total for the entire trial",
    "No cloud storage — local device storage only",
    "Choose your intended subscription during onboarding",
    "Trial protections against abuse",
    "No credit card tricks or hidden charges",
  ],
  limits: [
    "5 AI requests total (not per day)",
    "Photos, videos, and project files stay on your device",
    "Employee accounts run in limited trial mode when applicable",
  ],
  disclaimer:
    "After 7 days, subscribe through the App Store or Google Play to keep full access. Your local data stays on your device.",
  ctaLabel: "Start Free Trial",
  ctaHref: "/#waitlist",
};

export const LOCAL_FIRST_STORAGE = {
  title: "Local-First Storage",
  subtitle: "Ideal Solutions Pro does not host your job photos, videos, or large project files in our cloud.",
  doesNotHost: [
    "Customer photos",
    "Videos",
    "Large project files",
  ],
  instead: [
    "Files stay on your device",
    "Photos are automatically compressed",
    "You maintain ownership of your files",
    "Optional external cloud providers are recommended for backup",
  ],
  providers: ["iCloud", "OneDrive", "Google Drive", "Dropbox"] as const,
  affordabilityNote:
    "Keeping files local helps keep subscriptions affordable while giving users control over their own data.",
};

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: "side_hustle",
    name: "Side Hustle / DIY",
    priceMonthly: 9.99,
    priceLabel: "$9.99/month",
    tagline:
      "Perfect for side jobs, DIY users, apprentices, and solo workers.",
    features: [
      "50 AI requests/month",
      "Estimating tools",
      "Invoices",
      "Scheduling",
      "Customer management",
      "AI contractor assistant",
      "Local-first storage",
      "No employees included",
    ],
    ctaLabel: "Start Side Hustle",
    ctaHref: "/#waitlist",
    revenueCatProductId: "side_hustle_monthly",
    revenueCatEntitlementId: "side_hustle",
  },
  {
    id: "boss_man",
    name: "Boss Man Mode",
    priceMonthly: 19.99,
    priceLabel: "$19.99/month",
    tagline:
      "Built for serious solo contractors and owner/operators.",
    features: [
      "100 AI requests/month",
      "Advanced estimating",
      "Scheduling",
      "Customer management",
      "AI contractor assistant",
      "Business workflow tools",
      "Local-first storage",
      "No employees included",
    ],
    ctaLabel: "Become The Boss",
    ctaHref: "/#waitlist",
    mostPopular: true,
    revenueCatProductId: "boss_man_monthly",
    revenueCatEntitlementId: "boss_man",
  },
  {
    id: "super_boss_man",
    name: "Super Boss Man",
    priceMonthly: 49.99,
    priceLabel: "$49.99/month",
    tagline:
      "For growing contractor companies and small crews.",
    features: [
      "Up to 8 employees",
      "150 AI requests/month",
      "Team scheduling",
      "Team communication",
      "Shared jobs & customers",
      "Admin controls",
      "Local-first storage",
    ],
    employeeNote:
      "Employee accounts are limited by default unless upgraded individually.",
    ctaLabel: "Manage My Crew",
    ctaHref: "/#waitlist",
    revenueCatProductId: "super_boss_man_monthly",
    revenueCatEntitlementId: "super_boss_man",
  },
  {
    id: "enterprise_boss_man",
    name: "Enterprise Boss Man",
    priceMonthly: 99.99,
    priceLabel: "$99.99/month",
    tagline:
      "For established contractor companies managing larger teams.",
    features: [
      "Up to 15 employees",
      "200 AI requests/month",
      "Advanced management tools",
      "Priority support",
      "Local-first storage",
      "Everything in Super Boss Man",
    ],
    employeeNote:
      "Employee accounts are limited by default unless upgraded individually.",
    ctaLabel: "Scale My Company",
    ctaHref: "/#waitlist",
    revenueCatProductId: "enterprise_boss_man_monthly",
    revenueCatEntitlementId: "enterprise_boss_man",
  },
];

export type AiAddonPack = {
  id: string;
  label: string;
  priceLabel: string;
  monthlyCredits: number;
  revenueCatProductId: string;
};

/** Matches my-app AI_ADDON_PACKS */
export const AI_ADDON_PACKS: readonly AiAddonPack[] = [
  {
    id: "ai_100",
    label: "+100 AI Requests",
    priceLabel: "$4.99/month",
    monthlyCredits: 100,
    revenueCatProductId: "ai_addon_100_monthly",
  },
  {
    id: "ai_500",
    label: "+500 AI Requests",
    priceLabel: "$14.99/month",
    monthlyCredits: 500,
    revenueCatProductId: "ai_addon_500_monthly",
  },
  {
    id: "ai_2000",
    label: "+2,000 AI Requests",
    priceLabel: "$39.99/month",
    monthlyCredits: 2000,
    revenueCatProductId: "ai_addon_2000_monthly",
  },
  {
    id: "ai_5000",
    label: "+5,000 AI Requests",
    priceLabel: "$79.99/month",
    monthlyCredits: 5000,
    revenueCatProductId: "ai_addon_5000_monthly",
  },
];

export const AI_ADDONS_SECTION = {
  title: "Need More AI Power?",
  subtitle: "Heavy AI users can expand their monthly AI usage at any time.",
};

export type FaqItem = { question: string; answer: string };

export const PRICING_FAQ: readonly FaqItem[] = [
  {
    question: "Does the app store my photos/videos?",
    answer:
      "No. Ideal Solutions Pro uses local-first storage to help keep subscriptions affordable and give users control over their files.",
  },
  {
    question: "Can I use my own cloud storage provider?",
    answer:
      "Yes. We recommend iCloud, OneDrive, Google Drive, or Dropbox for backup and syncing.",
  },
  {
    question: "Do employees get full access?",
    answer:
      "Employee accounts are limited by default unless upgraded individually.",
  },
  {
    question: "What happens when I reach my AI limit?",
    answer:
      "You can purchase additional AI request add-ons anytime.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Every user gets a 7-day free trial with full feature access on their chosen tier and 5 AI requests total.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Subscriptions are managed through the Apple App Store or Google Play. Cancel before your renewal date in your device subscription settings.",
  },
];

export const COMPARISON_ROWS: {
  label: string;
  sideHustle: string;
  bossMan: string;
  superBossMan: string;
  enterprise: string;
}[] = [
  {
    label: "Monthly price",
    sideHustle: "$9.99",
    bossMan: "$19.99",
    superBossMan: "$49.99",
    enterprise: "$99.99",
  },
  {
    label: "AI requests / month",
    sideHustle: "50",
    bossMan: "100",
    superBossMan: "150",
    enterprise: "200",
  },
  {
    label: "Employee accounts",
    sideHustle: "—",
    bossMan: "—",
    superBossMan: "Up to 8",
    enterprise: "Up to 15",
  },
  {
    label: "Estimating & invoices",
    sideHustle: "✓",
    bossMan: "✓ Advanced",
    superBossMan: "✓",
    enterprise: "✓",
  },
  {
    label: "Team scheduling",
    sideHustle: "—",
    bossMan: "—",
    superBossMan: "✓",
    enterprise: "✓",
  },
  {
    label: "Shared jobs & customers",
    sideHustle: "—",
    bossMan: "—",
    superBossMan: "✓",
    enterprise: "✓",
  },
  {
    label: "Local-first storage",
    sideHustle: "✓",
    bossMan: "✓",
    superBossMan: "✓",
    enterprise: "✓",
  },
  {
    label: "App-hosted photo/video cloud",
    sideHustle: "—",
    bossMan: "—",
    superBossMan: "—",
    enterprise: "—",
  },
  {
    label: "Priority support",
    sideHustle: "—",
    bossMan: "—",
    superBossMan: "—",
    enterprise: "✓",
  },
];

export const PRICING_LEGAL_LINKS = [
  { href: "/legal/privacy-policy", label: "Privacy Policy" },
  { href: "/legal/terms-of-service", label: "Terms of Service" },
  { href: "/legal/ai-disclaimer", label: "AI Disclaimer" },
  { href: "/legal", label: "Legal Stuff" },
] as const;
