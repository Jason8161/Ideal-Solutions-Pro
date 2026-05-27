import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import type { ClockEventPhoto } from "./types";

export type PhotoCaptureResult =
  | { ok: true; photo: ClockEventPhoto }
  | { ok: false; reason: "denied" | "cancelled" | "unavailable" };

export async function captureVerificationPhoto(
  kind: ClockEventPhoto["kind"] = "selfie",
): Promise<PhotoCaptureResult> {
  if (Platform.OS === "web") {
    return { ok: false, reason: "unavailable" };
  }

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    return { ok: false, reason: "denied" };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.6,
    allowsEditing: false,
    cameraType: kind === "selfie" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return { ok: false, reason: "cancelled" };
  }

  return {
    ok: true,
    photo: {
      localUri: result.assets[0].uri,
      kind,
      capturedAt: new Date().toISOString(),
    },
  };
}
