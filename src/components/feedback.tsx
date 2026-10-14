"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api/client";
import { recorderMime, recorderOptions } from "@/lib/blob-media";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useApp } from "@/lib/store";

const OPEN_EVENT = "konshu:feedback";
const TOPICS = ["publish", "bug", "idea", "other"] as const;
const VOICE_MAX_SEC = 60;

/** Opens the feedback sheet from anywhere (e.g. the Профиль row). */
export function openFeedback(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Shrinks a picked photo/screenshot to a JPEG of at most 1280px on the long side. */
async function shrinkPhoto(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const url = canvas.toDataURL("image/jpeg", 0.8);
    return url.length < 1_500_000 ? url : canvas.toDataURL("image/jpeg", 0.5);
  } catch {
    return null;
  }
}

async function appMeta(): Promise<{ platform: string; appVersion: string }> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return { platform: "web", appVersion: "" };
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    return { platform: Capacitor.getPlatform(), appVersion: `${info.version} (${info.build})` };
  } catch {
    return { platform: "web", appVersion: "" };
  }
}

function BubbleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 9.5h7M8.5 12h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Small floating «Помощь / пожелание» bubble + the bottom sheet. Lives in PhoneShell. */
/** `lifted`: focused flows have their own bottom buttons, so the bubble sits higher there. */
export function FeedbackLauncher({ showBubble, lifted = false }: { showBubble: boolean; lifted?: boolean }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    pushOverlay("feedback-sheet", () => setOpen(false));
    return () => removeOverlay("feedback-sheet");
  }, [open]);

  return (
    <>
      {showBubble && !open ? (
        <button
          type="button"
          aria-label={t.feedbackEntry}
          title={t.feedbackEntry}
          onClick={() => setOpen(true)}
          className="absolute left-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/90 text-muted shadow-[0_4px_14px_rgba(42,37,80,.12)] backdrop-blur desk:fixed desk:bottom-4 desk:left-6"
          style={{ bottom: lifted ? "88px" : "calc(var(--tabbar-h, 0px) + 12px)" }}
        >
          <BubbleIcon />
        </button>
      ) : null}
      {open ? <FeedbackSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { t, user } = useApp();
  const path = usePathname();
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<string>("");
  const [contact, setContact] = useState(() => user?.phone || user?.email || "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "rate">("idle");
  const recorder = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canVoice = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(
    () => () => {
      if (stopTimer.current) window.clearTimeout(stopTimer.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = recorderMime("audio");
      const rec = new MediaRecorder(stream, { ...recorderOptions("audio"), ...(mime ? { mimeType: mime } : {}) });
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
        if (blob.size) void readAsDataUrl(blob).then((url) => setVoice(url.length < 1_150_000 ? url : null));
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      stopTimer.current = window.setTimeout(() => rec.state === "recording" && rec.stop(), VOICE_MAX_SEC * 1000);
    } catch {
      setRecording(false);
    }
  };

  const stopVoice = () => {
    if (stopTimer.current) window.clearTimeout(stopTimer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const send = async () => {
    if (state === "sending") return;
    setState("sending");
    const meta = await appMeta();
    const res = await api("/api/feedback", {
      method: "POST",
      json: {
        text,
        topic: topic || undefined,
        contact,
        pageUrl: typeof window !== "undefined" ? window.location.pathname + window.location.search : path,
        platform: meta.platform,
        appVersion: meta.appVersion,
        photo: photo ?? undefined,
        voice: voice ?? undefined,
      },
    });
    setState(res.ok ? "done" : res.status === 429 ? "rate" : "error");
  };

  const empty = !text.trim() && !topic && !photo && !voice;

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-[rgba(42,37,80,.45)] desk:fixed desk:items-center desk:justify-center desk:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={t.feedbackEntry}
        className="sc max-h-[92%] w-full overflow-y-auto rounded-t-[26px] bg-surface px-5 pb-6 pt-3 desk:max-w-[480px] desk:rounded-[26px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        {state === "done" ? (
          <div className="py-8 text-center">
            <div className="text-[40px]">🙏</div>
            <div className="mt-2 font-display text-[19px] font-bold text-ink">{t.feedbackThanks}</div>
            <div className="mt-1 text-[14px] text-muted">{t.feedbackThanksNote}</div>
            <button type="button" onClick={onClose} className="mt-6 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen">
              {t.feedbackClose}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <h2 className="flex-1 font-display text-[17px] font-bold leading-[1.3] text-ink">{t.feedbackTitle}</h2>
              <button type="button" aria-label={t.feedbackClose} onClick={onClose} className="-mr-1 h-8 w-8 shrink-0 rounded-full text-[20px] leading-none text-muted">
                ×
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TOPICS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTopic((cur) => (cur === key ? "" : key))}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${topic === key ? "border-ink bg-ink text-screen" : "border-line bg-white text-ink"}`}
                >
                  {t.feedbackTopics[key]}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 4000))}
              placeholder={t.feedbackPlaceholder}
              rows={5}
              className="mt-3 w-full resize-none rounded-2xl border border-line bg-white px-3.5 py-3 text-[15px] text-ink outline-none focus:border-ink"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void shrinkPhoto(file).then(setPhoto);
                }}
              />
              {photo ? (
                <span className="flex items-center gap-2 rounded-xl border border-line bg-white p-1 pr-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  <button type="button" onClick={() => setPhoto(null)} className="text-[13px] font-semibold text-accent">{t.feedbackRemove}</button>
                </span>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-ink">
                  📎 {t.feedbackPhoto}
                </button>
              )}
              {canVoice ? (
                voice ? (
                  <span className="flex items-center gap-2 rounded-xl border border-line bg-white px-2 py-1">
                    <audio src={voice} controls className="h-8 max-w-[180px]" />
                    <button type="button" onClick={() => setVoice(null)} className="text-[13px] font-semibold text-accent">{t.feedbackRemove}</button>
                  </span>
                ) : recording ? (
                  <button type="button" onClick={stopVoice} className="h-10 rounded-xl bg-accent px-3 text-[13px] font-semibold text-white">
                    ● {t.feedbackStop}
                  </button>
                ) : (
                  <button type="button" onClick={() => void startVoice()} className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-ink">
                    🎤 {t.feedbackVoice}
                  </button>
                )
              ) : null}
            </div>
            <label className="mt-3 block text-[12px] font-semibold text-muted">{t.feedbackContact}</label>
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value.slice(0, 200))}
              inputMode="email"
              className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none focus:border-ink"
            />
            {state === "error" || state === "rate" ? (
              <div className="mt-2 text-[13px] text-accent">{state === "rate" ? t.feedbackRate : t.feedbackError}</div>
            ) : null}
            <button
              type="button"
              disabled={empty || recording || state === "sending"}
              onClick={() => void send()}
              className="mt-4 h-14 w-full rounded-2xl bg-ink text-[16px] font-bold text-screen disabled:opacity-40"
            >
              {state === "sending" ? "…" : t.feedbackSend}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
