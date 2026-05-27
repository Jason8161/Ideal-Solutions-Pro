/** Metro (Expo) `require.context` — enabled via `unstable_allowRequireContext` in @expo/metro-config */

export {};

declare global {
  interface RequireContext {
    keys(): string[];
    (id: string): number;
    resolve(id: string): string;
    id: string;
  }

  interface NodeRequire {
    context(
      path: string,
      deep?: boolean,
      filter?: RegExp,
      mode?: "sync" | "eager" | "lazy" | "lazy-once",
    ): RequireContext;
  }
}
