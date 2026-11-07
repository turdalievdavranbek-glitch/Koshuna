"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { recorderMime, recorderOptions } from "@/lib/blob-media";
import type { ChatLine, ChatQuote } from "@/lib/chat";

const MAX_SEC = 120;

export function quoteSnippet(
  line: Pick<ChatLine, "kind" | "text" | "deleted"> | ChatQuote,
  labels: { deleted: string; voice: string; photo: string },
): string {
  if (line.deleted) return labels.deleted;
  if (line.kind === "voice") return labels.voice;
  if (line.kind === "photo") return labels.photo;
  return (line.text || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function QuoteChip({
  quote,
  mine,
  you,
  peer,
  labels,
  onJump,
}: {
  quote: ChatQuote;
  mine: boolean;
  you: string;
  peer: string;
  labels: { deleted: string; voice: string; photo: string };
  onJump: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onJump();
      }}
      className="mb-1.5 block w-full rounded-[10px] border-l-2 px-2 py-1 text-left"
      style={{
        borderColor: mine ? "#FFFFFF" : "#E31E24",
        background: mine ? "rgba(255,255,255,.12)" : "#F4F4F5",
      }}
    >
      <div className="text-[11px] font-bold" style={{ color: mine ? "#FFFFFF" : "#E31E24" }}>
        {quote.mine ? you : peer}
      </div>
      <div className="truncate text-[12px]" style={{ color: mine ? "rgba(245,245,247,.8)" : "#52525B" }}>
        {quoteSnippet(quote, labels)}
      </div>
    </button>
  );
}

export function VoiceBubble({ src, seconds, mine }: { src: string; seconds?: number | null; mine: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [len, setLen] = useState(seconds && seconds > 0 ? seconds : 0);
  const ink = mine ? "#F5F5F7" : "#18181B";
  const dim = mine ? "rgba(245,245,247,.65)" : "#71717A";

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const onTime = () => setAt(el.currentTime);
    const onMeta = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setLen(el.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setAt(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const shown = len || seconds || 0;
  const progress = shown > 0 ? Math.min(1, at / shown) : 0;
  const clock = (value: number) => {
    const n = Math.max(0, Math.round(value));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-[52px] min-w-[180px] items-center gap-2.5" data-testid="chat-voice">
      <audio ref={audio} src={src} preload="metadata" />
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
        aria-label={playing ? "pause" : "play"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: mine ? "rgba(255,255,255,.16)" : "#F4F4F5" }}
      >
        <span className="text-[14px]" style={{ color: ink }}>
          {playing ? "❚❚" : "▶"}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="h-1 overflow-hidden rounded-full" style={{ background: mine ? "rgba(255,255,255,.25)" : "#E4E4E7" }}>
          <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: mine ? "#FFFFFF" : "#18181B" }} />
        </div>
        <div className="mt-1 text-[11px] tabular-nums" style={{ color: dim }}>
          {clock(playing ? at : shown)}
        </div>
      </div>
    </div>
  );
}

