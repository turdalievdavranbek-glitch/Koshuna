"use client";

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
      style={{ background: "linear-gradient(145deg, #B8452F 0%, #17140F 78%)" }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full bg-chip">
        {cover ? <Photo src={cover} alt="" /> : <div className="h-full w-full bg-ink" />}
        {video ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(23,20,15,.72)] pl-0.5 text-[11px] text-white">
              ▶
            </span>
          </span>
        ) : null}
      </div>
    </div>
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
