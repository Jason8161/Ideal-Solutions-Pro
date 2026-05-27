import type { MaterialRequestFields } from "@/lib/aiAssistant/types";

function line(label: string, value: string): string {
  const trimmed = value.trim();
  return trimmed ? `- ${label}: ${trimmed}` : `- ${label}: (not provided)`;
}

export function buildMaterialRequestPrompt(fields: MaterialRequestFields): string {
  return [
    "Draft a professional material / purchasing request for an electrical contractor.",
    "Include a clear item list, job reference, priority, and a brief note suitable for a supply house or office manager.",
    "",
    line("Materials needed", fields.neededMaterials),
    line("Job name", fields.jobName),
    line("Priority level", fields.priorityLevel),
  ].join("\n");
}
