"use client";

import { type ChangeEvent, type RefObject } from "react";

type Props = {
  cameraRef: RefObject<HTMLInputElement | null>;
  galleryRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onGalleryFiles?: (files: File[]) => void;
  galleryTestId?: string;
  /** Gallery must not set capture, or Android WebView opens the camera. */
  galleryAccept?: string;
  galleryMultiple?: boolean;
};

/** Android WebView writes the chosen file after onChange, so a sync clear is lost and the next pick (even the same file) never fires. */
export function resetFileInput(input: HTMLInputElement | null | undefined) {
  if (!input) return;
  input.value = "";
  window.setTimeout(() => {
    input.value = "";
  }, 0);
}

/** Clear first, then open. A leftover value blocks the picker from reporting the next file. */
export function openFileInput(input: HTMLInputElement | null | undefined) {
  if (!input) return;
  input.value = "";
  input.click();
}

function takeFiles(e: ChangeEvent<HTMLInputElement>, onFiles: (files: File[]) => void) {
  const input = e.currentTarget;
  const files = Array.from(input.files ?? []);
  resetFileInput(input);
  if (files.length) onFiles(files);
}

const VIDEO_EXT = /\.(mp4|mov|webm|mkv|m4v|3gp)$/i;

export function isGalleryVideo(file: File): boolean {
  if (file.type.startsWith("video")) return true;
  if (file.type.startsWith("image")) return false;
  return VIDEO_EXT.test(file.name);
}

/** Same native camera path as bazaar «Быстрое объявление»: capture=environment. */
export function NativePhotoInputs({
  cameraRef,
  galleryRef,
  onFile,
  onGalleryFiles,
  galleryTestId,
  galleryAccept = "image/*",
  galleryMultiple = false,
}: Props) {
  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => takeFiles(e, (files) => onFile(files[0]))}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={galleryAccept}
        multiple={galleryMultiple}
        data-testid={galleryTestId}
        className="hidden"
        onChange={(e) => takeFiles(e, (files) => (onGalleryFiles ? onGalleryFiles(files) : onFile(files[0])))}
      />
    </>
  );
}
