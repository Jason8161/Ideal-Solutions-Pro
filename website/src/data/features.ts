export type FeatureSection = {
  id: string;
  headline: string;
  subline: string;
  description: string;
  image: string;
  imageAlt: string;
};

export const FEATURE_SECTIONS: FeatureSection[] = [
  {
    id: "ai",
    headline: "Ideal Solutions Pro AI Assistance",
    subline: "Estimates, materials, codes & jobsite help",
    description:
      "Ask AI for estimates, material lists, code questions, and jobsite guidance without leaving the field. Daily limits apply on lower tiers; Bossman and above include unlimited fair-use AI.",
    image: "/images/ideal-solutions-pro-button.png",
    imageAlt: "AI assistance tile artwork",
  },
  {
    id: "job-folder",
    headline: "Job Folder built for contractors",
    subline: "Customers, jobs, photos, and reports in one place",
    description:
      "Organize customers, active jobs, crew assignments, photos, and job reports from a single hub designed for trades work — not generic project management.",
    image: "/images/home-job-folder.png",
    imageAlt: "Job Folder tile artwork",
  },
  {
    id: "materials",
    headline: "Find materials fast",
    subline: "Search suppliers and build lists on the job",
    description:
      "Search Home Depot, Lowe's, Ace, and supply houses (Bossman+) to build material lists while you're on site instead of guessing from memory.",
    image: "/images/home-job-folder.png",
    imageAlt: "Materials search",
  },
  {
    id: "estimates",
    headline: "Professional estimates",
    subline: "Create, send, and track estimates from the field",
    description:
      "Build estimates with photo-to-estimate uploads on paid tiers. Save and track estimates as your business grows from side jobs to full crews.",
    image: "/images/home-todo.png",
    imageAlt: "Estimates and accounting",
  },
  {
    id: "getting-paid",
    headline: "Get paid your way",
    subline: "Cash App, Venmo, Square — tap and go",
    description:
      "Connect the payment apps you already use. Bossman Mode unlocks Getting Paid with Cash App, Venmo, Square, and more — right from the jobsite.",
    image: "/images/home-getting-paid.png",
    imageAlt: "Getting Paid tile artwork",
  },
  {
    id: "crew",
    headline: "Calendar, crew & employee app",
    subline: "Schedule work and keep the team in sync",
    description:
      "Calendar for job scheduling, social shortcuts for your business presence, and a separate Employee app build for clock-in, messages, and crew AI on Bossman plans.",
    image: "/images/home-calendar.png",
    imageAlt: "Calendar and crew features",
  },
];

export const HOME_HIGHLIGHTS = [
  {
    title: "Your jobsite command center",
    body: "AI, jobs, pay, and calendar — one home screen",
  },
  {
    title: "Job Folder built for contractors",
    body: "Customers, jobs, photos, and reports in one place",
  },
  {
    title: "Find materials fast",
    body: "Search suppliers and build lists on the job",
  },
  {
    title: "Plans that grow with your business",
    body: "Free trial to Enterprise — upgrade when you are ready",
  },
  {
    title: "Get paid your way",
    body: "Cash App, Venmo, Square — tap and go",
  },
  {
    title: "Professional estimates",
    body: "Create, send, and track estimates from the field",
  },
] as const;
