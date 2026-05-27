import { Asset } from "expo-asset";

/** Resolves a Metro `require()` image module to a `file://` URI suitable for `FileSystem.copyAsync`. */
export async function getCopyableUriFromBundledImage(assetModule: number): Promise<string> {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error("Could not load bundled image.");
  }
  return uri;
}
