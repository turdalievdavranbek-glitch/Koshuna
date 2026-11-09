/**
 * Native share sheet for the Android app (APK 1.4+: @capacitor/share + @capacitor/filesystem).
 * Older APKs do not ship these plugins: every helper then returns false and the caller keeps
 * the web behaviour (navigator.share, the share dialog, a download).
 */
import { Capacitor } from "@capacitor/core";

export function nativeShareAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Share");
  } catch {
    return false;
  }
}

export function nativeShareFilesAvailable(): boolean {
  try {
    return nativeShareAvailable() && Capacitor.isPluginAvailable("Filesystem");
  } catch {
    return false;
  }
}

function isCancel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /cancel/i.test(msg);
}

/** Opens the system share sheet with a link. Returns true when the sheet was handled (shared or cancelled). */
export async function nativeShareLink(input: { title: string; text: string; url: string }): Promise<boolean> {
  if (!nativeShareAvailable()) return false;
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: input.title, text: input.text, url: input.url, dialogTitle: input.title });
    return true;
  } catch (err) {
    return isCancel(err);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const raw = String(reader.result || "");
      const comma = raw.indexOf(",");
      resolve(comma >= 0 ? raw.slice(comma + 1) : raw);
    };
    reader.readAsDataURL(blob);
  });
}

/** Writes the image to the app cache and shares it through the system share sheet. Returns true when handled. */
export async function nativeShareImage(input: {
  blob: Blob;
  fileName: string;
  title: string;
  text?: string;
}): Promise<boolean> {
  if (!nativeShareFilesAvailable()) return false;
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await blobToBase64(input.blob);
    const saved = await Filesystem.writeFile({ path: input.fileName, data, directory: Directory.Cache });
    await Share.share({ title: input.title, text: input.text, files: [saved.uri], dialogTitle: input.title });
    return true;
  } catch (err) {
    return isCancel(err);
  }
}
