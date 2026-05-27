import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { loadSpeechRecognitionBindings } from "@/lib/speechRecognitionBindings";

export type UseVoiceToTextOptions = {
  /** Current field value — used as the prefix when appending dictated text. */
  value: string;
  onChangeText: (text: string) => void;
  /** BCP-47 locale, e.g. en-US */
  lang?: string;
};

function joinTranscript(prefix: string, transcript: string): string {
  const trimmed = transcript.trim();
  if (!trimmed) return prefix;
  if (!prefix) return trimmed;
  const needsSpace = !/\s$/.test(prefix);
  return needsSpace ? `${prefix} ${trimmed}` : `${prefix}${trimmed}`;
}

/**
 * Shared speech-to-text logic for form fields. Optional accessory — does not affect keyboard focus.
 * Native module is loaded lazily so Expo Router can register routes without a dev-client rebuild.
 */
export function useVoiceToText({ value, onChangeText, lang = "en-US" }: UseVoiceToTextOptions) {
  const bindings = useMemo(() => loadSpeechRecognitionBindings(), []);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseRef = useRef(value);
  const onChangeRef = useRef(onChangeText);
  onChangeRef.current = onChangeText;
  const available = Platform.OS !== "web" && bindings != null;

  useEffect(() => {
    if (!bindings) return;
    const { ExpoSpeechRecognitionModule } = bindings;

    const startSub = ExpoSpeechRecognitionModule.addListener("start", () => {
      setListening(true);
      setError(null);
    });
    const endSub = ExpoSpeechRecognitionModule.addListener("end", () => {
      setListening(false);
    });
    const errorSub = ExpoSpeechRecognitionModule.addListener("error", (event) => {
      setListening(false);
      const code = typeof event.error === "string" ? event.error : "";
      if (code === "aborted" || code === "no-speech") return;
      const message = typeof event.message === "string" ? event.message : code;
      setError(message || "Speech recognition failed.");
    });
    const resultSub = ExpoSpeechRecognitionModule.addListener("result", (event) => {
      const results = event.results as { transcript?: string }[] | undefined;
      const transcript = results?.[0]?.transcript ?? "";
      if (!transcript.trim()) return;
      const isFinal = event.isFinal === true;
      if (isFinal) {
        const next = joinTranscript(baseRef.current, transcript);
        baseRef.current = next;
        onChangeRef.current(next);
      } else {
        onChangeRef.current(joinTranscript(baseRef.current, transcript));
      }
    });

    return () => {
      startSub.remove();
      endSub.remove();
      errorSub.remove();
      resultSub.remove();
    };
  }, [bindings]);

  const stop = useCallback(() => {
    if (!bindings) return;
    try {
      bindings.ExpoSpeechRecognitionModule.stop();
    } catch {
      /* already stopped */
    }
  }, [bindings]);

  const clearError = useCallback(() => setError(null), []);

  const start = useCallback(async () => {
    if (!available || !bindings) {
      setError("Voice input requires a dev or production build with speech recognition enabled.");
      return;
    }
    setError(null);
    const { ExpoSpeechRecognitionModule } = bindings;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError("Allow microphone and speech recognition to dictate text.");
      return;
    }
    const ready = ExpoSpeechRecognitionModule.isRecognitionAvailable();
    if (!ready) {
      setError("Speech recognition is not available on this device.");
      return;
    }
    baseRef.current = value;
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: false,
    });
  }, [available, bindings, lang, value]);

  const toggle = useCallback(async () => {
    if (listening) {
      stop();
      return;
    }
    await start();
  }, [listening, start, stop]);

  return {
    available,
    listening,
    error,
    toggle,
    stop,
    start,
    clearError,
  };
}
