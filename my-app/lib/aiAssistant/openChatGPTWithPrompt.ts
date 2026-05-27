import * as Clipboard from "expo-clipboard";
import { launchAndroidPackage } from "installed-launcher-apps";
import { Linking, Platform } from "react-native";

/** Android package for the official ChatGPT app. */
export const CHATGPT_ANDROID_PACKAGE = "com.openai.chatgpt";

/** iOS / Android URL schemes registered for canOpenURL checks. */
export const CHATGPT_IOS_QUERY_SCHEMES = ["chatgpt", "com.openai.chat"] as const;

export const CHATGPT_ANDROID_SCHEMES = ["chatgpt"] as const;

const CHATGPT_WEB_ORIGIN = "https://chatgpt.com";

function encodePromptForUrl(prompt: string): string {
  return encodeURIComponent(prompt.trim());
}

function webChatUrl(prompt: string): string {
  return `${CHATGPT_WEB_ORIGIN}/?q=${encodePromptForUrl(prompt)}`;
}

/** Native deep links — app opens; user pastes prompt from clipboard. */
function nativeLaunchUrls(): string[] {
  if (Platform.OS === "ios") {
    return ["chatgpt://", "com.openai.chat://"];
  }
  if (Platform.OS === "android") {
    return ["chatgpt://", `android-app://${CHATGPT_ANDROID_PACKAGE}`];
  }
  return [];
}

async function openFirstAvailable(urls: readonly string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      const ok = await Linking.canOpenURL(url).catch(() => false);
      if (ok) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

async function tryOpenNativeApp(): Promise<boolean> {
  if (Platform.OS === "android") {
    try {
      await launchAndroidPackage(CHATGPT_ANDROID_PACKAGE);
      return true;
    } catch {
      /* fall through to scheme checks */
    }
  }

  return openFirstAvailable(nativeLaunchUrls());
}

/**
 * Copies the prompt to clipboard, then opens ChatGPT (native app when installed, else chatgpt.com).
 * Prompt is not sent to any Ideal Solutions backend.
 */
export async function openChatGPTWithPrompt(prompt: string): Promise<void> {
  const trimmed = prompt.trim();
  if (!trimmed) return;

  await Clipboard.setStringAsync(trimmed);

  const openedNative = await tryOpenNativeApp();
  if (openedNative) return;

  // Universal link / browser — may hand off to ChatGPT on some devices.
  await Linking.openURL(webChatUrl(trimmed));
}
