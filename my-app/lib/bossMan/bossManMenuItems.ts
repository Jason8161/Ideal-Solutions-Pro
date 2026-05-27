import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type BossManMenuItem = {
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: MciName;
};

/** Job Folder command center tiles (grouped by category hubs). */
export const BOSS_MAN_MENU_ITEMS: readonly BossManMenuItem[] = [
  {
    key: "current-jobs",
    label: "Current Jobs",
    subtitle: "Active work — status, notes, photos, billing",
    href: "/job-folder/current-jobs",
    icon: "hammer-wrench",
  },
  {
    key: "completed-jobs",
    label: "Completed Jobs",
    subtitle: "Finished jobs, payment, and history",
    href: "/job-folder/completed-jobs",
    icon: "check-decagram",
  },
  {
    key: "estimates",
    label: "Create / Edit Estimates",
    subtitle: "Quick templates, saved quotes, convert to job",
    href: "/job-folder/estimates",
    icon: "file-document-edit",
  },
  {
    key: "service-calls",
    label: "Service Calls",
    subtitle: "Current calls, scheduling, and completed work",
    href: "/service-calls",
    icon: "phone-in-talk",
  },
  {
    key: "invoices",
    label: "Invoices",
    subtitle: "Create, send, track payments, PDF export",
    href: "/job-folder/invoices",
    icon: "receipt",
  },
  {
    key: "customers",
    label: "Customers",
    subtitle: "Directory for jobs, estimates, and service calls",
    href: "/job-folder/customers",
    icon: "account-group",
  },
  {
    key: "job-photos",
    label: "Job Photos",
    subtitle: "Photos from all jobs",
    href: "/job-folder/job-photos",
    icon: "camera",
  },
  {
    key: "material-list",
    label: "Material Lists",
    subtitle: "Saved lines, pricing, and email lists",
    href: "/material-list",
    icon: "clipboard-pulse",
  },
  {
    key: "time-payroll",
    label: "Time & Payroll",
    subtitle: "Clock in/out, job hours, and payroll summaries",
    href: "/job-folder/time-payroll",
    icon: "clock-outline",
  },
  {
    key: "crew-dispatch",
    label: "My Crew",
    subtitle: "Current employees on your crew",
    href: "/job-folder/crew",
    icon: "account-group",
  },
  {
    key: "schedule-dispatch",
    label: "Schedule Dispatch",
    subtitle: "Assign crews to jobs, calendar lookahead, and dispatch board",
    href: "/job-folder/schedule",
    icon: "calendar-clock",
  },
  {
    key: "materials",
    label: "Supplier Hub",
    subtitle: "Open supplier apps and websites",
    href: "/materials-search",
    icon: "resistor",
  },
];
