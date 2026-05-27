import { Platform } from "react-native";

/** Curated third-party apps — iOS cannot enumerate all installed apps; Android can add any launcher app. */
export type MiscAppCategory =
  | "stocks"
  | "news"
  | "weather"
  | "maps"
  | "utilities"
  | "games"
  | "casino"
  | "social"
  | "entertainment"
  | "finance";

export type MiscAppId =
  | "robinhood"
  | "yahoo_finance"
  | "fidelity"
  | "etrade"
  | "schwab"
  | "fox_news"
  | "cnn"
  | "msnbc"
  | "nytimes"
  | "bbc_news"
  | "weather_channel"
  | "accuweather"
  | "wunderground"
  | "google_maps"
  | "apple_maps"
  | "waze"
  | "bloomberg"
  | "reuters"
  | "draftkings"
  | "fanduel"
  | "betmgm"
  | "caesars_sportsbook"
  | "youtube"
  | "spotify"
  | "netflix"
  | "twitch"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "x_twitter"
  | "discord"
  | "whatsapp"
  | "telegram"
  | "paypal"
  | "venmo"
  | "cash_app"
  | "roblox"
  | "minecraft"
  | "clash_of_clans"
  | "candy_crush"
  | "calculator_web";

export type MiscAppDefinition = {
  id: MiscAppId;
  name: string;
  category: MiscAppCategory;
  /** MaterialCommunityIcons glyph key — see miscAppIcon.tsx */
  icon:
    | "chart-line"
    | "newspaper"
    | "weather-partly-cloudy"
    | "map"
    | "calculator"
    | "gamepad"
    | "casino"
    | "social"
    | "entertainment"
    | "finance";
  /** Primary scheme for LSApplicationQueriesSchemes (iOS). */
  scheme: string;
  nativeUrls: readonly string[];
  iosStoreUrl: string;
  androidStoreUrl: string;
  webUrl: string;
};

export const MISC_APP_CATEGORY_LABELS: Record<MiscAppCategory, string> = {
  stocks: "Stocks & finance",
  news: "News",
  weather: "Weather",
  maps: "Maps & navigation",
  utilities: "Utilities",
  games: "Games",
  casino: "Casino & sportsbook",
  social: "Social",
  entertainment: "Streaming & video",
  finance: "Payments & wallet",
};

