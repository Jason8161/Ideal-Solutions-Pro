import { Alert, Linking, Platform, Share } from "react-native";

import type { BossJob } from "@/lib/bossMan/types";
import { employeeDisplayName } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import { loadCompanyProfile } from "@/lib/profileStorage";

import { formatDayLabel, formatTime12h } from "./dateUtils";
import type { ScheduleAssignment } from "./types";
import { markScheduleAssignmentSent } from "./scheduleStorage";

export type DispatchContact = {
  companyName: string;
  phone: string;
  email: string;
};

export async function loadDispatchContact(): Promise<DispatchContact | null> {
  const profile = await loadCompanyProfile();
  if (!profile) return null;
  return {
    companyName: (profile.companyName ?? "").trim(),
    phone: (profile.phoneNumber ?? profile.mobilePhone ?? "").trim(),
    email: (profile.supportEmail ?? "").trim(),
  };
}

export function buildDispatchMessage(
  assignment: ScheduleAssignment,
  job: BossJob,
  employees: Employee[],
  contact: DispatchContact,
): string {
  const crew = employees
    .filter((e) => assignment.employeeIds.includes(e.id))
    .map((e) => employeeDisplayName(e))
    .join(", ");
  const lines = [
    `${contact.companyName || "Job assignment"}`,
    "",
    `Job: ${job.jobName.trim() || job.customerName.trim() || "Job"}`,
    job.address.trim() ? `Address: ${job.address.trim()}` : "",
    `Date: ${formatDayLabel(assignment.date)}`,
    `Start: ${formatTime12h(assignment.startTime)}${assignment.endTime ? ` – ${formatTime12h(assignment.endTime)}` : ""}`,
    crew ? `Crew: ${crew}` : "Crew: (not assigned)",
    assignment.notes?.trim() ? `\nJob notes:\n${assignment.notes.trim()}` : "",
    assignment.materialsNotes?.trim()
      ? `\nMaterials / tools:\n${assignment.materialsNotes.trim()}`
      : "",
    job.notes.length > 0
      ? `\nFolder notes: ${job.notes[job.notes.length - 1]?.text ?? ""}`
      : "",
    "",
    contact.phone ? `Contact phone: ${contact.phone}` : "",
    contact.email ? `Contact email: ${contact.email}` : "",
    "",
    "— Sent via Ideal Solutions Pro",
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildDispatchMailtoUrl(
  message: string,
  recipientEmail?: string,
  subject?: string,
): string {
  const subj = encodeURIComponent(subject ?? "Job assignment");
  const body = encodeURIComponent(message);
  const to = encodeURIComponent((recipientEmail ?? "").trim());
  return to ? `mailto:${to}?subject=${subj}&body=${body}` : `mailto:?subject=${subj}&body=${body}`;
}

export function buildDispatchSmsUrl(message: string, recipientPhone?: string): string {
  const body = encodeURIComponent(message);
  const digits = (recipientPhone ?? "").replace(/[^\d+]/g, "");
  return digits ? `sms:${digits}?body=${body}` : `sms:?body=${body}`;
}

async function shareGenericMessage(message: string): Promise<void> {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: "Job assignment", text: message });
    return;
  }
  await Share.share({ title: "Job assignment", message });
}

export async function openDispatchEmail(
  message: string,
  options?: { recipientEmail?: string; subject?: string },
): Promise<boolean> {
  const mailto = buildDispatchMailtoUrl(message, options?.recipientEmail, options?.subject);
  if (await Linking.canOpenURL(mailto)) {
    await Linking.openURL(mailto);
    return true;
  }
  await shareGenericMessage(message);
  return false;
}

export async function openDispatchSms(
  message: string,
  options?: { recipientPhone?: string },
): Promise<boolean> {
  const sms = buildDispatchSmsUrl(message, options?.recipientPhone);
  if (Platform.OS !== "web" && (await Linking.canOpenURL(sms))) {
    await Linking.openURL(sms);
    return true;
  }
  await shareGenericMessage(message);
  return false;
}

export async function shareDispatchAssignment(message: string): Promise<void> {
  await shareGenericMessage(message);
}

export async function sendDispatchAndMarkSent(
  assignmentId: string,
  channel: "sms" | "email" | "share",
  message: string,
  options?: { recipientEmail?: string; recipientPhone?: string; subject?: string },
): Promise<void> {
  if (channel === "email") {
    await openDispatchEmail(message, {
      recipientEmail: options?.recipientEmail,
      subject: options?.subject,
    });
  } else if (channel === "sms") {
    await openDispatchSms(message, { recipientPhone: options?.recipientPhone });
  } else {
    await shareDispatchAssignment(message);
  }
  await markScheduleAssignmentSent(assignmentId);
}

export async function dispatchWithContactCheck(
  assignmentId: string,
  channel: "sms" | "email" | "share",
  buildMessage: (contact: DispatchContact) => string,
  options?: { recipientEmail?: string; recipientPhone?: string },
): Promise<void> {
  const contact = await loadDispatchContact();
  if (!contact) {
    Alert.alert(
      "Company profile needed",
      "Complete Settings → User info with company name and contact details.",
    );
    return;
  }
  const message = buildMessage(contact);
  const subject = `Job assignment — ${contact.companyName || "Ideal Solutions Pro"}`;
  await sendDispatchAndMarkSent(assignmentId, channel, message, {
    ...options,
    subject,
  });
}
