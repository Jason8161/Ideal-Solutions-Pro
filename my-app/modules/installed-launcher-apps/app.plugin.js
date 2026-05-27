const { withAndroidManifest } = require("expo/config-plugins");

/** Lets Android 11+ discover launcher apps for Misc Apps phone search. */
const LAUNCHER_QUERY = {
  intent: [
    {
      action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
      category: [{ $: { "android:name": "android.intent.category.LAUNCHER" } }],
    },
  ],
};

function hasLauncherQuery(queries) {
  if (!queries) return false;
  const list = Array.isArray(queries) ? queries : [queries];
  for (const q of list) {
    if (!q.intent) continue;
    const intents = Array.isArray(q.intent) ? q.intent : [q.intent];
    for (const intent of intents) {
      const actions = intent.action
        ? Array.isArray(intent.action)
          ? intent.action
          : [intent.action]
        : [];
      const categories = intent.category
        ? Array.isArray(intent.category)
          ? intent.category
          : [intent.category]
        : [];
      const hasMain = actions.some((a) => a.$?.["android:name"] === "android.intent.action.MAIN");
      const hasLauncher = categories.some(
        (c) => c.$?.["android:name"] === "android.intent.category.LAUNCHER",
      );
      if (hasMain && hasLauncher) return true;
    }
  }
  return false;
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withInstalledLauncherApps(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    if (!manifest.manifest) return mod;

    let queries = manifest.manifest.queries;
    if (!queries) {
      manifest.manifest.queries = [LAUNCHER_QUERY];
      return mod;
    }

    const list = Array.isArray(queries) ? queries : [queries];
    if (!hasLauncherQuery(list)) {
      list.push(LAUNCHER_QUERY);
      manifest.manifest.queries = list;
    }

    return mod;
  });
}

module.exports = withInstalledLauncherApps;
