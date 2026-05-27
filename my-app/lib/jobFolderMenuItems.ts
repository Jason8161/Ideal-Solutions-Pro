import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type JobFolderMenuItem = {
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: MciName;
};

/** Job-folder hub tiles (moved off the home screen). */
export const JOB_FOLDER_MENU_ITEMS: readonly JobFolderMenuItem[] = [
  {
    key: "materials",
    label: "Supplier Hub",
    subtitle: "Open supplier apps and websites",
    href: "/materials-search",
    icon: "resistor",
  },
  {
    key: "material-list",
    label: "Material List",
    subtitle: "Saved lines, pricing, and email lists",
    href: "/material-list",
    icon: "clipboard-pulse",
  },
  {
    key: "service-calls",
    label: "Service Calls",
    subtitle: "Current calls, new requests, and completed work",
    href: "/service-calls",
    icon: "phone-in-talk",
  },
  {
    key: "estimates",
    label: "Estimates",
    subtitle: "Quotes, PDF invoices, and customer accept links",
    href: "/estimates",
    icon: "gauge",
  },
];
