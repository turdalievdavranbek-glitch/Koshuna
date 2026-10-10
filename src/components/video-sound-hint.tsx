"use client";

import { useApp } from "@/lib/store";

/** Shown over a full-screen video when the browser blocked autoplay with sound. One tap turns sound on. */
export function VideoSoundHint({ onTap }: { onTap: () => void }) {
  const { t } = useApp();
  return (
    <button
      type="button"
      data-testid="video-sound-hint"
      onClick={(event) => {
        event.stopPropagation();
        onTap();
      }}
      className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 px-5 py-3 text-[15px] font-semibold text-white"
    >
      {t.videoTapForSound}
    </button>
  );
}
