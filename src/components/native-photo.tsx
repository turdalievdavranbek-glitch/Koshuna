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

function takeFiles(e: ChangeEvent<HTMLInputElement>, onFiles: (files: File[]) => void) {
  const files = Array.from(e.target.files ?? []);
  e.target.value = "";
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
