import { Linking, Platform } from "react-native";

async function openFirstAvailable(urls: readonly string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      const can = await Linking.canOpenURL(url).catch(() => false);
      if (can) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

async function openNativeOrWeb(nativeCandidates: readonly string[], webUrl: string): Promise<void> {
  const opened = await openFirstAvailable(nativeCandidates);
  if (!opened) {
    await Linking.openURL(webUrl);
  }
}

/** Facebook app when installed; otherwise mobile web. */
export async function openFacebook(): Promise<void> {
  await openNativeOrWeb(["fb://"], "https://m.facebook.com/");
}

/** Facebook Messenger app when installed; otherwise messenger.com. */
export async function openFacebookMessenger(): Promise<void> {
  await openNativeOrWeb(["fb-messenger://", "messenger://"], "https://www.messenger.com/");
}

/** Instagram app when installed; otherwise instagram.com. */
export async function openInstagram(): Promise<void> {
  await openNativeOrWeb(["instagram://app", "instagram://"], "https://www.instagram.com/");
}

/** TikTok app when installed; otherwise tiktok.com. */
export async function openTikTok(): Promise<void> {
  await openNativeOrWeb(["tiktok://", "snssdk1233://"], "https://www.tiktok.com/");
}

/** YouTube app when installed; otherwise mobile YouTube. */
export async function openYouTube(): Promise<void> {
  await openNativeOrWeb(["youtube://", "vnd.youtube://"], "https://m.youtube.com/");
}

/** LinkedIn app when installed; otherwise linkedin.com. */
export async function openLinkedIn(): Promise<void> {
  await openNativeOrWeb(["linkedin://"], "https://www.linkedin.com/");
}

/** X / Twitter app when installed; otherwise x.com. */
export async function openX(): Promise<void> {
  await openNativeOrWeb(["twitter://", "x://"], "https://x.com/");
}

/** Pinterest app when installed; otherwise pinterest.com. */
export async function openPinterest(): Promise<void> {
  await openNativeOrWeb(["pinterest://"], "https://www.pinterest.com/");
}

/** Opens the device app store search for social / networking apps. */
export function openSocialAppsStoreSearch(): void {
  const url =
    Platform.OS === "ios"
      ? "https://apps.apple.com/search?term=social%20network&entity=software"
      : "https://play.google.com/store/search?q=social+network+apps&c=apps";
  void Linking.openURL(url).catch(() => {});
}
