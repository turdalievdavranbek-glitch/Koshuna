"use client";

import { useRef, useState } from "react";
import { Photo } from "./ui";

export function ShopThumb({
  cover,
  video,
  compact,
}: {
  cover?: string;
  video?: string;
  compact?: boolean;
}) {
  const inner = compact ? "h-[72px] w-[72px]" : "h-[92px] w-[92px]";
  return (
    <div
      className={`relative shrink-0 rounded-full p-[2.5px] ${inner}`}
      style={{ background: "linear-gradient(145deg, #E31E24 0%, #18181B 78%)" }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full bg-chip">
        {cover ? <Photo src={cover} alt="" /> : <div className="h-full w-full bg-ink" />}
        {video ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(24,24,27,.72)] pl-0.5 text-[11px] text-white">
              ▶
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Poster until tap, then the same clip plays with sound. */
export function GreetingVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  return (
    <button
      type="button"
      data-testid="shop-greeting"
      onClick={() => {
        const el = ref.current;
        if (!el) return;
        if (!sound) {
          el.muted = false;
          setSound(true);
          void el.play();
          return;
        }
        if (el.paused) void el.play();
        else el.pause();
      }}
      className="relative block w-full overflow-hidden rounded-[18px] bg-ink text-left"
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        className="max-h-[60vh] w-full object-contain"
      />
      {sound ? null : (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(24,24,27,.72)] pl-1 text-[18px] text-white">▶</span>
        </span>
      )}
    </button>
  );
}

export function ShopVideo({ src, poster }: { src: string; poster?: string }) {
  return (
    <video
      src={src}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      className="max-h-[360px] w-full bg-ink object-contain"
    />
  );
}
