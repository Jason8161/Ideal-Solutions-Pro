import { Linking, Pressable, Text, View } from "react-native";

import { useScStyles } from "@/components/serviceCalls/screenChrome";
import type { ServiceCallRecord } from "@/lib/serviceCallStorage";

export function ServiceCallContactActions({ record }: { record: ServiceCallRecord }) {
  const scStyles = useScStyles();
  const phone =
    record.fields.phoneMobile.trim() ||
    record.fields.phoneHome.trim() ||
    record.fields.phoneWork.trim();
  const email = record.fields.email.trim() || record.fields.emailAlt.trim();

  const call = () => {
    if (!phone) return;
    void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`);
  };
  const text = () => {
    if (!phone) return;
    void Linking.openURL(`sms:${phone.replace(/[^\d+]/g, "")}`);
  };
  const mail = () => {
    if (!email) return;
    void Linking.openURL(`mailto:${encodeURIComponent(email)}`);
  };

  if (!phone && !email) return null;

  return (
    <View style={scStyles.actionRow}>
      {phone ? (
        <>
          <Pressable
            onPress={call}
            style={({ pressed }) => [scStyles.menuButton, scStyles.menuButtonSecondary, pressed && { opacity: 0.9 }]}
          >
            <Text style={scStyles.menuButtonSecondaryText}>Call</Text>
          </Pressable>
          <Pressable
            onPress={text}
            style={({ pressed }) => [scStyles.menuButton, scStyles.menuButtonSecondary, pressed && { opacity: 0.9 }]}
          >
            <Text style={scStyles.menuButtonSecondaryText}>Text</Text>
          </Pressable>
        </>
      ) : null}
      {email ? (
        <Pressable
          onPress={mail}
          style={({ pressed }) => [scStyles.menuButton, scStyles.menuButtonSecondary, pressed && { opacity: 0.9 }]}
        >
          <Text style={scStyles.menuButtonSecondaryText}>Email</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
