import * as Linking from "expo-linking";

/**
 * Opens the given external URL directly in the device's system browser (Safari/Chrome).
 */
export async function openExternalUrl(
  url: string | null | undefined,
): Promise<void> {
  if (!url) return;

  try {
    await Linking.openURL(url);
  } catch (err) {
    console.error("Failed to open URL in device browser:", url, err);
  }
}
