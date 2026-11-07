"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { recorderMime, recorderOptions } from "@/lib/blob-media";
import type { ChatLine, ChatQuote } from "@/lib/chat";
import { hasNativeMic, requestNativeMic, type MicGate } from "@/lib/mic-permission";

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

type Phase = "idle" | "recording" | "locked";

export function ChatMic({
  disabled,
  cancelLabel,
  onSend,
  onDenied,
  onTap,
}: {
  disabled?: boolean;
  cancelLabel: string;
  onSend: (blob: Blob, seconds: number) => void;
  onDenied: (gate: Exclude<MicGate, "granted">) => void;
  /** Finger already up before a real recording started. */
  onTap: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cancel, setCancel] = useState(false);
  const [sec, setSec] = useState(0);
  const phaseRef = useRef<Phase>("idle");
  const holding = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const started = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const cap = useRef<number | null>(null);
  const cancelRef = useRef(false);

  const show = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };
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
  /** Back to the text field. Does not stop the encoder; callers stop the recorder first. */
  const clearUi = () => {
    clearTimers();
    cancelRef.current = false;
    setCancel(false);
    setSec(0);
    show("idle");
  };
  const stopRecorder = () => {
    const rec = media.current;
    media.current = null;
    if (!rec || rec.state === "inactive") return null;
    return rec;
  };
  const finish = (send: boolean) => {
    const elapsed = (Date.now() - started.current) / 1000;
    const rec = stopRecorder();
    clearUi();
    if (!rec) {
      stopTracks();
      return;
    }
    rec.onstop = () => {
      stopTracks();
      const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      if (send && elapsed >= 0.4 && blob.size > 0) onSend(blob, Math.min(MAX_SEC, Math.round(elapsed)));
      else if (send) onTap();
    };
    try {
      rec.stop();
    } catch {
      stopTracks();
    }
  };
  const discard = () => {
    const rec = stopRecorder();
    clearUi();
    if (!rec) {
      stopTracks();
      return;
    }
    rec.onstop = () => stopTracks();
    try {
      rec.stop();
    } catch {
      stopTracks();
    }
  };
  const reset = () => {
    const rec = stopRecorder();
    clearUi();
    if (!rec) {
      stopTracks();
      return;
    }
    rec.onstop = () => stopTracks();
    try {
      rec.stop();
    } catch {
      stopTracks();
    }
  };
  const finishRef = useRef(finish);
  const discardRef = useRef(discard);
  finishRef.current = finish;
  discardRef.current = discard;

  useEffect(() => {
    const move = (event: globalThis.PointerEvent) => {
      if (phaseRef.current !== "recording") return;
      const up = startY.current - event.clientY > 64;
      const left = startX.current - event.clientX > 72;
      if (up) {
        cancelRef.current = false;
        setCancel(false);
        show("locked");
        return;
      }
      cancelRef.current = left;
      setCancel(left);
    };
    const up = () => {
      holding.current = false;
      if (phaseRef.current === "locked") return;
      if (phaseRef.current === "recording") {
        if (cancelRef.current) discardRef.current();
        else finishRef.current(true);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const begin = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || phaseRef.current !== "idle") return;
    holding.current = true;
    startX.current = event.clientX;
    startY.current = event.clientY;
    cancelRef.current = false;
    const waitedAt = Date.now();
    const pendingMic = hasNativeMic() ? null : navigator.mediaDevices?.getUserMedia?.({ audio: true });
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
          reset();
          onDenied("denied");
          return;
        }
        const gate = await requestNativeMic();
        if (gate !== "granted") {
          if (pendingMic) pendingMic.then((live) => live.getTracks().forEach((track) => track.stop())).catch(() => undefined);
          reset();
          onDenied(gate);
          return;
        }
        if (!holding.current) {
          if (pendingMic) pendingMic.then((live) => live.getTracks().forEach((track) => track.stop())).catch(() => undefined);
          reset();
          if (Date.now() - waitedAt < 280) onTap();
          return;
        }
        const live = pendingMic ? await pendingMic : await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!holding.current || phaseRef.current === "locked") {
          live.getTracks().forEach((track) => track.stop());
          if (phaseRef.current === "idle" && Date.now() - waitedAt < 800) onTap();
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        if (!holding.current || phaseRef.current !== "idle") {
          live.getTracks().forEach((track) => track.stop());
          if (phaseRef.current === "idle") onTap();
          return;
        }
        stream.current = live;
        const mime = recorderMime("audio");
        const next = new MediaRecorder(live, { ...(mime ? { mimeType: mime } : {}), ...recorderOptions("audio") });
        chunks.current = [];
        next.ondataavailable = (item) => {
          if (item.data.size) chunks.current.push(item.data);
        };
        media.current = next;
        next.start();
        if (!holding.current) {
          discard();
          onTap();
          return;
        }
        started.current = Date.now();
        setSec(0);
        show("recording");
        timer.current = window.setInterval(() => setSec(Math.min(MAX_SEC, Math.floor((Date.now() - started.current) / 1000))), 200);
        cap.current = window.setTimeout(() => finish(!cancelRef.current && phaseRef.current !== "idle"), MAX_SEC * 1000);
      } catch {
        const stillHolding = holding.current;
        if (pendingMic) pendingMic.then((live) => live.getTracks().forEach((track) => track.stop())).catch(() => undefined);
        reset();
        if (stillHolding) onDenied("denied");
        else onTap();
      }
    })();
  };

  const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const live = phase !== "idle";

  return (
    <>
      {live ? (
        <div
          className={`absolute inset-y-0 left-0 right-14 z-[1] flex items-center gap-2 rounded-[22px] px-3 text-[13px] font-semibold ${cancel ? "bg-[#FDE8E8] text-accent" : "bg-white text-ink"}`}
          data-testid="chat-recording"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
          <span className="tabular-nums">{clock}</span>
          {phase === "locked" ? (
            <span className="min-w-0 flex-1 truncate text-right text-muted">🔒</span>
          ) : (
            <button
              type="button"
              data-testid="chat-voice-cancel"
              onPointerDown={(event) => {
                event.stopPropagation();
                discard();
              }}
              className="min-w-0 flex-1 truncate text-right"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      ) : null}
      {phase === "locked" ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="chat-voice-trash"
            onClick={() => discard()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-chip text-[18px]"
            aria-label={cancelLabel}
          >
            🗑
          </button>
          <button
            type="button"
            data-testid="chat-voice-send"
            onClick={() => finish(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-[18px] text-white"
            aria-label="send"
          >
            ➤
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="chat-mic"
          disabled={disabled}
          aria-label="mic"
          onPointerDown={(event) => begin(event)}
          onContextMenu={(event) => event.preventDefault()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[20px] text-white disabled:opacity-60"
        >
          <span aria-hidden>🎤</span>
        </button>
      )}
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
      style={{ touchAction: "none" }}
      onClick={() => {
        if (dragged.current) return;
        onClose();
      }}
      onPointerDown={(event) => {
        if (event.target instanceof HTMLImageElement) event.preventDefault();
        startX.current = event.clientX;
        dragged.current = false;
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
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        className="m-auto max-h-full max-w-full select-none object-contain"
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
