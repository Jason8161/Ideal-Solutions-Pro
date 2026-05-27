import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FreeAccessStatusCard } from "@/components/subscription/FreeAccessStatusCard";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { COMPANY_LOGO_IMAGE_STYLE } from "@/lib/companyLogoAsset";
import { pickCompanyLogoFromFiles, pickCompanyLogoFromLibrary } from "@/lib/companyLogoPicker";
import { inputStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";
import {
  companyProfileFromPartial,
  composeFullAddress,
  loadCompanyProfile,
  saveCompanyProfile,
  updateCompanyLogo,
  type CompanyProfile,
} from "@/lib/profileStorage";
import { refreshHomeProfile } from "@/lib/homeBoot";
import { geocodeShippingAddressParts } from "@/lib/suppliers/geocodeProfile";
import { getShippingAddressParts } from "@/lib/suppliers/shippingOrigin";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import {
  getNotificationPermission,
  getStoredExpoPushToken,
  nativeNotificationsModuleAvailable,
  registerExpoPushTokenAsync,
  requestNotificationPermission,
  scheduleLocalTestNotificationInSeconds,
  type NotificationPermissionState,
} from "@/lib/appointmentNotifications";

export default function UserInfoScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderColor = colors.text;
  const [hydrated, setHydrated] = useState(false);
  const [businessType, setBusinessType] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [companyStreet, setCompanyStreet] = useState<string>("");
  const [companyCity, setCompanyCity] = useState<string>("");
  const [companyState, setCompanyState] = useState<string>("");
  const [companyZip, setCompanyZip] = useState<string>("");
  const [shippingSame, setShippingSame] = useState(true);
  const [shippingStreet, setShippingStreet] = useState<string>("");
  const [shippingCity, setShippingCity] = useState<string>("");
  const [shippingState, setShippingState] = useState<string>("");
  const [shippingZip, setShippingZip] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [supportEmail, setSupportEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [facebookPageUrl, setFacebookPageUrl] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState<string>("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermissionState | "web" | "unknown">("unknown");
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [testNotifyBusy, setTestNotifyBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const formDirtyRef = useRef(false);

  const markFormDirty = useCallback(() => {
    formDirtyRef.current = true;
  }, []);

  const bindTextField = useCallback(
    (setter: (value: string) => void) => (value: string) => {
      markFormDirty();
      setter(value);
    },
    [markFormDirty],
  );

  const applyStoredProfile = useCallback((stored: Partial<CompanyProfile> | null) => {
    const full = companyProfileFromPartial(stored);
    setBusinessType(full.businessType);
    setCompanyName(full.companyName);
    if (
      full.companyStreet.trim() ||
      full.companyCity.trim() ||
      full.companyState.trim() ||
      full.companyZip.trim()
    ) {
      setCompanyStreet(full.companyStreet);
      setCompanyCity(full.companyCity);
      setCompanyState(full.companyState);
      setCompanyZip(full.companyZip);
    } else if (full.companyAddress.trim()) {
      setCompanyStreet(full.companyAddress.trim());
      setCompanyCity("");
      setCompanyState("");
      setCompanyZip("");
    } else {
      setCompanyStreet("");
      setCompanyCity("");
      setCompanyState("");
      setCompanyZip("");
    }
    setShippingSame(full.shippingSame);
    if (
      full.shippingStreet.trim() ||
      full.shippingCity.trim() ||
      full.shippingState.trim() ||
      full.shippingZip.trim()
    ) {
      setShippingStreet(full.shippingStreet);
      setShippingCity(full.shippingCity);
      setShippingState(full.shippingState);
      setShippingZip(full.shippingZip);
    } else if (full.shippingAddress.trim()) {
      setShippingStreet(full.shippingAddress.trim());
      setShippingCity("");
      setShippingState("");
      setShippingZip("");
    } else {
      setShippingStreet("");
      setShippingCity("");
      setShippingState("");
      setShippingZip("");
    }
    setPhoneNumber(full.phoneNumber);
    setSupportEmail(full.supportEmail);
    setWebsite(full.website);
    setFacebookPageUrl(full.facebookPageUrl);
    setLicenseNumber(full.licenseNumber);
    setLogoUri(full.logoUri);
    setProfileCompleted(full.profileCompleted);
  }, []);

  const reloadProfileFromStorage = useCallback(async () => {
    const stored = await loadCompanyProfile();
    applyStoredProfile(stored);
    setHydrated(true);
  }, [applyStoredProfile]);

  const refreshPushPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      setPushPermission("web");
      return;
    }
    const p = await getNotificationPermission();
    setPushPermission(p);
    const stored = await getStoredExpoPushToken();
    setExpoPushToken(stored);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPushPermission();
      if (!formDirtyRef.current) {
        void reloadProfileFromStorage();
      }
    }, [refreshPushPermission, reloadProfileFromStorage]),
  );

  const persistProfile = useCallback(async () => {
    const stored = await loadCompanyProfile();
    const base = companyProfileFromPartial(stored);
    const cStreet = companyStreet.trim();
    const cCity = companyCity.trim();
    const cState = companyState.trim();
    const cZip = companyZip.trim();
    const sStreet = shippingStreet.trim();
    const sCity = shippingCity.trim();
    const sState = shippingState.trim();
    const sZip = shippingZip.trim();
    const companyAddress = composeFullAddress(cStreet, cCity, cState, cZip);
    const shippingAddress = shippingSame ? "" : composeFullAddress(sStreet, sCity, sState, sZip);

    const draftProfile: CompanyProfile = {
      ...base,
      businessType: businessType.trim(),
      companyName: companyName.trim(),
      companyStreet: cStreet,
      companyCity: cCity,
      companyState: cState,
      companyZip: cZip,
      companyAddress,
      shippingSame,
      shippingStreet: shippingSame ? "" : sStreet,
      shippingCity: shippingSame ? "" : sCity,
      shippingState: shippingSame ? "" : sState,
      shippingZip: shippingSame ? "" : sZip,
      shippingAddress,
      phoneNumber: phoneNumber.trim(),
      supportEmail: supportEmail.trim(),
      website: website.trim(),
      facebookPageUrl: facebookPageUrl.trim(),
      licenseNumber: licenseNumber.trim(),
      logoUri,
      profileCompleted: true,
      planPickerCompleted: base.planPickerCompleted || true,
      subscriptionTier: base.subscriptionTier ?? "locked",
    };

    const geoParts = getShippingAddressParts(draftProfile);
    const geo = await geocodeShippingAddressParts(geoParts);
    draftProfile.shippingLatitude = geo?.latitude ?? null;
    draftProfile.shippingLongitude = geo?.longitude ?? null;

    await saveCompanyProfile(draftProfile);
    formDirtyRef.current = false;
    setProfileCompleted(true);
    await refreshHomeProfile();
  }, [
    businessType,
    companyName,
    companyStreet,
    companyCity,
    companyState,
    companyZip,
    shippingSame,
    shippingStreet,
    shippingCity,
    shippingState,
    shippingZip,
    phoneNumber,
    supportEmail,
    website,
    facebookPageUrl,
    licenseNumber,
    logoUri,
  ]);

  const handlePickLogoFromLibrary = async () => {
    const uri = await pickCompanyLogoFromLibrary();
    if (!uri) return;
    try {
      const persisted = await updateCompanyLogo(uri);
      setLogoUri(persisted);
      await refreshHomeProfile();
    } catch {
      Alert.alert("Could not save logo", "Try another image or check free space on this device.");
    }
  };

  const handlePickLogoFromFiles = async () => {
    const uri = await pickCompanyLogoFromFiles();
    if (!uri) return;
    try {
      const persisted = await updateCompanyLogo(uri);
      setLogoUri(persisted);
      await refreshHomeProfile();
    } catch {
      Alert.alert("Could not save logo", "Try another image or check free space on this device.");
    }
  };

  const handleAllowNotifications = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Notifications",
        "Push notifications are available when you install Ideal Solutions Pro on an iPhone or Android phone. The web preview does not support phone alerts.",
      );
      return;
    }

    if (!nativeNotificationsModuleAvailable()) {
      Alert.alert(
        "Use a development build",
        "Expo Go does not load the full notifications stack. Run `eas build` (development profile), install the app on your phone, then open User info again to allow notifications and register for push.",
      );
      return;
    }

    const current = await getNotificationPermission();
    if (current === "granted") {
      setPushPermission("granted");
      await Linking.openSettings();
      return;
    }

    const result = await requestNotificationPermission();
    setPushPermission(result);

    if (result === "granted") {
      const { token, error } = await registerExpoPushTokenAsync();
      if (token) setExpoPushToken(token);
      if (error) {
        Alert.alert(
          "Notifications allowed",
          `This device can show alerts. Registering with Expo Push failed:\n\n${error}\n\nYou can still use local reminders (e.g. appointments).`,
        );
        return;
      }
      Alert.alert(
        "Notifications allowed",
        "This device is set up for alerts and registered for Expo push. Use “Test notification” below to confirm delivery.",
      );
      return;
    }

    if (result === "denied") {
      Alert.alert(
        "Notifications blocked",
        "To allow alerts, open your device Settings and turn on notifications for Ideal Solutions Pro.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }

    Alert.alert("Not enabled", "Notifications were not turned on. Tap the button again to retry, or change this in Settings.");
  }, []);

  const handleTestNotification = useCallback(async () => {
    setTestNotifyBusy(true);
    try {
      const id = await scheduleLocalTestNotificationInSeconds(3);
      if (id) {
        Alert.alert("Test scheduled", "You should see a local alert in about 3 seconds (app can be in the background).");
      } else {
        Alert.alert(
          "Could not schedule test",
          "Use a development build, allow notifications, and on Android avoid Expo Go for the full setup.",
        );
      }
    } finally {
      setTestNotifyBusy(false);
    }
  }, []);

  const handleRefreshPushToken = useCallback(async () => {
    const { token, error } = await registerExpoPushTokenAsync();
    if (token) {
      setExpoPushToken(token);
      Alert.alert("Push token", "Updated and saved on this device. Use it on your server with Expo’s push API when you wire up backend sends.");
    } else {
      Alert.alert("Could not get push token", error ?? "Unknown error");
    }
  }, []);

  if (!hydrated) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingHint}>Loading profile…</Text>
      </View>
    );
  }

  const companyAddrComplete =
    companyStreet.trim().length > 0 &&
    companyCity.trim().length > 0 &&
    companyState.trim().length > 0 &&
    companyZip.trim().length > 0;
  const shippingAddrComplete =
    shippingStreet.trim().length > 0 &&
    shippingCity.trim().length > 0 &&
    shippingState.trim().length > 0 &&
    shippingZip.trim().length > 0;

  const canSubmit =
    businessType.trim().length > 0 &&
    companyName.trim().length > 0 &&
    companyAddrComplete &&
    phoneNumber.trim().length > 0 &&
    supportEmail.trim().length > 0 &&
    (shippingSame || shippingAddrComplete);

  return (
    <StickyScrollScreen
      title="User info"
      backHref={settingsBackHref("user-info")}
      backLabel={settingsBackLabel("user-info")}
      contentContainerStyle={styles.content}
      scrollViewProps={{ keyboardShouldPersistTaps: "handled" }}
    >
      <Text style={styles.pageSubtitle}>
        This information is stored on your device and is used across the app. It is not shown on the home screen.
      </Text>
      {profileCompleted ? (
        <Text style={styles.savedPill}>Profile saved — you can update fields anytime.</Text>
      ) : null}

      <Link href={"/settings/accounting-billing" as Href} asChild>
        <TouchableOpacity style={styles.accountingBillingNav} activeOpacity={0.85}>
          <Text style={styles.accountingBillingNavTitle}>Accounting &amp; billing</Text>
          <Text style={styles.accountingBillingNavBody}>
            Choose your accounting app (QuickBooks, Xero, and more) and add bank shortcuts. The home Accountant/Billing
            button asks whether to open your bank or your books.
          </Text>
        </TouchableOpacity>
      </Link>

      <Text style={styles.fieldLabel}>Phone notifications</Text>
      <Text style={styles.notificationsHint}>
        Allow alerts on this device, register an Expo push token (for server-sent messages), and run a quick local test.
      </Text>
      {Platform.OS !== "web" && !nativeNotificationsModuleAvailable() ? (
        <Text style={styles.notificationsWebHint}>
          Expo Go skips the full notifications stack. Use an EAS development build to request permission and register for push.
        </Text>
      ) : null}
      {pushPermission === "granted" ? (
        <Text style={styles.notificationsOnPill}>Notifications allowed on this device</Text>
      ) : pushPermission === "web" ? (
        <Text style={styles.notificationsWebHint}>Use the iOS or Android app for push notifications.</Text>
      ) : null}
      <TouchableOpacity style={styles.notificationsButton} onPress={() => void handleAllowNotifications()} activeOpacity={0.85}>
        <Text style={styles.notificationsButtonText}>
          {pushPermission === "granted" ? "Manage in device Settings" : "Allow notifications on this phone"}
        </Text>
      </TouchableOpacity>
      {pushPermission !== "granted" && pushPermission !== "web" ? (
        <TouchableOpacity style={styles.notificationsSecondary} onPress={() => void Linking.openSettings()} activeOpacity={0.85}>
          <Text style={styles.notificationsSecondaryText}>Open device Settings</Text>
        </TouchableOpacity>
      ) : null}
      {pushPermission === "granted" && nativeNotificationsModuleAvailable() ? (
        <View style={styles.notificationsExtras}>
          <TouchableOpacity
            style={[styles.notificationsTestButton, testNotifyBusy && styles.notificationsTestButtonDisabled]}
            onPress={() => void handleTestNotification()}
            activeOpacity={0.85}
            disabled={testNotifyBusy}
          >
            <Text style={styles.notificationsTestButtonText}>{testNotifyBusy ? "Scheduling…" : "Test notification (3 sec)"}</Text>
          </TouchableOpacity>
          {expoPushToken ? (
            <Text style={styles.pushTokenFoot} selectable>
              Expo push token (ends with): …{expoPushToken.length > 28 ? expoPushToken.slice(-28) : expoPushToken}
            </Text>
          ) : (
            <Text style={styles.pushTokenFoot}>
              Set EXPO_PUBLIC_EAS_PROJECT_ID in .env (from `eas init`), restart Expo, then tap “Refresh Expo push token”.
            </Text>
          )}
          <TouchableOpacity style={styles.notificationsSecondary} onPress={() => void handleRefreshPushToken()} activeOpacity={0.85}>
            <Text style={styles.notificationsSecondaryText}>Refresh Expo push token</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.fieldLabel}>Type of business</Text>
      <VoiceTextInput
        style={styles.input}
        value={businessType}
        onChangeText={bindTextField(setBusinessType)}
        placeholder="General contractor, Electrical, Plumbing, HVAC, Carpentry, DIY"
        placeholderTextColor={placeholderColor}
      />

      <Text style={styles.fieldLabel}>Company name</Text>
      <VoiceTextInput
        style={styles.input}
        value={companyName}
        onChangeText={bindTextField(setCompanyName)}
        placeholder="Your company name"
        placeholderTextColor={placeholderColor}
      />

      <Text style={styles.fieldLabel}>Company logo</Text>
      <View style={styles.logoPickRow}>
        <TouchableOpacity style={[styles.logoButton, styles.logoButtonHalf]} onPress={handlePickLogoFromLibrary}>
          <Text style={styles.logoButtonText}>Photo library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.logoButton, styles.logoButtonHalf]} onPress={handlePickLogoFromFiles}>
          <Text style={styles.logoButtonText}>Files & OneDrive</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.logoHint}>
        Use Photo library for quick picks, or Files & OneDrive for Downloads, iCloud, OneDrive, Google Drive, and more.
      </Text>
      {logoUri ? (
        <Image
          source={{ uri: logoUri }}
          style={[styles.logoPreview, COMPANY_LOGO_IMAGE_STYLE]}
          resizeMode="contain"
        />
      ) : null}

      <Text style={styles.fieldLabel}>Company street address</Text>
      <VoiceTextInput
        style={styles.input}
        value={companyStreet}
        onChangeText={bindTextField(setCompanyStreet)}
        placeholder="Street number and name"
        placeholderTextColor={placeholderColor}
      />

      <View style={styles.addressColumnsRow}>
        <View style={styles.addressColumn}>
          <Text style={styles.addressColumnLabel}>City</Text>
          <VoiceTextInput
            style={[styles.input, styles.rowField]}
            value={companyCity}
            onChangeText={bindTextField(setCompanyCity)}
            placeholder="City"
            placeholderTextColor={placeholderColor}
          />
        </View>
        <View style={styles.addressColumnNarrow}>
          <Text style={styles.addressColumnLabel}>State</Text>
          <VoiceTextInput
            style={[styles.input, styles.rowField]}
            value={companyState}
            onChangeText={bindTextField(setCompanyState)}
            placeholder="ST"
            placeholderTextColor={placeholderColor}
            autoCapitalize="characters"
            maxLength={24}
          />
        </View>
        <View style={styles.addressColumnZip}>
          <Text style={styles.addressColumnLabel}>ZIP code</Text>
          <VoiceTextInput
            style={[styles.input, styles.rowField]}
            value={companyZip}
            onChangeText={bindTextField(setCompanyZip)}
            placeholder="ZIP"
            placeholderTextColor={placeholderColor}
            keyboardType="default"
            maxLength={12}
          />
        </View>
      </View>

      <View style={styles.checkboxRow}>
        <Text style={styles.fieldLabel}>Shipping address same as company address</Text>
        <Switch
          value={shippingSame}
          onValueChange={(value) => {
          markFormDirty();
          setShippingSame(value);
        }}
          thumbColor={colors.accent}
          trackColor={{
            false: hexToRgba(colors.text, 0.22),
            true: hexToRgba(colors.accent, 0.55),
          }}
        />
      </View>

      {!shippingSame && (
        <>
          <Text style={styles.fieldLabel}>Shipping street address</Text>
          <VoiceTextInput
            style={styles.input}
            value={shippingStreet}
            onChangeText={bindTextField(setShippingStreet)}
            placeholder="Street number and name"
            placeholderTextColor={placeholderColor}
          />

          <View style={styles.addressColumnsRow}>
            <View style={styles.addressColumn}>
              <Text style={styles.addressColumnLabel}>City</Text>
              <VoiceTextInput
                style={[styles.input, styles.rowField]}
                value={shippingCity}
                onChangeText={bindTextField(setShippingCity)}
                placeholder="City"
                placeholderTextColor={placeholderColor}
              />
            </View>
            <View style={styles.addressColumnNarrow}>
              <Text style={styles.addressColumnLabel}>State</Text>
              <VoiceTextInput
                style={[styles.input, styles.rowField]}
                value={shippingState}
                onChangeText={bindTextField(setShippingState)}
                placeholder="ST"
                placeholderTextColor={placeholderColor}
                autoCapitalize="characters"
                maxLength={24}
              />
            </View>
            <View style={styles.addressColumnZip}>
              <Text style={styles.addressColumnLabel}>ZIP code</Text>
              <VoiceTextInput
                style={[styles.input, styles.rowField]}
                value={shippingZip}
                onChangeText={bindTextField(setShippingZip)}
                placeholder="ZIP"
                placeholderTextColor={placeholderColor}
                keyboardType="default"
                maxLength={12}
              />
            </View>
          </View>
        </>
      )}

      <Text style={styles.fieldLabel}>Tech support phone</Text>
      <VoiceTextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={bindTextField(setPhoneNumber)}
        placeholder="Phone number"
        placeholderTextColor={placeholderColor}
        keyboardType="phone-pad"
      />

      <Text style={styles.fieldLabel}>Tech support email</Text>
      <VoiceTextInput
        style={styles.input}
        value={supportEmail}
        onChangeText={bindTextField(setSupportEmail)}
        placeholder="Email address"
        placeholderTextColor={placeholderColor}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>Website (optional)</Text>
      <VoiceTextInput
        style={styles.input}
        value={website}
        onChangeText={bindTextField(setWebsite)}
        placeholder="https://yourcompany.com"
        placeholderTextColor={placeholderColor}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.fieldLabel}>Facebook business page (optional)</Text>
      <VoiceTextInput
        style={styles.input}
        value={facebookPageUrl}
        onChangeText={bindTextField(setFacebookPageUrl)}
        placeholder="https://facebook.com/yourpage"
        placeholderTextColor={placeholderColor}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.fieldLabel}>License # (optional)</Text>
      <VoiceTextInput
        style={styles.input}
        value={licenseNumber}
        onChangeText={bindTextField(setLicenseNumber)}
        placeholder="State / contractor license number"
        placeholderTextColor={placeholderColor}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <FreeAccessStatusCard />

      <TouchableOpacity
        style={[styles.submitButton, (!canSubmit || saving) && styles.disabledButton]}
        onPress={() => {
          if (!canSubmit || saving) return;
          setSaving(true);
          void persistProfile()
            .then(() => {
              Alert.alert("Profile saved", "Your company info was saved on this device.");
            })
            .catch((e: unknown) => {
              const detail = e instanceof Error ? e.message : "";
              Alert.alert(
                "Could not save",
                detail
                  ? `${detail}\n\nPlease try again.`
                  : "Something went wrong saving your profile. Please try again.",
              );
            })
            .finally(() => {
              setSaving(false);
            });
        }}
        disabled={!canSubmit || saving}
      >
        <Text style={styles.submitButtonText}>{saving ? "Saving…" : "Save profile"}</Text>
      </TouchableOpacity>

    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const accentTint = hexToRgba(colors.accent, 0.22);
  const accentTintLight = hexToRgba(colors.accent, 0.12);
  const accentTintActive = hexToRgba(colors.accent, 0.38);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    loadingWrap: {
      flex: 1,
      backgroundColor: "transparent",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    loadingHint: {
      marginTop: 12,
      color: colors.text,
      fontSize: 16,
    },
    pageSubtitle: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 20,
    },
    lede: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    savedPill: {
      alignSelf: "flex-start",
      backgroundColor: accentTintActive,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      overflow: "hidden",
      fontWeight: "700",
      marginBottom: 16,
      fontSize: 13,
      borderWidth: 1,
      borderColor: "transparent",
    },
    accountingBillingNav: {
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    accountingBillingNavTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 8,
    },
    accountingBillingNavBody: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
    },
    notificationsHint: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
      marginTop: -4,
    },
    notificationsOnPill: {
      alignSelf: "flex-start",
      backgroundColor: accentTintActive,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      overflow: "hidden",
      fontWeight: "700",
      marginBottom: 12,
      fontSize: 13,
      borderWidth: 1,
      borderColor: "transparent",
    },
    notificationsWebHint: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
    },
    notificationsButton: {
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: "center",
      marginBottom: 8,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    notificationsButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    notificationsSecondary: {
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 8,
    },
    notificationsSecondaryText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    notificationsExtras: {
      marginTop: 4,
      marginBottom: 4,
      gap: 8,
    },
    notificationsTestButton: {
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: "center",
      marginTop: 8,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTintLight,
    },
    notificationsTestButtonDisabled: {
      opacity: 0.55,
    },
    notificationsTestButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    pushTokenFoot: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
      marginBottom: 4,
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 15,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      ...inputStyle(colors, { accentTint, accentTintLight, accentTintActive, mutedText: colors.text }),
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderRadius: 16,
      marginBottom: 16,
    },
    logoPickRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 8,
    },
    logoButton: {
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: "center",
      marginBottom: 10,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    logoButtonHalf: {
      flex: 1,
      marginBottom: 0,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    logoHint: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 10,
    },
    logoButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    logoPreview: {
      width: 160,
      height: 160,
      marginBottom: 10,
      alignSelf: "center",
      backgroundColor: "transparent",
    },
    addressColumnsRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
      marginBottom: 8,
    },
    addressColumn: {
      flex: 2,
      minWidth: 0,
    },
    addressColumnNarrow: {
      width: 80,
      flexShrink: 0,
    },
    addressColumnZip: {
      width: 118,
      flexShrink: 0,
    },
    addressColumnLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 4,
    },
    rowField: {
      marginBottom: 0,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 16,
    },
    submitButton: {
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 20,
      alignItems: "center",
      marginTop: 24,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    submitButtonText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
    },
    disabledButton: {
      opacity: 0.5,
    },
    navCardButton: {
      marginTop: 24,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: accentTint,
    },
    navCardButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
  });
}
