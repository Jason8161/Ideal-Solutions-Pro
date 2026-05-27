export type PricingTier = {
  id: string;
  name: string;
  priceMonthly: number;
  priceLabel: string;
  tagline: string;
  features: string[];
  restrictions?: string[];
  onboardingNote?: string;
  ctaLabel: string;
  ctaHref: string;
  mostPopular?: boolean;
  revenueCatPlaceholder?: string;
};

export const PRICING_HERO = {
  title: "Simple Pricing Built for Contractors",
  subtitle:
    "Powerful AI tools, scheduling, estimating, employee management, and contractor productivity features without overpriced enterprise software.",
};

export const FREE_TRIAL = {
  title: "7-Day Free Trial",
  highlights: [
    "No long-term commitment",
    "Limited AI requests",
    "Limited cloud storage",
    "Limited employee access",
    "Trial protections enabled",
  ],
  limits: [
    "10 AI requests total",
    "No permanent cloud storage",
    "Limited uploads",
    "Employee accounts operate in restricted trial mode",
    "Features may be limited during trial",
  ],
  disclaimer:
    "Trial limitations help us prevent abuse and keep pricing affordable for real contractors.",
};

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: "side-hustle",
    name: "Side Hustle",
    priceMonthly: 9.99,
    priceLabel: "$9.99/month",
    tagline: "Perfect for small contractors and solo operators.",
    features: [
      "AI Assistant",
      "Estimating tools",
      "Scheduling tools",
      "Notes & job tracking",
      "Material list management",
      "Basic cloud storage",
      "Business card creator",
      "150 AI requests/month",
      "10 GB cloud storage included if you do not already use external storage",
    ],
    restrictions: ["No employee accounts", "Single-user account"],
    onboardingNote:
      "Users will be asked during setup if they already use iCloud, Google Drive, Dropbox, or OneDrive.",
    ctaLabel: "Start Side Hustle",
    ctaHref: "/#waitlist",
    revenueCatPlaceholder: "ideal_starter_monthly",
  },
  {
    id: "boss-man",
    name: "Boss Man",
    priceMonthly: 19.99,
    priceLabel: "$19.99/month",
    tagline: "For growing contractors managing more jobs and business operations.",
    features: [
      "Everything in Side Hustle",
      "Expanded AI assistant usage",
      "Advanced scheduling",
      "Team communication",
      "Priority AI processing",
      "More estimate/project tools",
      "Increased cloud storage support",
      "500 AI requests/month",
    ],
    restrictions: ["No employee accounts"],
    ctaLabel: "Become the Boss",
    ctaHref: "/#waitlist",
    mostPopular: true,
    revenueCatPlaceholder: "ideal_solutions_pro_monthly",
  },
  {
    id: "super-boss-man",
    name: "Super Boss Man",
    priceMonthly: 49.99,
    priceLabel: "$49.99/month",
    tagline: "For contractors managing teams and scaling operations.",
    features: [
      "Everything in Boss Man",
      "Up to 8 employee accounts",
      "Employee scheduling",
      "Employee communication",
      "GPS clock-in/clock-out support",
      "Team management dashboard",
      "AI-powered business tools",
      "Expanded storage support",
      "1,500 AI requests/month",
    ],
    restrictions: [
      "Employees use limited companion accounts",
      "Additional AI usage may require add-ons",
    ],
    ctaLabel: "Run the Crew",
    ctaHref: "/#waitlist",
    revenueCatPlaceholder: "ideal_boss_monthly",
  },
  {
    id: "enterprise-boss-man",
    name: "Enterprise Boss Man",
    priceMonthly: 99.99,
    priceLabel: "$99.99/month",
    tagline: "Built for larger contractor teams and growing businesses.",
    features: [
      "Everything in Super Boss Man",
      "Up to 15 employee accounts",
      "Advanced team management",
      "Expanded GPS tracking tools",
      "Enhanced storage support",
      "Priority support",
      "Advanced admin controls",
      "Higher AI usage limits",
      "Enterprise-ready scalability",
    ],
    ctaLabel: "Scale the Business",
    ctaHref: "/#waitlist",
    revenueCatPlaceholder: "Coming Soon",
  },
];

export const STORAGE_PROVIDERS = [
  "iCloud",
  "Google Drive",
  "Dropbox",
  "OneDrive",
] as const;

export const AI_ADDONS = [
  "Additional AI request packs",
  "Increased AI limits",
  "Priority AI processing",
] as const;

export const STORAGE_ADDONS = [
  "Additional cloud storage tiers",
  "Expanded file upload limits",
] as const;

export const WHY_ISPRO = [
  "Built specifically for contractors",
  "AI-powered estimating assistance",
  "Employee management",
  "Team scheduling",
  "Business organization",
  "Job tracking",
  "Contractor-focused tools",
  "Affordable pricing compared to enterprise software",
] as const;

export type FaqItem = { question: string; answer: string };

export const PRICING_FAQ: readonly FaqItem[] = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Subscriptions are managed through the App Store or Google Play. Cancel before your renewal date in your device subscription settings.",
  },
  {
    question: "Do I need my own cloud storage?",
    answer:
      "No. You can connect iCloud, Google Drive, Dropbox, or OneDrive during setup, or use included app storage on eligible plans.",
  },
  {
    question: "What happens after the free trial?",
    answer:
      "After 7 days, choose a paid plan to keep full access. Trial limits apply until you subscribe.",
  },
  {
    question: "Can I upgrade later?",
    answer:
      "Yes. Upgrade anytime in the app when your crew or AI usage grows.",
  },
  {
    question: "Are employees charged separately?",
    answer:
      "Employee companion accounts are included within Super Boss Man and Enterprise Boss Man limits — not billed per seat separately.",
  },
  {
    question: "What if I run out of AI requests?",
    answer:
      "Purchase AI add-on packs or upgrade to a higher tier for more monthly requests.",
  },
  {
    question: "Is my business data secure?",
    answer:
      "We use encrypted connections, secure authentication, and industry-standard cloud protections. See our Privacy Policy for details.",
  },
  {
    question: "Does GPS tracking require consent?",
    answer:
      "Yes. Employers must obtain proper employee consent and comply with applicable labor and privacy laws.",
  },
  {
    question: "Can I use the app without employees?",
    answer:
      "Absolutely. Side Hustle and Boss Man are designed for solo contractors with no employee accounts required.",
  },
];

export const COMPARISON_ROWS: {
  label: string;
  sideHustle: string;
  bossMan: string;
  superBossMan: string;
  enterprise: string;
}[] = [
  { label: "AI requests / month", sideHustle: "150", bossMan: "500", superBossMan: "1,500", enterprise: "Higher limits" },
  { label: "Employee accounts", sideHustle: "—", bossMan: "—", superBossMan: "Up to 8", enterprise: "Up to 15" },
  { label: "GPS clock-in/out", sideHustle: "—", bossMan: "—", superBossMan: "✓", enterprise: "✓ Expanded" },
  { label: "Included storage", sideHustle: "10 GB*", bossMan: "Expanded", superBossMan: "Expanded", enterprise: "Enhanced" },
  { label: "Priority support", sideHustle: "—", bossMan: "—", superBossMan: "—", enterprise: "✓" },
];

export const PRICING_LEGAL_LINKS = [
  { href: "/legal/privacy-policy", label: "Privacy Policy" },
  { href: "/legal/terms-of-service", label: "Terms of Service" },
  { href: "/legal/ai-disclaimer", label: "AI Disclaimer" },
  { href: "/legal", label: "Legal Stuff" },
] as const;
