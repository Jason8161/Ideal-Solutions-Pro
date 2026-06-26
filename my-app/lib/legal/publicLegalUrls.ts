/** Public HTTPS legal pages ΓÇö must match App Store Connect metadata (Guideline 3.1.2). */
export const PUBLIC_LEGAL_URLS = {
  privacy: "https://www.idealsolutionspro.com/legal/privacy-policy",
  eula: "https://www.idealsolutionspro.com/legal/eula",
  terms: "https://www.idealsolutionspro.com/legal/terms-of-use",
  /** Apple standard EULA ΓÇö optional reference in App Store Connect metadata. */
  appleStandardEula: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
} as const;
