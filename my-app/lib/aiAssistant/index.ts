export {
  AI_ASSISTANT_TOOLS,
  type AiAssistantProvider,
  type AiAssistantToolDefinition,
  type AiAssistantToolId,
  type CustomerMessageFields,
  type CustomerMessageTone,
  type DailyReportFields,
  type MaterialRequestFields,
  type SafetyQuestionFields,
  type TroubleshootingFields,
} from "./types";

export {
  CHATGPT_ANDROID_PACKAGE,
  CHATGPT_ANDROID_SCHEMES,
  CHATGPT_IOS_QUERY_SCHEMES,
  openChatGPTWithPrompt,
} from "./openChatGPTWithPrompt";

export {
  buildCustomerMessagePrompt,
  buildDailyReportPrompt,
  buildMaterialRequestPrompt,
  buildSafetyQuestionPrompt,
  buildTroubleshootingPrompt,
} from "./promptBuilders";

export { hasSeenAiAssistantOnboarding, markAiAssistantOnboardingSeen } from "./onboardingStorage";

export { loadAiAssistantToolsEnabled, saveAiAssistantToolsEnabled } from "./preferencesStorage";
