export type AiChatRole = "user" | "assistant";

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
};

export type AiAssistanceUserContext = {
  companyName?: string;
  trade?: string;
};

export type AiAssistanceRequest = {
  message: string;
  chatHistory?: AiChatMessage[];
  userContext?: AiAssistanceUserContext;
};

export type AiAssistanceResponse = {
  reply: string;
};

/** Full message sent when the user taps a starter row (empty chat). */
export type AiAssistanceStarterPrompt = {
  label: string;
  message: string;
};

export const AI_ASSISTANCE_STARTER_PROMPTS: readonly AiAssistanceStarterPrompt[] = [
  {
    label: "Help estimate this job",
    message:
      "Help me estimate labor, materials, and markup for a contracting job. Ask what you need, then suggest a clear breakdown.",
  },
  {
    label: "Build a material list",
    message:
      "Build a material list for a job. I'll describe the scope — include quantities, common waste, and anything easy to forget.",
  },
  {
    label: "Building or code question",
    message:
      "I have a building code or best-practice question for my trade. I'll describe the situation — explain options and what to verify locally.",
  },
  {
    label: "Service call notes",
    message:
      "Help me write clear service call notes: problem, what I found, work performed, parts used, and follow-up for the customer.",
  },
  {
    label: "Customer message",
    message:
      "Draft a professional message to my customer (update, delay, quote follow-up, or completion). I'll share the details and tone I want.",
  },
  {
    label: "Plan this job",
    message:
      "Help me plan a job: sequence of work, crew needs, inspections, permits to check, and a simple checklist before we start.",
  },
];

export const AI_ASSISTANCE_QUICK_PROMPTS = [
  "Build me a material list",
  "Help estimate this job",
  "Building/code question",
  "Write customer message",
  "Troubleshoot a jobsite issue",
  "Create service call notes",
] as const;
