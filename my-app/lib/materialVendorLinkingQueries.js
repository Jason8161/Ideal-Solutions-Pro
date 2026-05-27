/**
 * Shared Android manifest + iOS Info.plist entries for material vendor app detection.
 * Sync with lib/materialNativeAppSuppliers.ts (Home Depot + Lowe's only).
 *
 * iOS 15+ caps LSApplicationQueriesSchemes at 50 — material native schemes are listed first.
 * Other suppliers are website-only (no canOpenURL / install probes).
 *
 * Tradeoff: trimming supply-house schemes frees quota for misc/AI plugins; Settings →
 * Enable Supplier Integrations only probes homedepot + lowes. ChatGPT etc. use
 * withAiAssistantLinkingQueries.js separately.
 */

/** @type {readonly string[]} */
const MATERIAL_RETAIL_IOS_SCHEMES = [
  "homedepot",
  "com.thehomedepot.homedepot",
  "lowes",
];

/** Website-only supply houses — no iOS query schemes (not used for canOpenURL). */
/** @type {readonly string[]} */
const MATERIAL_SUPPLY_HOUSE_IOS_SCHEMES = [];

/** @type {readonly string[]} */
const MATERIAL_VENDOR_ANDROID_PACKAGES = ["com.thehomedepot", "com.lowes.android"];

/** @type {readonly string[]} */
const MATERIAL_VENDOR_ANDROID_SCHEMES = [
  "homedepot",
  "com.thehomedepot.homedepot",
  "lowes",
];

/**
 * Misc integration schemes (sync with lib/integrations/miscCatalog.ts).
 * Passed as high-priority extras to buildIosQuerySchemes so canOpenURL works on iOS.
 */
/** @type {readonly string[]} */
const MISC_INTEGRATION_IOS_SCHEMES = [
  "dbapi-8",
  "dbapi-2",
  "dropbox",
  "googledrive",
  "googlegmail",
  "gmail",
  "slack",
  "msteams",
  "ms-outlook",
  "ms-outlook-shared",
  "onedrive",
  "ms-onedrive",
  "box",
  "boxapp",
  "zoomus",
  "intuitqb",
  "procore",
  "companycam",
  "buildertrend",
  "jobber",
  "servicetitan",
  "fieldwire",
  "asana",
  "trello",
  "notion",
  "smartsheet",
  "docusign",
  "docusignit",
  "acrobat",
  "adobereader",
  "hubspot",
  "ringcentral",
  "rcmobile",
  "googlecalendar",
  "evernote",
  "roblox",
  "minecraft",
  "clashofclans",
  "candycrushsaga",
  "codmobile",
  "callofduty",
  "pubgmobile",
  "fortnite",
  "xbox",
  "xboxapp",
  "playstation",
  "psapp",
  "steamlink",
  "steam",
  "pokemongo",
  "amongus",
  "innersloth",
];

/** @type {readonly string[]} */
const MISC_INTEGRATION_ANDROID_PACKAGES = [
  "com.dropbox.android",
  "com.google.android.apps.docs",
  "com.google.android.gm",
  "com.google.android.apps.maps",
  "com.google.android.calendar",
  "com.waze",
  "com.Slack",
  "com.microsoft.teams",
  "com.microsoft.office.outlook",
  "com.microsoft.skydrive",
  "com.box.android",
  "us.zoom.videomeetings",
  "com.intuit.quickbooks",
  "com.procore.activities",
  "com.companycam.companycam",
  "com.buildertrend.buildertrend",
  "com.getjobber.jobber",
  "com.servicetitan.mobile",
  "com.fieldwire.android",
  "com.asana.app",
  "com.trello",
  "notion.id",
  "com.smartsheet.android",
  "com.docusign.esign",
  "com.adobe.reader",
  "com.hubspot.android",
  "com.ringcentral.android",
  "com.evernote",
  "com.roblox.client",
  "com.mojang.minecraftpe",
  "com.supercell.clashofclans",
  "com.king.candycrushsaga",
  "com.activision.callofduty.shooter",
  "com.tencent.ig",
  "com.epicgames.fortnite",
  "com.microsoft.xboxone.smartglass",
  "com.scee.psxandroid",
  "com.valvesoftware.steamlink",
  "com.nianticlabs.pokemongo",
  "com.innersloth.spacemafia",
];

