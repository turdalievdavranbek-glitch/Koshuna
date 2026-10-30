"use client";

import { usePathname, useRouter } from "next/navigation";
import type { LocateError } from "@/lib/locate";
import { useApp } from "@/lib/store";
import { openLocationPicker } from "@/components/location-line";

export function GeoError({
  error,
  onRetry,
  onManual,
  compact,
}: {
  error: LocateError;
  onRetry: () => void;
  onManual?: () => void;
  compact?: boolean;
}) {
  const { t } = useApp();
  const router = useRouter();
  const path = usePathname();
  const text =
    error === "denied"
      ? t.geoDenied
      : error === "off"
        ? t.geoOff
        : error === "timeout"
          ? t.geoTimeout
          : error === "outside"
            ? t.geoOutside
            : t.geoInsecure;
  const retry = error === "off" || error === "timeout";
  const manual = () => (onManual ? onManual() : openLocationPicker(router, path || "/"));

  return (
    <div role="status" aria-live="polite" className={compact ? "text-[12px] leading-[1.4] text-muted" : "text-[13px] leading-[1.4] text-muted"}>
      <p>{text}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {retry ? (
          <button type="button" onClick={onRetry} className="h-9 rounded-xl bg-accent px-3 text-[13px] font-semibold text-accent-on">
            {t.geoRetry}
          </button>
        ) : null}
        <button type="button" onClick={manual} className="h-9 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-ink">
          {t.geoPickManual}
        </button>
      </div>
    </div>
  );
}
