import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { buildIosQuerySchemes, IOS_QUERY_SCHEME_LIMIT } = require("../lib/materialVendorLinkingQueries.js");

const MISC = [
  "robinhood", "yfinance", "yahoo", "fidelity", "etrade", "etrademobile", "schwab",
  "bloomberg", "reuters", "foxnews", "fox", "cnn", "msnbc", "nytimes", "bbcnews",
  "twc", "weather", "accuweather", "wunderground", "comgooglemaps", "googlemaps",
  "maps", "waze", "draftkings", "fanduel", "betmgm", "caesarssportsbook",
  "williamhillus", "youtube", "vnd.youtube", "spotify", "nflx", "netflix", "twitch",
  "tiktok", "snssdk1233", "instagram", "fb", "facebook", "twitter", "x", "discord",
  "whatsapp", "tg", "telegram", "paypal", "venmo", "cashcash", "squarecash", "roblox",
  "minecraft", "clashofclans", "candycrushsaga",
];

const merged = buildIosQuerySchemes(MISC);
console.log("merged count:", merged.length, "(limit", IOS_QUERY_SCHEME_LIMIT + ")");
console.log("homedepot index:", merged.indexOf("homedepot"));
console.log("lowes index:", merged.indexOf("lowes"));
console.log("first 10:", merged.slice(0, 10).join(", "));
