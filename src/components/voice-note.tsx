"use client";

import { useEffect, useState } from "react";
import { voiceScript } from "@/lib/share";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";

export function VoiceNote({ listing }: { listing: Listing }) {
  const { t, lang } = useApp();
  const [on, setOn] = useState(false);
  const [tick, setTick] = useState(0);
  const sec = listing.voiceSec ?? 10;
  const script = voiceScript(listing, lang);

  useEffect(() => {
    if (!on) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const s = Math.min(sec, Math.floor((Date.now() - started) / 1000));
      setTick(s);
      if (s >= sec) setOn(false);
    }, 200);
    return () => window.clearInterval(id);
  }, [on, sec]);

  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setOn(true);
      setTick(0);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(script);
    u.lang = lang === "en" ? "en-US" : "ru-RU";
    u.rate = 0.92;
    u.onend = () => setOn(false);
    setOn(true);
    setTick(0);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setOn(false);
  };

  if (!listing.voiceText && !listing.voiceTextKy && !listing.voiceUrl) return null;

  return (
    <div className="mt-5 rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.voiceOwner}</div>
      <p className="mt-1 text-[13px] leading-[1.45] text-muted">{t.voiceHint}</p>
      <button
        type="button"
        onClick={on ? stop : speak}
        className="mt-3 flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left"
        style={{ background: on ? "#17140F" : "#F7F3EC" }}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: on ? "#B8452F" : "#17140F" }}
        >
          <span className="text-[13px] font-bold text-white">{on ? "■" : "▶"}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold" style={{ color: on ? "#F7F3EC" : "#17140F" }}>
            {on ? t.voicePlaying : t.voicePlay}
          </span>
          <span className="mt-0.5 block text-[12px]" style={{ color: on ? "rgba(247,243,236,.65)" : "#6E6558" }}>
            0:{String(on ? tick : sec).padStart(2, "0")} · {t.voiceOral}
          </span>
        </span>
      </button>
      {listing.voiceUrl ? <audio src={listing.voiceUrl} controls className="mt-3 w-full" /> : null}
      <p className="mt-3 text-[14px] leading-[1.5] text-ink-2">{script}</p>
    </div>
  );
}
