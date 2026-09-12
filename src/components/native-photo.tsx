"use client";

import { type ChangeEvent, type RefObject } from "react";

type Props = {
  cameraRef: RefObject<HTMLInputElement | null>;
  galleryRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
};

function takeFile(e: ChangeEvent<HTMLInputElement>, onFile: (file: File) => void) {
  const file = e.target.files?.[0];
  if (file) onFile(file);
  e.target.value = "";
}

/** Same native camera path as bazaar «Быстрое объявление»: capture=environment. */
export function NativePhotoInputs({ cameraRef, galleryRef, onFile }: Props) {
  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => takeFile(e, onFile)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => takeFile(e, onFile)}
      />
    </>
  );
}
