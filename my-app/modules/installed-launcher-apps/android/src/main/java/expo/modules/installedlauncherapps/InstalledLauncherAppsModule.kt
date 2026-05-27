package expo.modules.installedlauncherapps

import android.content.Intent
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class InstalledLauncherAppsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("InstalledLauncherApps")

    AsyncFunction("getLauncherApps") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, String>>()
      val pm = context.packageManager
      val intent = Intent(Intent.ACTION_MAIN, null).apply {
        addCategory(Intent.CATEGORY_LAUNCHER)
      }
      @Suppress("DEPRECATION")
      val resolves = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
      val ownPackage = context.packageName
      val seen = mutableSetOf<String>()
      val out = mutableListOf<Map<String, String>>()

      for (resolve in resolves) {
        val pkg = resolve.activityInfo.packageName ?: continue
        if (pkg == ownPackage || seen.contains(pkg)) continue
        seen.add(pkg)
        val label = resolve.loadLabel(pm)?.toString()?.trim().orEmpty()
        if (label.isEmpty()) continue
        out.add(
          mapOf(
            "packageName" to pkg,
            "appName" to label,
          ),
        )
      }

      out.sortedBy { (it["appName"] ?: "").lowercase() }
    }

    AsyncFunction("isPackageInstalled") { packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val pm = context.packageManager
      pm.getLaunchIntentForPackage(packageName) != null
    }

    AsyncFunction("launchPackage") { packageName: String ->
      val context = appContext.reactContext
        ?: throw Exception("App context unavailable")
      val pm = context.packageManager
      val launch = pm.getLaunchIntentForPackage(packageName)
        ?: throw Exception("No launcher for $packageName")
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(launch)
    }
  }
}
