import type { SafetyQuestionFields } from "@/lib/aiAssistant/types";

function line(label: string, value: string): string {
  const trimmed = value.trim();
  return trimmed ? `- ${label}: ${trimmed}` : `- ${label}: (not provided)`;
}

export function buildSafetyQuestionPrompt(fields: SafetyQuestionFields): string {
  return [
    "Provide practical OSHA-aligned safety guidance for an electrical contractor crew member.",
    "Reference common NEC/OSHA considerations where relevant. Note when a qualified person or official policy is required.",
    "This is field guidance only — not a substitute for company safety programs or licensed professional judgment.",
    "",
    line("Safety question", fields.safetyQuestion),
    line("Jobsite conditions", fields.jobsiteConditions),
  ].join("\n");
}
