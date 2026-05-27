import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AiFormField, AiToolFormScreen } from "@/components/aiAssistant/AiToolFormScreen";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { buildCustomerMessagePrompt, type CustomerMessageTone } from "@/lib/aiAssistant";

const TONES: CustomerMessageTone[] = ["Professional", "Friendly", "Urgent"];

export default function CustomerMessageAiScreen() {
  const { scStyles } = useBossManChrome();
  const [customerName, setCustomerName] = useState("");
  const [situation, setSituation] = useState("");
  const [tone, setTone] = useState<CustomerMessageTone>("Professional");

  return (
    <AiToolFormScreen
      title="Customer Message AI"
      subtitle="Draft a customer-facing message"
      backHref="/employee/ai-assistant"
      onSubmit={() =>
        buildCustomerMessagePrompt({
          customerName,
          situation,
          tone,
        })
      }
    >
      <AiFormField label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Customer or site contact" />
      <AiFormField
        label="Situation"
        value={situation}
        onChangeText={setSituation}
        placeholder="What happened or what do they need to know?"
        multiline
      />
      <Text style={[scStyles.menuButtonText, { marginBottom: 8 }]}>Tone</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {TONES.map((option) => (
          <Pressable
            key={option}
            style={({ pressed }) => [
              scStyles.chip,
              tone === option && scStyles.chipActive,
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => setTone(option)}
          >
            <Text style={[scStyles.chipText, tone === option && scStyles.chipTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </AiToolFormScreen>
  );
}
