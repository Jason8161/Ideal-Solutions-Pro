import * as ImagePicker from "expo-image-picker";

export type CompressedImage = {
  uri: string;
  mimeType: string;
  width?: number;
  height?: number;
};

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_COMPRESS = 0.82;

type ManipulatorModule = typeof import("expo-image-manipulator");

async function loadManipulator(): Promise<ManipulatorModule | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-image-manipulator") as ManipulatorModule;
  } catch {
    return null;
  }
}

/** Resize/compress a picked image; falls back to picker quality when manipulator unavailable. */
export async function compressLocalImage(
  uri: string,
  options?: { maxWidth?: number; compress?: number },
): Promise<CompressedImage> {
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const compress = options?.compress ?? DEFAULT_COMPRESS;
  const manipulator = await loadManipulator();

  if (!manipulator) {
    return { uri, mimeType: guessMimeFromUri(uri) };
  }

  const actions: import("expo-image-manipulator").Action[] = [];
  const context = await manipulator.manipulateAsync(uri, actions, {
    compress,
    format: manipulator.SaveFormat.JPEG,
  });

  let result = context;
  if (context.width && context.width > maxWidth) {
    result = await manipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress, format: manipulator.SaveFormat.JPEG },
    );
  }

  return {
    uri: result.uri,
    mimeType: "image/jpeg",
    width: result.width,
    height: result.height,
  };
}

function guessMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export type PickLocalImageOptions = {
  allowsMultiple?: boolean;
  selectionLimit?: number;
  maxWidth?: number;
  compress?: number;
};

/** Pick from library, compress locally — never uploads to cloud. */
export async function pickAndCompressFromLibrary(
  options?: PickLocalImageOptions,
): Promise<CompressedImage[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: options?.allowsMultiple ?? false,
    selectionLimit: options?.selectionLimit,
    quality: options?.compress ?? DEFAULT_COMPRESS,
  });

  if (result.canceled) return [];

  const out: CompressedImage[] = [];
  for (const asset of result.assets) {
    if (!asset.uri) continue;
    out.push(await compressLocalImage(asset.uri, options));
  }
  return out;
}
