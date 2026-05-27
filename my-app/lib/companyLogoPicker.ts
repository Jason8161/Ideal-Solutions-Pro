import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";

export const MAX_LOGO_BYTES = 20 * 1024 * 1024;

function isUsableLogoAsset(asset: DocumentPicker.DocumentPickerAsset): boolean {
  const mime = (asset.mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const name = (asset.name ?? "").toLowerCase();
  return /\.(png|jpe?g|webp|heic|heif|gif|bmp|tif|tiff)$/i.test(name);
}

function alertPhotosPermissionNeeded(): void {
  Alert.alert(
    "Photos access needed",
    "Allow photo library access to choose a company logo from your device.",
    Platform.OS === "web"
      ? [{ text: "OK", style: "default" }]
      : [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
  );
}

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.granted) return true;
  alertPhotosPermissionNeeded();
  return false;
}

export async function pickCompanyLogoFromLibrary(): Promise<string | null> {
  return pickImageFromLibrary({ allowsEditing: true, aspect: [1, 1] });
}

/** Full image from photo library (no square crop) — button images, etc. */
export async function pickImageFromLibrary(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
}): Promise<string | null> {
  if (!(await ensureMediaLibraryPermission())) return null;

  const allowsEditing = options?.allowsEditing ?? false;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing,
    ...(allowsEditing && options?.aspect ? { aspect: options.aspect } : {}),
    quality: 0.85,
  });

  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

export async function pickCompanyLogoFromFiles(): Promise<string | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    if (!asset?.uri) {
      Alert.alert(
        "Could not read file",
        "Try another image, or use Photo library to pick from your camera roll.",
      );
      return null;
    }

    if (asset.size != null && asset.size > MAX_LOGO_BYTES) {
      Alert.alert("File too large", "Pick a logo image under 20 MB.");
      return null;
    }

    if (!isUsableLogoAsset(asset)) {
      Alert.alert(
        "Image required",
        "Choose a picture file (PNG, JPG, WEBP, etc.). PDFs and Word documents cannot be used as a logo.",
      );
      return null;
    }

    return asset.uri;
  } catch {
    Alert.alert("File picker unavailable", "Try Photo library instead, or try again in a moment.");
    return null;
  }
}
