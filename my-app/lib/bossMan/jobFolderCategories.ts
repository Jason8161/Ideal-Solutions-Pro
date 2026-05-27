import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  BOSS_MAN_MENU_ITEMS,
  type BossManMenuItem,
} from "@/lib/bossMan/bossManMenuItems";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type JobFolderCategoryId = "materials" | "jobs-estimates" | "employees";

export type JobFolderCategory = {
  id: JobFolderCategoryId;
  label: string;
  subtitle: string;
  icon: MciName;
  menuKeys: readonly string[];
};

/** Top-level Job Folder hubs — each opens a sub-menu of command-center tiles. */
export const JOB_FOLDER_CATEGORIES: readonly JobFolderCategory[] = [
  {
    id: "materials",
    label: "Materials",
    subtitle: "Lists, vendor lookup, and pricing",
    icon: "clipboard-pulse",
    menuKeys: ["material-list", "materials"],
  },
  {
    id: "jobs-estimates",
    label: "Jobs & Estimates",
    subtitle: "Jobs, quotes, billing, customers, and photos",
    icon: "hammer-wrench",
    menuKeys: [
      "current-jobs",
      "completed-jobs",
      "estimates",
      "service-calls",
      "invoices",
      "customers",
      "job-photos",
    ],
  },
  {
    id: "employees",
    label: "Employees",
    subtitle: "My crew, schedule dispatch, time, and payroll",
    icon: "account-hard-hat",
    menuKeys: ["crew-dispatch", "schedule-dispatch", "time-payroll"],
  },
] as const;

const CATEGORY_BY_ID = new Map(JOB_FOLDER_CATEGORIES.map((c) => [c.id, c]));

const MENU_KEY_TO_CATEGORY = new Map<string, JobFolderCategoryId>();
for (const category of JOB_FOLDER_CATEGORIES) {
  for (const key of category.menuKeys) {
    MENU_KEY_TO_CATEGORY.set(key, category.id);
  }
}

export function isJobFolderCategoryId(value: string): value is JobFolderCategoryId {
  return CATEGORY_BY_ID.has(value as JobFolderCategoryId);
}

export function getJobFolderCategory(id: JobFolderCategoryId): JobFolderCategory {
  const hit = CATEGORY_BY_ID.get(id);
  if (!hit) throw new Error(`Unknown Job Folder category: ${id}`);
  return hit;
}

export function jobFolderHubHref(categoryId: JobFolderCategoryId): Href {
  return `/job-folder/hub/${categoryId}` as Href;
}

export function jobFolderCategoryForMenuKey(key: string): JobFolderCategoryId | null {
  return MENU_KEY_TO_CATEGORY.get(key) ?? null;
}

/** Back target for a tile — category sub-hub, or main Job Folder index. */
export function jobFolderHubBackHrefForMenuKey(key: string): Href {
  const categoryId = jobFolderCategoryForMenuKey(key);
  return categoryId ? jobFolderHubHref(categoryId) : ("/job-folder/boss-man" as Href);
}

export function getMenuItemsForCategory(categoryId: JobFolderCategoryId): BossManMenuItem[] {
  const keys = new Set(getJobFolderCategory(categoryId).menuKeys);
  return BOSS_MAN_MENU_ITEMS.filter((item) => keys.has(item.key));
}
