const { withAndroidManifest } = require("expo/config-plugins");
const {
  MISC_INTEGRATION_ANDROID_PACKAGES,
  MISC_INTEGRATION_ANDROID_SCHEMES,
} = require("../lib/materialVendorLinkingQueries");

function packageQueryEntry(packageName) {
  return { $: { "android:name": packageName } };
}

function viewSchemeQueryEntry(scheme) {
  return {
    intent: [
      {
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        data: [{ $: { "android:scheme": scheme } }],
      },
    ],
  };
}

function queryKey(entry) {
  if (entry.$?.["android:name"]) return `pkg:${entry.$["android:name"]}`;
  const intent = Array.isArray(entry.intent) ? entry.intent[0] : entry.intent;
  const action = intent?.action?.[0]?.$?.["android:name"] ?? "";
  const scheme = intent?.data?.[0]?.$?.["android:scheme"] ?? "";
  return `intent:${action}:${scheme}`;
}

function mergeQueries(existing, additions) {
  const list = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  const seen = new Set(list.map(queryKey));
  for (const entry of additions) {
    const key = queryKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(entry);
  }
  return list;
}

/** Android 11+ visibility for misc integration canOpenURL + package launch. */
function withMiscIntegrationLinkingQueries(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    if (!manifest.manifest) return mod;

    const additions = [
      ...MISC_INTEGRATION_ANDROID_PACKAGES.map(packageQueryEntry),
      ...MISC_INTEGRATION_ANDROID_SCHEMES.map(viewSchemeQueryEntry),
    ];

    manifest.manifest.queries = mergeQueries(manifest.manifest.queries, additions);
    return mod;
  });
}

module.exports = withMiscIntegrationLinkingQueries;
