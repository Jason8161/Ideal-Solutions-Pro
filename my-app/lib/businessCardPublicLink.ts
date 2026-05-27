import * as Linking from "expo-linking";

/** Deep link / universal-style URL that opens the in-app virtual business card screen. */
export function buildInAppBusinessCardUrl(options?: { forQrScan?: boolean }): string {
  const path = options?.forQrScan ? "/business-card?view=public" : "/business-card";
  return Linking.createURL(path, { scheme: "ideal-solutions" });
}
