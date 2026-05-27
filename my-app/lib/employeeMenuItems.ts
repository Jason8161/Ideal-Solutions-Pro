import type { Href } from "expo-router";

import type { AppFeature } from "@/lib/permissions/roleAccess";

export type EmployeeMenuItem = {
  key: string;
  label: string;
  hint: string;
  href: Href;
  feature: AppFeature;
  primary?: boolean;
};

/** Employee home dashboard tiles (Phase 1 — routes reuse boss modules where gated). */
export const EMPLOYEE_MENU_ITEMS: EmployeeMenuItem[] = [
  {
    key: "clock",
    label: "Clock",
    hint: "GPS-verified time clock",
    href: "/employee/clock" as Href,
    feature: "employee_clock",
    primary: true,
  },
  {
    key: "schedule",
    label: "Schedule",
    hint: "Your assigned shifts",
    href: "/job-folder/schedule" as Href,
    feature: "employee_schedule",
  },
  {
    key: "messages",
    label: "Messages",
    hint: "Team chat",
    href: "/employee/messages" as Href,
    feature: "employee_messages",
  },
  {
    key: "jobs",
    label: "Jobs",
    hint: "Assigned work",
    href: "/job-folder/current-jobs" as Href,
    feature: "employee_jobs",
  },
  {
    key: "photos",
    label: "Photos",
    hint: "Job site photos",
    href: "/job-folder/job-photos" as Href,
    feature: "employee_photos",
  },
  {
    key: "tasks",
    label: "Tasks",
    hint: "Open jobs and notes",
    href: "/job-folder/current-jobs" as Href,
    feature: "employee_tasks",
  },
  {
    key: "ai",
    label: "AI Assistant",
    hint: "Limited field tools",
    href: "/employee/ai-assistant" as Href,
    feature: "employee_ai",
  },
  {
    key: "profile",
    label: "Profile",
    hint: "Your contact info",
    href: "/settings/user-info" as Href,
    feature: "employee_profile",
  },
  {
    key: "time-off",
    label: "Time off",
    hint: "Request time off (Phase 2)",
    href: "/employee/time-off" as Href,
    feature: "employee_time_off",
  },
  {
    key: "material",
    label: "Material request",
    hint: "Request materials for a job",
    href: "/employee/ai-assistant/material-request" as Href,
    feature: "employee_material_request",
  },
  {
    key: "daily-notes",
    label: "Daily notes",
    hint: "Field notes (Phase 2)",
    href: "/employee/daily-notes" as Href,
    feature: "employee_daily_notes",
  },
];
