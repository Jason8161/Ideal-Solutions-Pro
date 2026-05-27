import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking, Platform, Share } from "react-native";

import { loadCompanyProfile } from "@/lib/profileStorage";

const LINKS_STORAGE_KEY = "ideal_employee_app_store_links_v1";

export type EmployeeAppStoreLinks = {
  iosStoreUrl: string;
  androidStoreUrl: string;
};

export type EmployeeInviteRecipient = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
};

export type EmployeeInviteContext = {
  companyName: string;
  employerPhone: string;
  employerEmail: string;
  links: EmployeeAppStoreLinks;
};

function trimUrl(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Env overrides (EAS / .env); device storage fills gaps for owner-configured links later. */
export async function resolveEmployeeAppStoreLinks(): Promise<EmployeeAppStoreLinks> {
  let iosStoreUrl = trimUrl(process.env.EXPO_PUBLIC_EMPLOYEE_APP_IOS_URL);
  let androidStoreUrl = trimUrl(process.env.EXPO_PUBLIC_EMPLOYEE_APP_ANDROID_URL);

  try {
    const raw = await AsyncStorage.getItem(LINKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EmployeeAppStoreLinks>;
      if (!iosStoreUrl && typeof parsed.iosStoreUrl === "string") {
        iosStoreUrl = parsed.iosStoreUrl.trim();
      }
      if (!androidStoreUrl && typeof parsed.androidStoreUrl === "string") {
        androidStoreUrl = parsed.androidStoreUrl.trim();
      }
    }
  } catch {
    // ignore corrupt storage
  }

  return { iosStoreUrl, androidStoreUrl };
}

export async function saveEmployeeAppStoreLinks(links: EmployeeAppStoreLinks): Promise<void> {
  await AsyncStorage.setItem(
    LINKS_STORAGE_KEY,
    JSON.stringify({
      iosStoreUrl: links.iosStoreUrl.trim(),
      androidStoreUrl: links.androidStoreUrl.trim(),
    }),
  );
}

export async function loadEmployeeInviteContext(): Promise<EmployeeInviteContext> {
  const profile = await loadCompanyProfile();
  const links = await resolveEmployeeAppStoreLinks();
  return {
    companyName: (profile?.companyName ?? "").trim(),
    employerPhone: (profile?.phoneNumber ?? profile?.mobilePhone ?? "").trim(),
    employerEmail: (profile?.supportEmail ?? "").trim(),
    links,
  };
}

export function employeeInviteDisplayName(recipient: EmployeeInviteRecipient): string {
  const name = [recipient.firstName?.trim(), recipient.lastName?.trim()].filter(Boolean).join(" ");
  return name;
}

function installInstructions(links: EmployeeAppStoreLinks, companyName: string): string[] {
  const lines: string[] = ["Install the Ideal Solutions Pro employee app on your phone:"];
  if (links.iosStoreUrl) {
    lines.push(`iPhone (App Store): ${links.iosStoreUrl}`);
  }
  if (links.androidStoreUrl) {
    lines.push(`Android (Google Play): ${links.androidStoreUrl}`);
  }
  if (!links.iosStoreUrl && !links.androidStoreUrl) {
    const employer = companyName || "your employer";
    lines.push(
      `Download links are not set up yet — contact ${employer} for the App Store or Google Play link.`,
    );
  }
  return lines;
}

export type EmployeeInviteExtras = {
  inviteCode?: string;
  inviteLink?: string;
};

export function buildEmployeeAppInviteMessage(
  recipient: EmployeeInviteRecipient,
  context: EmployeeInviteContext,
  extras?: EmployeeInviteExtras,
): string {
  const company = context.companyName || "Your employer";
  const displayName = employeeInviteDisplayName(recipient);
  const greeting = displayName ? `Hi ${displayName},` : "Hi,";

  const lines = [
    greeting,
    "",
    `${company} uses the Ideal Solutions Pro employee app for crew tools, schedules, and field work.`,
    "",
    ...installInstructions(context.links, context.companyName),
    "",
    extras?.inviteCode
      ? `Your invite code: ${extras.inviteCode}`
      : "Sign in with the contact info your employer has on file for you.",
    extras?.inviteLink ? `Or open: ${extras.inviteLink}` : "",
    extras?.inviteCode
      ? "In the app: Employee → Enter invite code."
      : "",
    "",
    context.employerPhone ? `Questions? Call ${context.employerPhone}` : "",
    context.employerEmail ? `Email: ${context.employerEmail}` : "",
    "",
    "— Sent via Ideal Solutions Pro",
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildEmployeeAppInviteMailtoUrl(
  recipient: EmployeeInviteRecipient,
  context: EmployeeInviteContext,
): string {
  const company = context.companyName || "Ideal Solutions Pro";
  const subject = encodeURIComponent(`Install the ${company} employee app`);
  const body = encodeURIComponent(buildEmployeeAppInviteMessage(recipient, context));
  const to = encodeURIComponent((recipient.email ?? "").trim());
  return to ? `mailto:${to}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
}

export function buildEmployeeAppInviteSmsUrl(
  recipient: EmployeeInviteRecipient,
  context: EmployeeInviteContext,
): string {
  const body = encodeURIComponent(buildEmployeeAppInviteMessage(recipient, context));
  const digits = (recipient.phone ?? "").replace(/[^\d+]/g, "");
  return digits ? `sms:${digits}?body=${body}` : `sms:?body=${body}`;
}

async function shareGenericInvite(message: string): Promise<void> {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: "Employee app invite", text: message });
    return;
  }
  await Share.share({ title: "Employee app invite", message });
}

export async function openEmployeeAppInviteEmail(recipient: EmployeeInviteRecipient): Promise<void> {
  const context = await loadEmployeeInviteContext();
  const mailto = buildEmployeeAppInviteMailtoUrl(recipient, context);
  if (await Linking.canOpenURL(mailto)) {
    await Linking.openURL(mailto);
    return;
  }
  await shareGenericInvite(buildEmployeeAppInviteMessage(recipient, context));
}

export async function openEmployeeAppInviteSms(recipient: EmployeeInviteRecipient): Promise<void> {
  const context = await loadEmployeeInviteContext();
  const sms = buildEmployeeAppInviteSmsUrl(recipient, context);
  if (Platform.OS !== "web" && (await Linking.canOpenURL(sms))) {
    await Linking.openURL(sms);
    return;
  }
  await shareGenericInvite(buildEmployeeAppInviteMessage(recipient, context));
}

export async function shareEmployeeAppInvite(recipient: EmployeeInviteRecipient): Promise<void> {
  const context = await loadEmployeeInviteContext();
  await shareGenericInvite(buildEmployeeAppInviteMessage(recipient, context));
}

export function showEmployeeAppInviteMenu(recipient: EmployeeInviteRecipient): void {
  const hasPhone = !!(recipient.phone ?? "").trim();
  const hasEmail = !!(recipient.email ?? "").trim();
  const hint =
    !hasPhone && !hasEmail
      ? "Add a phone or email above to pre-fill the message, or use Share to pick an app."
      : "Send install instructions for the Ideal Solutions Pro employee app.";

  Alert.alert("Invite to employee app", hint, [
    { text: "Cancel", style: "cancel" },
    {
      text: hasPhone ? "Send by text" : "Send by text (no number)",
      onPress: () => void openEmployeeAppInviteSms(recipient),
    },
    {
      text: hasEmail ? "Send by email" : "Send by email (no address)",
      onPress: () => void openEmployeeAppInviteEmail(recipient),
    },
    { text: "Share…", onPress: () => void shareEmployeeAppInvite(recipient) },
  ]);
}
