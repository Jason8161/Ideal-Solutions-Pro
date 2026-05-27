/**
 * Loads ExpoSpeechRecognition only when the native module exists (dev client / production build).
 * Do not require("expo-speech-recognition") — its index re-exports a module that calls
 * requireNativeModule at load time and throws in Expo Go: Cannot find native module 'ExpoSpeechRecognition'.
 */
import { requireOptionalNativeModule } from "expo";

export type SpeechRecognitionBindings = {
  ExpoSpeechRecognitionModule: {
    start: (options: Record<string, unknown>) => void;
    stop: () => void;
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
    isRecognitionAvailable: () => boolean;
    addListener: (
      eventName: string,
      listener: (event: Record<string, unknown>) => void,
    ) => { remove: () => void };
  };
};

let cached: SpeechRecognitionBindings | null | undefined;

function isSpeechModule(
  mod: unknown,
): mod is SpeechRecognitionBindings["ExpoSpeechRecognitionModule"] {
  if (!mod || typeof mod !== "object") return false;
  const m = mod as Record<string, unknown>;
  return (
    typeof m.start === "function" &&
    typeof m.stop === "function" &&
    typeof m.requestPermissionsAsync === "function" &&
    typeof m.isRecognitionAvailable === "function" &&
    typeof m.addListener === "function"
  );
}

export function loadSpeechRecognitionBindings(): SpeechRecognitionBindings | null {
  if (cached !== undefined) return cached;
  try {
    const native = requireOptionalNativeModule("ExpoSpeechRecognition");
    if (!isSpeechModule(native)) {
      cached = null;
      return null;
    }
    cached = { ExpoSpeechRecognitionModule: native };
  } catch {
    cached = null;
  }
  return cached;
}

export function isSpeechRecognitionAvailable(): boolean {
  return loadSpeechRecognitionBindings() != null;
}
