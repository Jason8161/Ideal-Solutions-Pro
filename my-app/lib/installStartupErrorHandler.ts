/**
 * Installed once from root layout before other app modules mount.
 * Logs uncaught JS errors; pairs with RootErrorBoundary for render failures.
 * Native crashes (RevenueCat configure, etc.) still require deferral / skip flags.
 */
type GlobalHandler = (error: unknown, isFatal?: boolean) => void;

let installed = false;

export function installStartupErrorHandler(): void {
  if (installed) return;
  installed = true;

  const errorUtils = (
    globalThis as typeof globalThis & {
      ErrorUtils?: {
        getGlobalHandler?: () => GlobalHandler;
        setGlobalHandler?: (handler: GlobalHandler) => void;
      };
    }
  ).ErrorUtils;

  if (!errorUtils?.getGlobalHandler || !errorUtils.setGlobalHandler) return;

  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (__DEV__) {
      console.error("[startup] uncaught error", { isFatal, error });
    }
    previous(error, isFatal);
  });
}
