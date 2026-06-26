/**
 * Pre-build guard: employee/crew invite copy must never tell users "download links not set up".
 * Run: node ./scripts/check-invite-messages.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const FORBIDDEN = [
  "download links are not set up",
  "download links not set up",
  "Download links are not set up",
];

const SCAN_IGNORE = new Set([
  "node_modules",
  ".expo",
  ".expo-export-test",
  ".expo-export-test-build34",
  "dist",
  ".git",
]);

const DEFAULT_IOS_ASC_APP_ID = "6771799454";
const DEFAULT_IOS_APP_STORE_URL = `https://apps.apple.com/app/id${DEFAULT_IOS_ASC_APP_ID}`;
const DEFAULT_ANDROID_PACKAGE = "com.idealsolutions.app";

function trimUrl(value) {
  return (value ?? "").trim();
}

function defaultIosStoreUrl(env = {}) {
  const testFlight = trimUrl(env.EXPO_PUBLIC_IOS_TESTFLIGHT_URL);
  if (testFlight) return testFlight;
  const fromEnv =
    trimUrl(env.EXPO_PUBLIC_EMPLOYEE_APP_IOS_URL) ||
    trimUrl(env.EXPO_PUBLIC_PRO_IOS_STORE_URL);
  if (fromEnv) return fromEnv;
  return DEFAULT_IOS_APP_STORE_URL;
}

function defaultAndroidStoreUrl(env = {}) {
  const pkg =
    trimUrl(env.EXPO_PUBLIC_ANDROID_PACKAGE) ||
    trimUrl(env.EXPO_PUBLIC_PRO_ANDROID_PACKAGE) ||
    DEFAULT_ANDROID_PACKAGE;
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;
}

function ensureStoreLinks(links, env = {}) {
  return {
    iosStoreUrl: links.iosStoreUrl.trim() || defaultIosStoreUrl(env),
    androidStoreUrl: links.androidStoreUrl.trim() || defaultAndroidStoreUrl(env),
  };
}

function hasInviteExtras(extras) {
  return !!(extras?.inviteLink?.trim() || extras?.inviteCode?.trim());
}

function installInstructions(links, companyName, extras) {
  const hasInvite = hasInviteExtras(extras);
  const employer = companyName || "your employer";
  const lines = [
    "Install Ideal Solutions Pro from TestFlight (same app as your employer).",
    "",
  ];

  const iosUrl = links.iosStoreUrl.trim();
  const androidUrl = links.androidStoreUrl.trim();

  if (iosUrl.includes("testflight.apple.com")) {
    lines.push(`TestFlight: ${iosUrl}`);
  } else if (iosUrl) {
    lines.push(`iPhone (TestFlight / App Store): ${iosUrl}`);
  } else if (hasInvite) {
    lines.push(
      `iPhone: ask ${employer} for a TestFlight invite, or use the App Store: ${DEFAULT_IOS_APP_STORE_URL}`,
    );
  }

  if (androidUrl) {
    lines.push(`Android (Google Play): ${androidUrl}`);
  }

  if (extras?.inviteLink?.trim()) {
    lines.push("");
    lines.push(`After installing, open this link to join ${companyName || "your company"}:`);
    lines.push(extras.inviteLink.trim());
  } else if (extras?.inviteCode?.trim()) {
    lines.push("");
    lines.push("After installing, open the app and go to Employee ΓåÆ Enter invite code.");
  }

  if (!iosUrl && !androidUrl && !hasInvite) {
    lines.push(
      `Ask ${employer} for a TestFlight invite, or download from the App Store: ${DEFAULT_IOS_APP_STORE_URL}`,
    );
  }

  return lines;
}

function buildEmployeeAppInviteMessage(recipient, context, extras) {
  const company = context.companyName || "Your employer";
  const name = [recipient.firstName?.trim(), recipient.lastName?.trim()].filter(Boolean).join(" ");
  const greeting = name ? `Hi ${name},` : "Hi,";
  const links = ensureStoreLinks(context.links, context.env);

  const lines = [
    greeting,
    "",
    `${company} uses Ideal Solutions Pro for crew tools, schedules, and field work.`,
    "",
    ...installInstructions(links, context.companyName, extras),
    "",
    extras?.inviteCode?.trim()
      ? `Your invite code: ${extras.inviteCode.trim()}`
      : "Sign in with the contact info your employer has on file for you.",
    extras?.inviteCode?.trim() ? "In the app: Employee ΓåÆ Enter invite code." : "",
    "",
    context.employerPhone ? `Questions? Call ${context.employerPhone}` : "",
    context.employerEmail ? `Email: ${context.employerEmail}` : "",
    "",
    "ΓÇö Sent via Ideal Solutions Pro",
  ].filter(Boolean);

  return lines.join("\n");
}

function buildCompanyInviteAcceptUrl(code, serverLink, base) {
  const trimmed = serverLink?.trim();
  if (trimmed) return trimmed;
  if (base) {
    return `${base.replace(/\/+$/, "")}/invite/accept?code=${encodeURIComponent(code)}`;
  }
  return `ideal-solutions:///invite/accept?code=${encodeURIComponent(code)}`;
}

function buildEmployeeJoinUrl(code, serverLink, base) {
  const trimmed = serverLink?.trim();
  if (trimmed) return trimmed;
  if (base) {
    return `${base.replace(/\/+$/, "")}/employee/join?code=${encodeURIComponent(code)}`;
  }
  return `ideal-solutions:///employee/join?code=${encodeURIComponent(code)}`;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SCAN_IGNORE.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) files.push(full);
  }
  return files;
}

function scanSourceForForbidden() {
  const hits = [];
  for (const file of walk(ROOT)) {
    const text = readFileSync(file, "utf8");
    for (const phrase of FORBIDDEN) {
      if (text.toLowerCase().includes(phrase.toLowerCase())) {
        hits.push({ file: relative(ROOT, file), phrase });
      }
    }
  }
  return hits;
}

function assertNoForbidden(text, label) {
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN) {
    if (lower.includes(phrase.toLowerCase())) {
      throw new Error(`${label}: contains forbidden phrase "${phrase}"`);
    }
  }
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: expected to include "${needle}"`);
  }
}

function runLogicTests() {
  const emptyEnv = {};
  const ios = defaultIosStoreUrl(emptyEnv);
  assertIncludes(ios, "apps.apple.com/app/id6771799454", "defaultIosStoreUrl(empty)");

  const resolved = ensureStoreLinks({ iosStoreUrl: "", androidStoreUrl: "" }, emptyEnv);
  assertIncludes(resolved.iosStoreUrl, "6771799454", "ensureStoreLinks iOS");
  assertIncludes(resolved.androidStoreUrl, "play.google.com", "ensureStoreLinks Android");

  const baseContext = {
    companyName: "Acme HVAC",
    employerPhone: "",
    employerEmail: "",
    links: { iosStoreUrl: "", androidStoreUrl: "" },
    env: emptyEnv,
  };

  const scenarios = [
    { label: "no extras", extras: undefined },
    { label: "inviteCode only", extras: { inviteCode: "CREW-ABC123" } },
    {
      label: "inviteLink only",
      extras: { inviteLink: "ideal-solutions:///employee/join?code=CREW-ABC123" },
    },
    {
      label: "both code and link",
      extras: {
        inviteCode: "CREW-ABC123",
        inviteLink: "ideal-solutions:///employee/join?code=CREW-ABC123",
      },
    },
  ];

  for (const { label, extras } of scenarios) {
    const message = buildEmployeeAppInviteMessage(
      { firstName: "Sam", lastName: "Tech" },
      baseContext,
      extras,
    );
    assertNoForbidden(message, `buildEmployeeAppInviteMessage (${label})`);
    assertIncludes(message, "6771799454", `buildEmployeeAppInviteMessage (${label}) iOS URL`);
  }

  const companyUrl = buildCompanyInviteAcceptUrl("CO-123", null, undefined);
  if (!companyUrl || !companyUrl.includes("CO-123")) {
    throw new Error("buildCompanyInviteAcceptUrl must always return a URL with code");
  }

  const employeeUrl = buildEmployeeJoinUrl("CREW-XYZ", null, undefined);
  if (!employeeUrl || !employeeUrl.includes("CREW-XYZ")) {
    throw new Error("buildEmployeeJoinUrl must always return a URL with code");
  }
}

let failed = false;

const sourceHits = scanSourceForForbidden();
if (sourceHits.length > 0) {
  failed = true;
  console.error("FAIL: forbidden invite phrases found in source:");
  for (const h of sourceHits) console.error(`  - ${h.file}: "${h.phrase}"`);
} else {
  console.log("OK: no forbidden invite phrases in .ts/.tsx/.js source");
}

try {
  runLogicTests();
  console.log("OK: invite message logic tests passed (empty env)");
} catch (e) {
  failed = true;
  console.error("FAIL:", e.message);
}

if (failed) process.exit(1);
console.log("All invite message checks passed.");
