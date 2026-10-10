"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { FEATURES } from "@/lib/features";
import { useApp } from "@/lib/store";

export const PLAY = "https://play.google.com/store/apps/details?id=com.koshuna.app";

/** Off until Step 26 (FEATURES.playBanner). Mobile browser only, never inside the app. */
export function PlayBanner() {
  const { t } = useApp();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!FEATURES.playBanner) return;
    try {
      if (Capacitor.getPlatform() === "ios" || Capacitor.isNativePlatform()) return;
    } catch {
      /* web */
    }
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setShow(mobile);
  }, []);

  if (!show) return null;
  return (
    <a
      href={PLAY}
      target="_blank"
      rel="noreferrer"
      className="play-store mt-3 block rounded-2xl border border-line bg-white px-4 py-3 text-center text-[13px] font-semibold text-ink"
    >
      {t.playBanner}
    </a>
  );
}
