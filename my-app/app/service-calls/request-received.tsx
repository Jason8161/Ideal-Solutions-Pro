import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { useScStyles } from "@/components/serviceCalls/screenChrome";

export default function RequestReceivedScreen() {
  const scStyles = useScStyles();
  const { companyName, via } = useLocalSearchParams<{ companyName?: string; via?: string }>();
  const company = (companyName ?? "").trim() || "your contractor";
  const viaNorm = (via ?? "").trim();
  const isSms = viaNorm === "sms";
  const isCombo = viaNorm === "email-and-text";

  return (
    <ScrollView style={scStyles.screen} contentContainerStyle={scStyles.content}>
      <View style={scStyles.headerBlock}>
        <Text style={scStyles.title}>Your service request has been sent.</Text>
        <Text style={scStyles.subtitle}>
          {company} received your request and will follow up with you soon.
          {isCombo
            ? " If you also opened email or messages, tap Send there when you are ready."
            : isSms
              ? " If you opened Messages, tap Send to deliver your text."
              : " If you opened email, tap Send to deliver your message."}
        </Text>
      </View>
    </ScrollView>
  );
}
