import type { DailyReportFields } from "@/lib/aiAssistant/types";

function line(label: string, value: string): string {
  const trimmed = value.trim();
  return trimmed ? `- ${label}: ${trimmed}` : `- ${label}: (not provided)`;
}

export function buildDailyReportPrompt(fields: DailyReportFields): string {
  return [
    "Create a professional electrical contractor daily report using the following information.",
    "Format it clearly with sections for work completed, issues, crew, and hours. Use concise contractor language.",
    "",
    line("Job name", fields.jobName),
    line("Work completed", fields.workCompleted),
    line("Problems encountered", fields.problemsEncountered),
    line("Crew size", fields.crewSize),
    line("Hours worked", fields.hoursWorked),
  ].join("\n");
}
