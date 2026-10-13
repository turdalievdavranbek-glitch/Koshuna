"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";

/** Common emojis, no library. */
export const COMMON_EMOJIS = [
  "😊", "😂", "🤣", "😍", "🥰", "😘", "😉", "😎", "🤔", "😅",
  "😁", "🙂", "😇", "🤗", "😋", "😜", "😢", "😭", "😮", "😱",
  "😡", "🥺", "😴", "🙄", "👍", "👎", "👌", "✌️", "🤝", "🙏",
  "👏", "💪", "👋", "❤️", "💜", "💔", "🔥", "✨", "⭐", "🎉",
  "🎁", "💯", "✅", "❌", "⚡", "☀️", "🌸", "🌹", "🍎", "🍞",
  "🍉", "☕", "🏠", "🚗", "📦", "💰", "📞", "⏰", "📍", "🇰🇬",
];

const KEY = "konshu.emoji.recent";
const RECENT_MAX = 10;

export function readRecentEmojis(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(emoji: string): string[] {
  const next = [emoji, ...readRecentEmojis().filter((x) => x !== emoji)].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

export function EmojiPanel({ onPick }: { onPick: (emoji: string) => void }) {
  const { t } = useApp();
  const [recent, setRecent] = useState<string[]>(() => readRecentEmojis());
  const pick = (emoji: string) => {
    setRecent(pushRecent(emoji));
    onPick(emoji);
  };
  const cell = (emoji: string, key: string) => (
    <button
      key={key}
      type="button"
      // Keep focus (and the caret) in the input.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => pick(emoji)}
      className="flex h-10 items-center justify-center rounded-xl text-[24px] leading-none active:scale-90 active:bg-chip"
    >
      {emoji}
    </button>
  );
  return (
    <div data-testid="emoji-panel" className="clay-card mx-3 mb-2 max-h-[240px] overflow-y-auto rounded-[20px] border border-line bg-white px-2 pb-2 pt-1.5">
      {recent.length ? (
        <>
          <div className="px-1.5 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-2">{t.emojiRecent}</div>
          <div className="grid grid-cols-8 gap-0.5 pb-1.5">{recent.map((e) => cell(e, `r-${e}`))}</div>
        </>
      ) : null}
      <div className="px-1.5 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-2">{t.emojiAll}</div>
      <div className="grid grid-cols-8 gap-0.5">{COMMON_EMOJIS.map((e) => cell(e, e))}</div>
    </div>
  );
}
