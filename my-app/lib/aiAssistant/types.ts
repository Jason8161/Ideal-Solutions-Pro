export type AiAssistantToolId =
  | "daily-report"
  | "material-request"
  | "troubleshooting"
  | "safety-question"
  | "customer-message";

export type CustomerMessageTone = "Professional" | "Friendly" | "Urgent";

export type DailyReportFields = {
  jobName: string;
  workCompleted: string;
  problemsEncountered: string;
  crewSize: string;
  hoursWorked: string;
};

export type MaterialRequestFields = {
  neededMaterials: string;
  jobName: string;
  priorityLevel: string;
};

export type TroubleshootingFields = {
  problemDescription: string;
  equipmentType: string;
  symptoms: string;
  photoTaken: boolean;
};

export type SafetyQuestionFields = {
  safetyQuestion: string;
  jobsiteConditions: string;
};

export type CustomerMessageFields = {
  customerName: string;
  situation: string;
  tone: CustomerMessageTone;
};

export type AiAssistantToolDefinition = {
  id: AiAssistantToolId;
  title: string;
  subtitle: string;
  route: `/employee/ai-assistant/${AiAssistantToolId}`;
};

/** Future hook point for server-side AI — not used in employee self-serve flow. */
export interface AiAssistantProvider {
  readonly id: string;
  generatePrompt?(toolId: AiAssistantToolId, fields: Record<string, unknown>): Promise<string>;
}

export const AI_ASSISTANT_TOOLS: readonly AiAssistantToolDefinition[] = [
  {
    id: "daily-report",
    title: "Daily Report AI",
    subtitle: "Professional daily field report",
    route: "/employee/ai-assistant/daily-report",
  },
  {
    id: "material-request",
    title: "Material Request AI",
    subtitle: "Purchasing / material request",
    route: "/employee/ai-assistant/material-request",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting AI",
    subtitle: "Equipment & electrical diagnostics",
    route: "/employee/ai-assistant/troubleshooting",
  },
  {
    id: "safety-question",
    title: "Safety Question AI",
    subtitle: "OSHA & jobsite safety guidance",
    route: "/employee/ai-assistant/safety-question",
  },
  {
    id: "customer-message",
    title: "Customer Message AI",
    subtitle: "Customer-facing message draft",
    route: "/employee/ai-assistant/customer-message",
  },
] as const;
