import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_BACKGROUND_BRIGHTNESS,
  loadBackgroundBrightness,
  normalizeBackgroundBrightness,
  saveBackgroundBrightness,
} from "@/lib/backgroundBrightnessStorage";

type DisplaySettingsContextValue = {
  backgroundBrightness: number;
  ready: boolean;
  setBackgroundBrightness: (value: number) => Promise<void>;
};

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null);

export function DisplaySettingsProvider({ children }: PropsWithChildren) {
  const [backgroundBrightness, setBackgroundBrightnessState] = useState(DEFAULT_BACKGROUND_BRIGHTNESS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadBackgroundBrightness().then((loaded) => {
      setBackgroundBrightnessState(loaded);
      setReady(true);
    });
  }, []);

  const setBackgroundBrightness = useCallback(async (value: number) => {
    const normalized = normalizeBackgroundBrightness(value);
    setBackgroundBrightnessState(normalized);
    await saveBackgroundBrightness(normalized);
  }, []);

  const value = useMemo(
    () => ({ backgroundBrightness, ready, setBackgroundBrightness }),
    [backgroundBrightness, ready, setBackgroundBrightness],
  );

  return <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>;
}

export function useDisplaySettings(): DisplaySettingsContextValue {
  const ctx = useContext(DisplaySettingsContext);
  if (!ctx) {
    throw new Error("useDisplaySettings must be used within DisplaySettingsProvider");
  }
  return ctx;
}
