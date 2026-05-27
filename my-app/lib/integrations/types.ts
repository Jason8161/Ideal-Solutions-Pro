import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type MiscIntegrationCategory = "work" | "games";

export type MiscIntegrationId =
  | "dropbox"
  | "google_drive"
  | "gmail"
  | "google_maps"
  | "waze"
  | "slack"
  | "microsoft_teams"
  | "outlook"
  | "onedrive"
  | "box"
  | "apple_maps"
  | "zoom"
  | "quickbooks"
  | "procore"
  | "companycam"
  | "buildertrend"
  | "jobber"
  | "servicetitan"
  | "fieldwire"
  | "asana"
  | "trello"
  | "notion"
  | "smartsheet"
  | "docusign"
  | "adobe_acrobat"
  | "hubspot"
  | "ringcentral"
  | "google_calendar"
  | "evernote"
  | "roblox"
  | "minecraft"
  | "clash_of_clans"
  | "candy_crush"
  | "call_of_duty_mobile"
  | "pubg_mobile"
  | "fortnite"
  | "xbox"
  | "playstation"
  | "steam_link"
  | "pokemon_go"
  | "among_us";

export type MiscIntegrationDefinition = {
  id: MiscIntegrationId;
  name: string;
  category: MiscIntegrationCategory;
  icon: MciName;
  /** Primary iOS scheme for LSApplicationQueriesSchemes. */
  iosScheme: string;
  /** URLs probed with canOpenURL only — never enumerates installed apps. */
  appSchemeUrls: readonly string[];
  website: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
};

export type MiscCatalogFilter = "all" | "work" | "games";