export function ChatMic({
  disabled,
  cancelLabel,
  onSend,
  onDenied,
  onShort,
  onLive,
}: {
  disabled?: boolean;
  cancelLabel: string;
  onSend: (blob: Blob, seconds: number) => void;
  onDenied: () => void;
  onShort: () => void;
  onLive?: (live: boolean) => void;
}) {
  const [rec, setRec] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [sec, setSec] = useState(0);
  const startX = useRef(0);
  const started = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const cap = useRef<number | null>(null);
  const cancelRef = useRef(false);

  const stopTracks = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  const clearTimers = () => {
    if (timer.current) window.clearInterval(timer.current);
    if (cap.current) window.clearTimeout(cap.current);
    timer.current = null;
    cap.current = null;
  };

  const finish = (send: boolean) => {
    clearTimers();
    const elapsed = (Date.now() - started.current) / 1000;
    const rec = media.current;
    media.current = null;
    setRec(false);
    onLive?.(false);
    setCancel(false);
    if (!rec || rec.state === "inactive") {
      stopTracks();
      return;
    }
    rec.onstop = () => {
      stopTracks();
      const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      if (send && elapsed >= 0.4 && blob.size > 0) onSend(blob, Math.min(MAX_SEC, Math.round(elapsed)));
      else if (send) onShort();
    };
    rec.stop();
  };

  const begin = async (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || rec) return;
    event.preventDefault();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onDenied();
      return;
    }
    try {
      const live = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = live;
      const mime = recorderMime("audio");
      const next = new MediaRecorder(live, { ...(mime ? { mimeType: mime } : {}), ...recorderOptions("audio") });
      chunks.current = [];
      next.ondataavailable = (item) => {
        if (item.data.size) chunks.current.push(item.data);
      };
      media.current = next;
      next.start();
      started.current = Date.now();
      startX.current = event.clientX;
      cancelRef.current = false;
      setCancel(false);
      setSec(0);
      setRec(true);
      onLive?.(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      timer.current = window.setInterval(() => setSec(Math.min(MAX_SEC, Math.floor((Date.now() - started.current) / 1000))), 200);
      cap.current = window.setTimeout(() => finish(!cancelRef.current), MAX_SEC * 1000);
    } catch {
      stopTracks();
      onDenied();
    }
  };

  return (
    <>
      {rec ? (
        <div className={`flex h-11 min-w-0 flex-1 items-center justify-between rounded-full px-3 text-[13px] font-semibold ${cancel ? "bg-[#FDE8E8] text-accent" : "bg-ink text-screen"}`}>
          <span className="tabular-nums">{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</span>
          <span className="truncate">{cancelLabel}</span>
        </div>
      ) : null}
      <button
        type="button"
        data-testid="chat-mic"
        disabled={disabled}
        aria-label="mic"
        onPointerDown={(event) => void begin(event)}
        onPointerMove={(event) => {
          if (!rec) return;
          const left = startX.current - event.clientX > 72;
          cancelRef.current = left;
          setCancel(left);
        }}
        onPointerUp={() => {
          if (rec) finish(!cancelRef.current);
        }}
        onPointerCancel={() => {
          if (rec) finish(false);
        }}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[20px] ${rec ? "bg-accent" : "bg-ink"} disabled:opacity-60`}
      >
        <span aria-hidden>🎤</span>
      </button>
    </>
  );
}

export function PhotoStrip({
  urls,
  mine,
  onOpen,
}: {
  urls: string[];
  mine: boolean;
  onOpen: (index: number) => void;
}) {
  const grid = urls.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={`grid w-[220px] max-w-full shrink-0 ${grid} gap-1`}>
      {urls.map((url, index) => (
        <button
          key={`${url}-${index}`}
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(index);
          }}
          className={`overflow-hidden rounded-[10px] bg-chip ${urls.length === 1 ? "h-44" : "h-24"} ${urls.length === 3 && index === 0 ? "col-span-2 h-36" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
      {mine ? null : null}
    </div>
  );
}

export function PhotoViewer({
  urls,
  index,
  onClose,
  onIndex,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const startX = useRef(0);
  const dragged = useRef(false);
  const current = urls[index] ?? urls[0];
  const step = (clientX: number) => {
    const dx = clientX - startX.current;
    if (urls.length < 2 || Math.abs(dx) < 48) return;
    if (dx > 0 && index > 0) onIndex(index - 1);
    else if (dx < 0 && index < urls.length - 1) onIndex(index + 1);
  };
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black"
      data-testid="chat-photo-view"
      onClick={() => {
        if (dragged.current) return;
        onClose();
      }}
      onPointerDown={(event) => {
        startX.current = event.clientX;
        dragged.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (Math.abs(event.clientX - startX.current) > 8) dragged.current = true;
      }}
      onPointerUp={(event) => step(event.clientX)}
    >
      <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 h-10 w-10 rounded-full bg-white/90 text-[18px] text-ink">
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        className="m-auto max-h-full max-w-full object-contain"
        onClick={(event) => event.stopPropagation()}
      />
      {urls.length > 1 ? (
        <div className="pb-6 text-center text-[13px] font-semibold text-white">
          {index + 1} / {urls.length}
        </div>
      ) : null}
    </div>
  );
}
