import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Pressable, Text } from "react-native";

import { AiFormField, AiToolFormScreen } from "@/components/aiAssistant/AiToolFormScreen";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { buildTroubleshootingPrompt } from "@/lib/aiAssistant";

export default function TroubleshootingAiScreen() {
  const { scStyles } = useBossManChrome();
  const [problemDescription, setProblemDescription] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [photoTaken, setPhotoTaken] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo access to note a jobsite image for ChatGPT.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled) {
      setPhotoTaken(true);
    }
  };

  return (
    <AiToolFormScreen
      title="Troubleshooting AI"
      subtitle="Diagnostic help — attach photo manually in ChatGPT"
      backHref="/employee/ai-assistant"
      onSubmit={() =>
        buildTroubleshootingPrompt({
          problemDescription,
          equipmentType,
          symptoms,
          photoTaken,
        })
      }
    >
      <AiFormField
        label="Problem description"
        value={problemDescription}
        onChangeText={setProblemDescription}
        placeholder="What is going wrong?"
        multiline
      />
      <AiFormField
        label="Equipment type"
        value={equipmentType}
        onChangeText={setEquipmentType}
        placeholder="Panel, motor, VFD, lighting circuit…"
      />
      <AiFormField
        label="Symptoms"
        value={symptoms}
        onChangeText={setSymptoms}
        placeholder="Tripping, buzzing, no power, intermittent…"
        multiline
      />
      <Pressable
        style={({ pressed }) => [scStyles.menuButton, pressed && { opacity: 0.9 }, { marginBottom: 8 }]}
        onPress={() => void pickPhoto()}
      >
        <Text style={scStyles.menuButtonText}>{photoTaken ? "Photo noted ✓ (attach in ChatGPT)" : "Add photo note (optional)"}</Text>
      </Pressable>
      <Text style={scStyles.emptyText}>
        Photos stay on your device. Ideal Solutions does not upload images — attach in ChatGPT after pasting the prompt.
      </Text>
    </AiToolFormScreen>
  );
}