/** @type {readonly string[]} */
const MISC_INTEGRATION_ANDROID_SCHEMES = [
  "dbapi-8",
  "dbapi-2",
  "dropbox",
  "googledrive",
  "googlegmail",
  "gmail",
  "comgooglemaps",
  "googlemaps",
  "waze",
  "slack",
  "msteams",
  "ms-outlook",
  "onedrive",
  "box",
  "zoomus",
  "intuitqb",
  "procore",
  "companycam",
  "buildertrend",
  "jobber",
  "servicetitan",
  "fieldwire",
  "asana",
  "trello",
  "notion",
  "smartsheet",
  "docusign",
  "docusignit",
  "acrobat",
  "adobereader",
  "hubspot",
  "ringcentral",
  "rcmobile",
  "googlecalendar",
  "evernote",
  "roblox",
  "minecraft",
  "clashofclans",
  "candycrushsaga",
  "codmobile",
  "callofduty",
  "pubgmobile",
  "fortnite",
  "xbox",
  "xboxapp",
  "playstation",
  "psapp",
  "steamlink",
  "steam",
  "pokemongo",
  "amongus",
  "innersloth",
];

/** Lower-priority schemes (banking, social, maps, misc). */
/** @type {readonly string[]} */
const AI_ASSISTANT_IOS_SCHEMES = ["chatgpt", "com.openai.chat"];

/** @type {readonly string[]} */
const AI_ASSISTANT_ANDROID_PACKAGES = ["com.openai.chatgpt"];

/** @type {readonly string[]} */
const AI_ASSISTANT_ANDROID_SCHEMES = ["chatgpt"];

/** Lower-priority schemes (banking, social, maps, misc). */
/** @type {readonly string[]} */
const LOWER_PRIORITY_IOS_SCHEMES = [
  "comgooglemaps",
  "googlemaps",
  "maps",
  "waze",
  "youtube",
  "vnd.youtube",
  "spotify",
  "paypal",
  "venmo",
  "cashapp",
  "squarecash",
  "fb",
  "facebook",
  "instagram",
  "twitter",
  "x",
  "tiktok",
  "robinhood",
  "chase",
  "wellsfargo",
  "wf",
  "bankofamerica",
  "bofa",
  "capitalone",
  "schwab",
  "fidelity",
  "ally",
  "allybank",
  "citi",
  "citimobile",
  "discover",
  "pnc",
  "truist",
  "usbank",
  "td",
  "tdbank",
  "navyfederal",
  "nfcu",
  "regions",
  "fifththird",
  "huntington",
  "keybank",
  "citizens",
  "suntrust",
  "zelle",
  "stripe",
  "linkedin",
  "pinterest",
  "messenger",
  "whatsapp",
  "discord",
  "telegram",
  "tg",
  "draftkings",
  "fanduel",
  "betmgm",
  "weather",
  "accuweather",
];

const IOS_QUERY_SCHEME_LIMIT = 50;

/**
 * @param {readonly string[]} extraSchemes Misc-app schemes from miscAppsCatalog (optional).
 * @returns {string[]}
 */
function buildIosQuerySchemes(extraSchemes = []) {
  const priority = [
    ...MATERIAL_RETAIL_IOS_SCHEMES,
    ...MATERIAL_SUPPLY_HOUSE_IOS_SCHEMES,
    ...AI_ASSISTANT_IOS_SCHEMES,
    ...MISC_INTEGRATION_IOS_SCHEMES,
    ...extraSchemes,
    ...LOWER_PRIORITY_IOS_SCHEMES,
  ];
  const seen = new Set();
  const out = [];
  for (const raw of priority) {
    const scheme = String(raw).trim().toLowerCase();
    if (!scheme || seen.has(scheme)) continue;
    seen.add(scheme);
    out.push(scheme);
    if (out.length >= IOS_QUERY_SCHEME_LIMIT) break;
  }
  return out;
}

module.exports = {
  IOS_QUERY_SCHEME_LIMIT,
  MATERIAL_RETAIL_IOS_SCHEMES,
  MATERIAL_SUPPLY_HOUSE_IOS_SCHEMES,
  MISC_INTEGRATION_IOS_SCHEMES,
  MISC_INTEGRATION_ANDROID_PACKAGES,
  MISC_INTEGRATION_ANDROID_SCHEMES,
  AI_ASSISTANT_IOS_SCHEMES,
  AI_ASSISTANT_ANDROID_PACKAGES,
  AI_ASSISTANT_ANDROID_SCHEMES,
  MATERIAL_VENDOR_ANDROID_PACKAGES,
  MATERIAL_VENDOR_ANDROID_SCHEMES,
  LOWER_PRIORITY_IOS_SCHEMES,
  buildIosQuerySchemes,
};
