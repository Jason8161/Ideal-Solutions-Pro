import { createContext, PropsWithChildren, useContext, useState } from "react";

type ScaleContextType = {
  widthScale: number;
  heightScale: number;
  brightness: number;
  setWidthScale: (value: number) => void;
  setHeightScale: (value: number) => void;
  setBrightness: (value: number) => void;
};

const ScreenScaleContext = createContext<ScaleContextType | null>(null);

export function ScaleProvider({ children }: PropsWithChildren<{}>) {
  const [widthScale, setWidthScale] = useState(1);
  const [heightScale, setHeightScale] = useState(1);
  const [brightness, setBrightness] = useState(1);

  return (
    <ScreenScaleContext.Provider
      value={{ widthScale, heightScale, brightness, setWidthScale, setHeightScale, setBrightness }}
    >
      {children}
    </ScreenScaleContext.Provider>
  );
}

export function useScale() {
  const context = useContext(ScreenScaleContext);
  if (!context) {
    throw new Error("useScale must be used within ScaleProvider");
  }
  return context;
}
