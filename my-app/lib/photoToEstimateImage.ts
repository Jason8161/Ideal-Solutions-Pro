import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync } from "expo-file-system/legacy";

import { compressLocalImage } from "@/lib/media/localImagePipeline";
import type { PhotoEstimateImagePayload } from "@/lib/photoToEstimateTypes";

export const MAX_PHOTO_ESTIMATE_IMAGES = 4;

export type PickedEstimatePhoto = {
  uri: string;
  mimeType: string;
};

function guessMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/jpeg";
  return "image/jpeg";
}

export async function pickEstimatePhotosFromLibrary(
  existingCount: number,
): Promise<PickedEstimatePhoto[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    alert("Permission to access photos is needed to analyze job images.");
    return [];
  }

  const remaining = Math.max(0, MAX_PHOTO_ESTIMATE_IMAGES - existingCount);
  if (remaining === 0) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: remaining > 1,
    selectionLimit: remaining,
    quality: 0.72,
  });

  if (result.canceled) return [];

  const picked: PickedEstimatePhoto[] = [];
  for (const asset of result.assets) {
    if (!asset.uri) continue;
    const compressed = await compressLocalImage(asset.uri);
    picked.push({
      uri: compressed.uri,
      mimeType: compressed.mimeType,
    });
  }
  return picked;
}

export async function encodeEstimatePhotoForApi(
  photo: PickedEstimatePhoto,
): Promise<PhotoEstimateImagePayload> {
  const base64 = await readAsStringAsync(photo.uri, { encoding: "base64" });
  const mimeType = photo.mimeType.startsWith("image/") ? photo.mimeType : guessMimeFromUri(photo.uri);
  return { base64, mimeType };
}