export const MISC_APPS_CATALOG: readonly MiscAppDefinition[] = [
  {
    id: "robinhood",
    name: "Robinhood",
    category: "stocks",
    icon: "chart-line",
    scheme: "robinhood",
    nativeUrls: ["robinhood://"],
    iosStoreUrl: "https://apps.apple.com/us/app/robinhood/id938003185",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.robinhood.android",
    webUrl: "https://robinhood.com/",
  },
  {
    id: "yahoo_finance",
    name: "Yahoo Finance",
    category: "stocks",
    icon: "chart-line",
    scheme: "yfinance",
    nativeUrls: ["yfinance://", "yahoo://"],
    iosStoreUrl: "https://apps.apple.com/us/app/yahoo-finance/id328412701",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.yahoo.mobile.client.android.finance",
    webUrl: "https://finance.yahoo.com/",
  },
  {
    id: "fidelity",
    name: "Fidelity",
    category: "stocks",
    icon: "chart-line",
    scheme: "fidelity",
    nativeUrls: ["fidelity://"],
    iosStoreUrl: "https://apps.apple.com/us/app/fidelity-investments/id348177453",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.fidelity.android",
    webUrl: "https://www.fidelity.com/",
  },
  {
    id: "etrade",
    name: "E*TRADE",
    category: "stocks",
    icon: "chart-line",
    scheme: "etrade",
    nativeUrls: ["etrade://", "etrademobile://"],
    iosStoreUrl: "https://apps.apple.com/us/app/etrade/id313259932",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.etrade.mobilepro.activity",
    webUrl: "https://www.etrade.com/",
  },
  {
    id: "schwab",
    name: "Schwab",
    category: "stocks",
    icon: "chart-line",
    scheme: "schwab",
    nativeUrls: ["schwab://"],
    iosStoreUrl: "https://apps.apple.com/us/app/schwab-mobile/id303191318",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.schwab.mobile",
    webUrl: "https://www.schwab.com/",
  },
  {
    id: "bloomberg",
    name: "Bloomberg",
    category: "stocks",
    icon: "chart-line",
    scheme: "bloomberg",
    nativeUrls: ["bloomberg://"],
    iosStoreUrl: "https://apps.apple.com/us/app/bloomberg/id281941097",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.bloomberg.android.plus",
    webUrl: "https://www.bloomberg.com/",
  },
  {
    id: "reuters",
    name: "Reuters",
    category: "news",
    icon: "newspaper",
    scheme: "reuters",
    nativeUrls: ["reuters://"],
    iosStoreUrl: "https://apps.apple.com/us/app/reuters/id602660809",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.thomsonreuters.reuters",
    webUrl: "https://www.reuters.com/",
  },
  {
    id: "fox_news",
    name: "Fox News",
    category: "news",
    icon: "newspaper",
    scheme: "foxnews",
    nativeUrls: ["foxnews://", "fox://"],
    iosStoreUrl: "https://apps.apple.com/us/app/fox-news/id333903271",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.foxnews.android",
    webUrl: "https://www.foxnews.com/",
  },
  {
    id: "cnn",
    name: "CNN",
    category: "news",
    icon: "newspaper",
    scheme: "cnn",
    nativeUrls: ["cnn://"],
    iosStoreUrl: "https://apps.apple.com/us/app/cnn/id331786748",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.cnn.mobile.android.phone",
    webUrl: "https://www.cnn.com/",
  },
  {
    id: "msnbc",
    name: "MSNBC",
    category: "news",
    icon: "newspaper",
    scheme: "msnbc",
    nativeUrls: ["msnbc://"],
    iosStoreUrl: "https://apps.apple.com/us/app/msnbc/id396885309",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.nbcnews.msnbc",
    webUrl: "https://www.msnbc.com/",
  },
  {
    id: "nytimes",
    name: "NY Times",
    category: "news",
    icon: "newspaper",
    scheme: "nytimes",
    nativeUrls: ["nytimes://"],
    iosStoreUrl: "https://apps.apple.com/us/app/nytimes/id284862083",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.nytimes.android",
    webUrl: "https://www.nytimes.com/",
  },
  {
    id: "bbc_news",
    name: "BBC News",
    category: "news",
    icon: "newspaper",
    scheme: "bbcnews",
    nativeUrls: ["bbcnews://"],
    iosStoreUrl: "https://apps.apple.com/us/app/bbc-news/id364147881",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=bbc.mobile.news.ww",
    webUrl: "https://www.bbc.com/news",
  },
  {
    id: "weather_channel",
    name: "Weather Channel",
    category: "weather",
    icon: "weather-partly-cloudy",
    scheme: "twc",
    nativeUrls: ["twc://", "weather://"],
    iosStoreUrl: "https://apps.apple.com/us/app/the-weather-channel/id295646461",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.weather.Weather",
    webUrl: "https://weather.com/",
  },
  {
    id: "accuweather",
    name: "AccuWeather",
    category: "weather",
    icon: "weather-partly-cloudy",
    scheme: "accuweather",
    nativeUrls: ["accuweather://"],
    iosStoreUrl: "https://apps.apple.com/us/app/accuweather/id300048137",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.accuweather.android",
    webUrl: "https://www.accuweather.com/",
  },
  {
    id: "wunderground",
    name: "Weather Underground",
    category: "weather",
    icon: "weather-partly-cloudy",
    scheme: "wunderground",
    nativeUrls: ["wunderground://"],
    iosStoreUrl: "https://apps.apple.com/us/app/weather-underground/id284133350",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.wunderground.android.weather",
    webUrl: "https://www.wunderground.com/",
  },
  {
    id: "google_maps",
    name: "Google Maps",
    category: "maps",
    icon: "map",
    scheme: "comgooglemaps",
    nativeUrls: ["comgooglemaps://", "googlemaps://"],
    iosStoreUrl: "https://apps.apple.com/us/app/google-maps/id585027354",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.google.android.apps.maps",
    webUrl: "https://maps.google.com/",
  },
  {
    id: "apple_maps",
    name: "Apple Maps",
    category: "maps",
    icon: "map",
    scheme: "maps",
    nativeUrls: ["maps://", "http://maps.apple.com/"],
    iosStoreUrl: "https://apps.apple.com/us/app/apple-maps/id915056765",
    androidStoreUrl: "https://www.google.com/maps",
    webUrl: "https://maps.apple.com/",
  },
  {
    id: "waze",
    name: "Waze",
    category: "maps",
    icon: "map",
    scheme: "waze",
    nativeUrls: ["waze://"],
    iosStoreUrl: "https://apps.apple.com/us/app/waze-navigation-live-traffic/id323229106",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.waze",
    webUrl: "https://www.waze.com/",
  },
  {
    id: "draftkings",
    name: "DraftKings",
    category: "casino",
    icon: "casino",
    scheme: "draftkings",
    nativeUrls: ["draftkings://"],
    iosStoreUrl: "https://apps.apple.com/us/app/draftkings-sportsbook-casino/id888305863",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.draftkings.sportsbook",
    webUrl: "https://www.draftkings.com/",
  },
  {
    id: "fanduel",
    name: "FanDuel",
    category: "casino",
    icon: "casino",
    scheme: "fanduel",
    nativeUrls: ["fanduel://"],
    iosStoreUrl: "https://apps.apple.com/us/app/fanduel-sportsbook-casino/id1413721906",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.fanduel.sportsbook",
    webUrl: "https://www.fanduel.com/",
  },
  {
    id: "betmgm",
    name: "BetMGM",
    category: "casino",
    icon: "casino",
    scheme: "betmgm",
    nativeUrls: ["betmgm://"],
    iosStoreUrl: "https://apps.apple.com/us/app/betmgm-sportsbook/id1430875409",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.playmgm.sportsbook",
    webUrl: "https://www.betmgm.com/",
  },
  {
    id: "caesars_sportsbook",
    name: "Caesars Sportsbook",
    category: "casino",
    icon: "casino",
    scheme: "caesarssportsbook",
    nativeUrls: ["caesarssportsbook://", "williamhillus://"],
    iosStoreUrl: "https://apps.apple.com/us/app/caesars-sportsbook/id1489145500",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.williamhill.us.nj.sports",
    webUrl: "https://www.caesars.com/sportsbook-and-casino",
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "entertainment",
    icon: "entertainment",
    scheme: "youtube",
    nativeUrls: ["youtube://", "vnd.youtube://"],
    iosStoreUrl: "https://apps.apple.com/us/app/youtube/id544007664",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.google.android.youtube",
    webUrl: "https://www.youtube.com/",
  },
  {
    id: "spotify",
    name: "Spotify",
    category: "entertainment",
    icon: "entertainment",
    scheme: "spotify",
    nativeUrls: ["spotify://"],
    iosStoreUrl: "https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.spotify.music",
    webUrl: "https://open.spotify.com/",
  },
  {
    id: "netflix",
    name: "Netflix",
    category: "entertainment",
    icon: "entertainment",
    scheme: "nflx",
    nativeUrls: ["nflx://", "netflix://"],
    iosStoreUrl: "https://apps.apple.com/us/app/netflix/id363590051",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.netflix.mediaclient",
    webUrl: "https://www.netflix.com/",
  },
  {
    id: "twitch",
    name: "Twitch",
    category: "entertainment",
    icon: "entertainment",
    scheme: "twitch",
    nativeUrls: ["twitch://"],
    iosStoreUrl: "https://apps.apple.com/us/app/twitch-live-streaming/id460177396",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=tv.twitch.android.app",
    webUrl: "https://www.twitch.tv/",
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "social",
    icon: "social",
    scheme: "tiktok",
    nativeUrls: ["tiktok://", "snssdk1233://"],
    iosStoreUrl: "https://apps.apple.com/us/app/tiktok/id835599320",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically",
    webUrl: "https://www.tiktok.com/",
  },
  {
    id: "instagram",
    name: "Instagram",
    category: "social",
    icon: "social",
    scheme: "instagram",
    nativeUrls: ["instagram://"],
    iosStoreUrl: "https://apps.apple.com/us/app/instagram/id389801252",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.instagram.android",
    webUrl: "https://www.instagram.com/",
  },
  {
    id: "facebook",
    name: "Facebook",
    category: "social",
    icon: "social",
    scheme: "fb",
    nativeUrls: ["fb://", "facebook://"],
    iosStoreUrl: "https://apps.apple.com/us/app/facebook/id284882215",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.facebook.katana",
    webUrl: "https://www.facebook.com/",
  },
  {
    id: "x_twitter",
    name: "X",
    category: "social",
    icon: "social",
    scheme: "twitter",
    nativeUrls: ["twitter://", "x://"],
    iosStoreUrl: "https://apps.apple.com/us/app/x/id333903271",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.twitter.android",
    webUrl: "https://x.com/",
  },
  {
    id: "discord",
    name: "Discord",
    category: "social",
    icon: "social",
    scheme: "discord",
    nativeUrls: ["discord://"],
    iosStoreUrl: "https://apps.apple.com/us/app/discord-chat-talk-hang-out/id985746746",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.discord",
    webUrl: "https://discord.com/",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    category: "social",
    icon: "social",
    scheme: "whatsapp",
    nativeUrls: ["whatsapp://"],
    iosStoreUrl: "https://apps.apple.com/us/app/whatsapp-messenger/id310633997",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.whatsapp",
    webUrl: "https://www.whatsapp.com/",
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "social",
    icon: "social",
    scheme: "tg",
    nativeUrls: ["tg://", "telegram://"],
    iosStoreUrl: "https://apps.apple.com/us/app/telegram-messenger/id686449807",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=org.telegram.messenger",
    webUrl: "https://telegram.org/",
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "finance",
    icon: "finance",
    scheme: "paypal",
    nativeUrls: ["paypal://"],
    iosStoreUrl: "https://apps.apple.com/us/app/paypal/id283646709",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.paypal.android.p2pmobile",
    webUrl: "https://www.paypal.com/",
  },
  {
    id: "venmo",
    name: "Venmo",
    category: "finance",
    icon: "finance",
    scheme: "venmo",
    nativeUrls: ["venmo://"],
    iosStoreUrl: "https://apps.apple.com/us/app/venmo/id351727428",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.venmo",
    webUrl: "https://venmo.com/",
  },
  {
    id: "cash_app",
    name: "Cash App",
    category: "finance",
    icon: "finance",
    scheme: "cashapp",
    nativeUrls: ["cashapp://", "squarecash://"],
    iosStoreUrl: "https://apps.apple.com/us/app/cash-app/id711923939",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.squareup.cash",
    webUrl: "https://cash.app/",
  },
  {
    id: "roblox",
    name: "Roblox",
    category: "games",
    icon: "gamepad",
    scheme: "roblox",
    nativeUrls: ["roblox://"],
    iosStoreUrl: "https://apps.apple.com/us/app/roblox/id431946152",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.roblox.client",
    webUrl: "https://www.roblox.com/",
  },
  {
    id: "minecraft",
    name: "Minecraft",
    category: "games",
    icon: "gamepad",
    scheme: "minecraft",
    nativeUrls: ["minecraft://"],
    iosStoreUrl: "https://apps.apple.com/us/app/minecraft/id479516143",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.mojang.minecraftpe",
    webUrl: "https://www.minecraft.net/",
  },
  {
    id: "clash_of_clans",
    name: "Clash of Clans",
    category: "games",
    icon: "gamepad",
    scheme: "clashofclans",
    nativeUrls: ["clashofclans://"],
    iosStoreUrl: "https://apps.apple.com/us/app/clash-of-clans/id529479190",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.supercell.clashofclans",
    webUrl: "https://supercell.com/en/games/clashofclans/",
  },
  {
    id: "candy_crush",
    name: "Candy Crush Saga",
    category: "games",
    icon: "gamepad",
    scheme: "candycrushsaga",
    nativeUrls: ["candycrushsaga://"],
    iosStoreUrl: "https://apps.apple.com/us/app/candy-crush-saga/id553834731",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.king.candycrushsaga",
    webUrl: "https://www.king.com/game/candycrush/",
  },
  {
    id: "calculator_web",
    name: "Calculator (web)",
    category: "utilities",
    icon: "calculator",
    scheme: "https",
    nativeUrls: [],
    iosStoreUrl: "https://www.google.com/search?q=calculator",
    androidStoreUrl: "https://www.google.com/search?q=calculator",
    webUrl: "https://www.google.com/search?q=calculator",
  },
] as const;

const catalogById = new Map(MISC_APPS_CATALOG.map((a) => [a.id, a]));

export function miscAppById(id: string): MiscAppDefinition | undefined {
  return catalogById.get(id as MiscAppId);
}

export function labelForMiscApp(id: MiscAppId): string {
  return miscAppById(id)?.name ?? id;
}

export function storeUrlForMiscApp(def: MiscAppDefinition): string {
  return Platform.OS === "ios" ? def.iosStoreUrl : def.androidStoreUrl;
}

/** All URL schemes for LSApplicationQueriesSchemes / canOpenURL checks. */
export function miscAppQuerySchemes(): string[] {
  const schemes = new Set<string>();
  for (const app of MISC_APPS_CATALOG) {
    if (app.scheme !== "https") schemes.add(app.scheme);
    for (const url of app.nativeUrls) {
      const m = /^([a-z][a-z0-9+.-]*):/i.exec(url);
      if (m) schemes.add(m[1].toLowerCase());
    }
  }
  return [...schemes];
}
