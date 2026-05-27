import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type BrandHeaderContextValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const BrandHeaderContext = createContext<BrandHeaderContextValue | null>(null);

export function BrandHeaderProvider({ children }: PropsWithChildren) {
  const [hidden, setHiddenState] = useState(false);
  const setHidden = useCallback((next: boolean) => {
    setHiddenState(next);
  }, []);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden, setHidden]);
  return <BrandHeaderContext.Provider value={value}>{children}</BrandHeaderContext.Provider>;
}

export function useBrandHeaderVisibility() {
  const value = useContext(BrandHeaderContext);
  if (!value) {
    throw new Error("useBrandHeaderVisibility must be used within BrandHeaderProvider");
  }
  return value;
}

/** Hide the global brand header (e.g. splash on home). Resets on unmount. */
export function useSuppressBrandHeader(suppress: boolean) {
  const { setHidden } = useBrandHeaderVisibility();

  useEffect(() => {
    setHidden(suppress);
    return () => setHidden(false);
  }, [suppress, setHidden]);
}
