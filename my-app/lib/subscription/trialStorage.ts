/**
 * Re-exports trial storage from `lib/subscriptions/trialStorage.ts`.
 */

export {
  clearProTrialRecord,
  getHelperTrialState,
  getProTrialState,
  loadProTrialRecord,
  recordHelperTrialAccepted,
  recordHelperTrialStartIfNeeded,
  recordProTrialAiRequest,
  startProTrial,
  type HelperTrialState,
  type ProTrialRecord,
  type ProTrialState,
  type StartTrialInput,
  type StartTrialResult,
} from "@/lib/subscriptions/trialStorage";
