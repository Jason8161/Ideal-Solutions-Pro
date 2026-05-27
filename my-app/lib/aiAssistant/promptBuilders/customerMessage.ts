import type { CustomerMessageFields } from "@/lib/aiAssistant/types";

function line(label: string, value: string): string {
  const trimmed = value.trim();
  return trimmed ? `- ${label}: ${trimmed}` : `- ${label}: (not provided)`;
}

export function buildCustomerMessagePrompt(fields: CustomerMessageFields): string {
  return [
    "Write a customer-facing message for an electrical contractor.",
    `Use a ${fields.tone.toLowerCase()} tone. Keep it clear, respectful, and appropriate for texting or email.`,
    "Do not invent pricing, permits, or schedule commitments unless provided below.",
    "",
    line("Customer name", fields.customerName),
    line("Situation", fields.situation),
    line("Desired tone", fields.tone),
  ].join("\n");
}
