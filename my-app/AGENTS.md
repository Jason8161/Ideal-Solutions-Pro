# Screen layout conventions

## Immersive typing (non-home screens)

When the user focuses any text field outside the home screen, the page header collapses to **back only** and the home footer hides — same behavior as **AI Assistance**.

**New screens**

- **Forms / lists:** use `ScStickyScroll` or `StickyScrollScreen` from `@/components/serviceCalls/screenChrome` (wraps `FormScrollView`, which wires all nested `TextInput`s automatically).
- **Sticky header + plain scroll:** use `StickyPageHeader` + `ScreenScrollView` (not raw `ScrollView`).
- **Custom shells:** use `StickyScreenShell` with `ImmersiveStickyPageHeader` or `StickyPageHeader` for the header slot.
- **Standalone fields:** use `ImmersiveTextInput` from `@/components/ImmersiveTextInput` or spread `useImmersiveTextInputHandlers()` onto `TextInput` `onFocus` / `onBlur`.

Do not rely on the full title block staying visible while the keyboard is open on non-home routes.

## Materials search suppliers

The Materials search grid uses `loadMaterialsSearchTiles()` from `@/lib/materialsSearchSuppliers`:

1. **Settings → My supply houses** (saved distributors) when the user has any saved
2. Otherwise **Settings → Material search suppliers** (retailer apps)
3. Otherwise Home Depot + Lowe's defaults

App retailers: first tap offers **Always use app** (saved in `materialSupplierAppShortcuts`); quick links at the top open the native app directly afterward. Other distributors open their website with the optional search term.

## Misc Apps shortcuts

- **Android:** Settings → Misc Apps → **Apps on your phone** lists every launcher app (games, casino, social, etc.) via `installed-launcher-apps` native module. Requires a dev client rebuild after pulling (`npx expo prebuild` / EAS build).
- **iOS:** Cannot scan all installed apps; use **Installed — quick add**, the expanded catalog, or **Add by app name**.
- Custom shortcuts are stored in `miscCustomApps` and appear on the Misc Apps home tile with catalog entries.
