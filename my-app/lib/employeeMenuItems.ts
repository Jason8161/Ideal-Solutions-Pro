import type { Href } from "expo-router";

import type { AppFeature } from "@/lib/permissions/roleAccess";

/**
 * @deprecated Use EMPLOYEE_HOME_MENU_ITEMS from lib/homeMenuItems.ts for the employee portal home grid.
 * Kept for feature-key mapping in legacy permission checks.
 */
export type EmployeeMenuItem = {
  key: string;
  label: string;
  hint: string;
  href: Href;
  feature: AppFeature;
  primary?: boolean;
};

/** Six employee home sections — aligned with EMPLOYEE_HOME_MENU_ITEMS routes. */
export const EMPLOYEE_MENU_ITEMS: EmployeeMenuItem[] = [
  {
    key: "ideal-assistant",
    label: "Ideal Assistant",
    hint: "Field AI on company plan limits",
    href: "/employee/ai-assistant" as Href,
    feature: "employee_ai",
    primary: true,
  },
  {
    key: "job-folder",
    label: "Job Folder",
    hint: "Assigned jobs — read only",
    href: "/job-folder/current-jobs" as Href,
    feature: "employee_jobs",
  },
  {
    key: "schedule",
    label: "Schedule",
    hint: "Your shifts — read only",
    href: "/job-folder/schedule" as Href,
    feature: "employee_schedule",
  },
  {
    key: "calendar",
    label: "Calendar",
    hint: "Company events & reminders",
    href: "/calendar" as Href,
    feature: "employee_dashboard",
  },
  {
    key: "social-media",
    label: "Social Media",
    hint: "Posting tools",
    href: "/employee" as Href,
    feature: "employee_dashboard",
  },
  {
    key: "time-hours",
    label: "Time / Hours",
    hint: "Clock, timesheets, time off",
    href: "/employee/clock" as Href,
    feature: "employee_clock",
  },
];
