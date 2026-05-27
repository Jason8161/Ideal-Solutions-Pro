import { Linking } from "react-native";

import { priorityLabel } from "@/lib/customerServiceRequest";
import type { RemoteServiceRequest } from "@/lib/serviceRequestApi";

function customerPhone(req: RemoteServiceRequest): string {
  return req.phone.trim();
}

function customerEmail(req: RemoteServiceRequest): string {
  return req.email.trim();
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function buildServiceRequestResponseSmsBody(req: RemoteServiceRequest): string {
  const name = req.customerName.trim() || "there";
  const lines = [
    `Hi ${name},`,
    "",
    "Thanks for your service request. We received it and will follow up shortly.",
    req.description.trim() ? `Re: ${truncate(req.description, 120)}` : "",
    "",
    "— Sent via Ideal Solutions Pro",
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildServiceRequestResponseEmailBody(req: RemoteServiceRequest): string {
  const name = req.customerName.trim() || "there";
  const lines = [
    `Hi ${name},`,
    "",
    "Thank you for submitting a service request. We received your message and will follow up shortly.",
    "",
    req.description.trim() ? `Your request: ${req.description.trim()}` : "",
    req.serviceAddress.trim() ? `Service address: ${req.serviceAddress.trim()}` : "",
    req.bestTimeToContact.trim() ? `Best time to contact: ${req.bestTimeToContact.trim()}` : "",
    req.priority !== "normal" ? `Priority: ${priorityLabel(req.priority)}` : "",
    "",
    "— Sent via Ideal Solutions Pro",
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildServiceRequestResponseSmsUrl(req: RemoteServiceRequest): string | null {
  const digits = customerPhone(req).replace(/[^\d+]/g, "");
  if (!digits) return null;
  const body = encodeURIComponent(buildServiceRequestResponseSmsBody(req));
  return `sms:${digits}?body=${body}`;
}

export function buildServiceRequestResponseMailtoUrl(req: RemoteServiceRequest): string | null {
  const to = customerEmail(req);
  if (!to) return null;
  const customer = req.customerName.trim() || "Customer";
  const subject = encodeURIComponent(`Re: Your service request — ${customer}`);
  const body = encodeURIComponent(buildServiceRequestResponseEmailBody(req));
  return `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
}

export async function openServiceRequestResponseSms(req: RemoteServiceRequest): Promise<boolean> {
  const url = buildServiceRequestResponseSmsUrl(req);
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}

export async function openServiceRequestResponseEmail(req: RemoteServiceRequest): Promise<boolean> {
  const url = buildServiceRequestResponseMailtoUrl(req);
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}
