import { useCallback, useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  DEFAULT_CLOCK_VERIFICATION_PREFERENCES,
  loadClockVerificationPreferences,
  saveClockVerificationPreferences,
  setSupervisorOverrideActive,
  type ClockVerificationPreferences,
} from "@/lib/clockVerification";

type Props = {
  compact?: boolean;
};

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  scStyles,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  scStyles: ReturnType<typeof useBossManChrome>["scStyles"];
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={scStyles.cardTitle}>{label}</Text>
        {hint ? <Text style={scStyles.cardMeta}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function ClockVerificationSettings({ compact }: Props) {
  const { scStyles, styles } = useBossManChrome();
  const { colors } = useAppTheme();
  const input = inputStyle(colors);
  const [prefs, setPrefs] = useState<ClockVerificationPreferences>(
    DEFAULT_CLOCK_VERIFICATION_PREFERENCES,
  );
  const [distanceText, setDistanceText] = useState(
    String(DEFAULT_CLOCK_VERIFICATION_PREFERENCES.geofenceDistanceFeet),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadClockVerificationPreferences().then((loaded) => {
      setPrefs(loaded);
      setDistanceText(String(loaded.geofenceDistanceFeet));
    });
  }, []);

  const persist = useCallback(async (next: ClockVerificationPreferences) => {
    const savedPrefs = await saveClockVerificationPreferences(next);
    setPrefs(savedPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const update = (patch: Partial<ClockVerificationPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    void persist(next);
  };

  return (
    <View style={[scStyles.card, { gap: compact ? 10 : 14 }]}>
      {!compact ? (
        <>
          <Text style={scStyles.cardTitle}>GPS clock verification</Text>
          <Text style={scStyles.cardMeta}>
            One-shot location at punch time only — no live tracking. Lightweight verification for contractors.
          </Text>
        </>
      ) : null}

      <ToggleRow
        label="GPS verification"
        hint="Capture location at clock-in and clock-out."
        value={prefs.gpsVerificationEnabled}
        onValueChange={(v) => update({ gpsVerificationEnabled: v })}
        scStyles={scStyles}
      />
      <ToggleRow
        label="Geo-fence clock-in"
        hint="Require punch within distance of jobsite."
        value={prefs.geofencingEnabled}
        onValueChange={(v) => update({ geofencingEnabled: v })}
        scStyles={scStyles}
      />
      {prefs.geofencingEnabled ? (
        <View>
          <Text style={scStyles.cardMeta}>Geo-fence distance (feet)</Text>
          <VoiceTextInput
            style={[input, { marginTop: 6 }]}
            value={distanceText}
            onChangeText={setDistanceText}
            keyboardType="number-pad"
            placeholder="500"
            placeholderTextColor={placeholderTextColor(colors)}
            onBlur={() => {
              const n = parseInt(distanceText, 10);
              if (Number.isFinite(n)) update({ geofenceDistanceFeet: n });
            }}
          />
        </View>
      ) : null}
      <ToggleRow
        label="Photo verification"
        hint="Optional selfie or jobsite photo at punch."
        value={prefs.photoVerificationEnabled}
        onValueChange={(v) => update({ photoVerificationEnabled: v })}
        scStyles={scStyles}
      />
      <ToggleRow
        label="Allow offline clock-ins"
        hint="Queue punches locally when server unreachable."
        value={prefs.offlineClockInsAllowed}
        onValueChange={(v) => update({ offlineClockInsAllowed: v })}
        scStyles={scStyles}
      />
      <ToggleRow
        label="Require assigned jobsite"
        hint="Employee must pick a job before clock-in."
        value={prefs.requireAssignedJobsite}
        onValueChange={(v) => update({ requireAssignedJobsite: v })}
        scStyles={scStyles}
      />
      <ToggleRow
        label="Supervisor override"
        hint="Allow bypass when geo-fence blocks punch."
        value={prefs.supervisorOverrideAllowed}
        onValueChange={(v) => update({ supervisorOverrideAllowed: v })}
        scStyles={scStyles}
      />
      {prefs.supervisorOverrideAllowed ? (
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => void setSupervisorOverrideActive(true)}
        >
          <Text style={scStyles.menuButtonText}>Enable override this session</Text>
        </Pressable>
      ) : null}
      {saved ? <Text style={scStyles.cardMeta}>Settings saved.</Text> : null}
    </View>
  );
}
