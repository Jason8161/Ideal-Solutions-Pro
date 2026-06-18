import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ImageSource } from "expo-image";
import type { ComponentProps } from "react";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type HomeMenuItem = {
  key: string;
  label: string;
  /** Optional subtitle for accessibility hints elsewhere (not shown on home tiles). */
  subtitle?: string;
  href?: string;
  icon: MciName;
  /** Bundled tile art (SVG or raster; expo-image). */
  image?: number | ImageSource;
  /** When true, `accentColor` is applied as `tintColor` (template / single-channel artwork). */
  imageMonochrome?: boolean;
  /** Show bundled/override tile art even when {@link HOME_MENU_SHOW_TILE_IMAGES} is false. */
  alwaysShowTileImage?: boolean;
};

/** `ideal-solutions-pro-button.png` intrinsic width ÷ height (1024×516). */
export const HOME_AI_ASSISTANCE_TILE_ASPECT_RATIO = 1024 / 516;

/** Whether this home tile should render raster art (global flag or per-item override). */
export function homeMenuItemShowsTileImage(item: HomeMenuItem): boolean {
  return HOME_MENU_SHOW_TILE_IMAGES || item.alwaysShowTileImage === true;
}

/** Primary home tiles: label, route (if wired), icon fallback, optional raster/vector `image`. */
export const HOME_MENU_ITEMS: readonly HomeMenuItem[] = [
  {
    key: "ai-assistance",
    label: "Ideal Solutions Pro AI Assistance",
    subtitle: "Estimates, materials, codes & jobsite help",
    href: "/ai-assistance",
    icon: "robot-industrial",
    image: require("@/assets/images/ideal-solutions-pro-button.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "todo",
    label: "Accountant/Billing",
    icon: "calculator-variant",
    image: require("@/assets/images/home-todo.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "job-folder",
    label: "Job Folder",
    icon: "folder-wrench",
    image: require("@/assets/images/home-job-folder.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: "calendar-clock",
    image: require("@/assets/images/home-calendar.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "getting-paid",
    label: "Getting Paid",
    subtitle: "Accept payments — Cash App, Venmo, Square",
    href: "/getting-paid",
    icon: "cash-multiple",
    image: require("@/assets/images/home-getting-paid.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "misc-apps",
    label: "Misc Apps",
    subtitle: "Dropbox, Drive, Gmail, Maps & Waze",
    href: "/misc-apps",
    icon: "view-grid-plus",
    image: require("@/assets/images/home-misc-apps.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
];

/** Social tile on home (no route); opens the social media picker. */
export const HOME_SOCIAL_MEDIA_TILE: HomeMenuItem = {
  key: "social-media",
  label: "Social media",
  icon: "share-variant",
  image: require("@/assets/images/home-social-media.png"),
  imageMonochrome: false,
  alwaysShowTileImage: true,
};

/** All home tiles that support a custom image override (main menu + social). */
export const HOME_TILES_WITH_CUSTOM_IMAGES: readonly HomeMenuItem[] = [...HOME_MENU_ITEMS, HOME_SOCIAL_MEDIA_TILE];

/** When false, home tiles show only an icon fallback (no bundled PNGs or saved overrides). */
export const HOME_MENU_SHOW_TILE_IMAGES = false;

/** Employee portal home — seven sections (no boss mirrors). */
export const EMPLOYEE_HOME_MENU_ITEMS: readonly HomeMenuItem[] = [
  {
    key: "ideal-assistant",
    label: "Ideal Assistant",
    subtitle: "Field AI — counts against company plan",
    href: "/employee/ai-assistant",
    icon: "robot-industrial",
    image: require("@/assets/images/ideal-solutions-pro-button.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "job-folder",
    label: "Job Folder",
    subtitle: "Assigned jobs — read only",
    href: "/job-folder/current-jobs",
    icon: "folder-wrench",
    image: require("@/assets/images/home-job-folder.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "schedule",
    label: "Schedule",
    subtitle: "Your shifts — read only",
    href: "/job-folder/schedule",
    icon: "calendar-clock",
    image: require("@/assets/images/home-calendar.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "calendar",
    label: "Calendar",
    subtitle: "Company events & personal reminders",
    href: "/calendar",
    icon: "calendar",
    image: require("@/assets/images/home-calendar.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "social-media",
    label: "Social Media",
    subtitle: "Post to company accounts",
    icon: "share-variant",
    image: require("@/assets/images/home-social-media.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "time-hours",
    label: "Time / Hours",
    subtitle: "Clock in/out, timesheets, time off",
    href: "/employee/clock",
    icon: "clock-outline",
    image: require("@/assets/images/home-getting-paid.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
  {
    key: "field-tools",
    label: "Field Tools",
    subtitle: "Photos, materials, safety, and field utilities",
    href: "/employee/field-tools",
    icon: "hammer-wrench",
    image: require("@/assets/images/home-misc-apps.png"),
    imageMonochrome: false,
    alwaysShowTileImage: true,
  },
];

export type HomeButtonKey = (typeof HOME_MENU_ITEMS)[number]["key"];
export type HomeTileImageKey = (typeof HOME_TILES_WITH_CUSTOM_IMAGES)[number]["key"];
