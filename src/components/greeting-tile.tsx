"use client";

import { useEffect, useRef, useState } from "react";
import { captureVideoPoster, recorderMime, recorderOptions, releaseBlob, rememberBlob, videoFileDuration } from "@/lib/blob-media";
import { greetingVideoMaxSeconds, videoMaxBytes } from "@/lib/media-limits";
import { useApp } from "@/lib/store";
import { openFileInput, resetFileInput } from "./native-photo";

export function GreetingTile({
  videoUrl,
  poster,
  onChange,
  variant = "tile",
  onBusy,
}: {
  videoUrl?: string;
  poster?: string;
  onChange: (next: { greetingVideo?: string; greetingPoster?: string }) => void;
  /** Wizard step matches the facade photo screen. The tile is the compact form control. */
  variant?: "tile" | "wizard";
  onBusy?: (busy: boolean) => void;
}) {
  const { t } = useApp();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraFileRef = useRef<HTMLInputElement>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stopTimer = useRef<number | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const stopTracks = () => {
    window.clearTimeout(stopTimer.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (liveRef.current) liveRef.current.srcObject = null;
  };

  useEffect(() => () => stopTracks(), []);

  useEffect(() => {
    if (!recording || !liveRef.current || !streamRef.current) return;
    liveRef.current.srcObject = streamRef.current;
    void liveRef.current.play().catch(() => undefined);
  }, [recording]);

  const accept = async (file: File, knownSeconds?: number) => {
    setError("");
    if (file.size > videoMaxBytes()) {
      setError(t.shopVideoSize);
      return;
    }
    const duration = knownSeconds && knownSeconds > 0 ? knownSeconds : await videoFileDuration(file);
    if (duration > greetingVideoMaxSeconds()) {
      setError(t.pointGreetingLong);
      return;
    }
    setBusy(true);
    onBusy?.(true);
    try {
      releaseBlob(videoUrl);
      const url = rememberBlob(file);
      const frame = (await captureVideoPoster(url)) ?? "";
      onChange({ greetingVideo: url, greetingPoster: frame || undefined });
    } catch {
      setError(t.shopError);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };

  const stop = () => {
    window.clearTimeout(stopTimer.current);
    const rec = recRef.current;
    recRef.current = null;
    setRecording(false);
    if (rec && rec.state !== "inactive") rec.stop();
    else stopTracks();
  };

  const record = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      openFileInput(cameraFileRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
      streamRef.current = stream;
      setRecording(true);
      const mime = recorderMime("video");
      const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), ...recorderOptions("video") });
      chunks.current = [];
      const started = Date.now();
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      rec.onstop = () => {
        stopTracks();
        const seconds = Math.min(greetingVideoMaxSeconds(), (Date.now() - started) / 1000);
        const blob = new Blob(chunks.current, { type: rec.mimeType || "video/webm" });
        void accept(new File([blob], "greeting.webm", { type: blob.type }), seconds);
      };
      recRef.current = rec;
      rec.start();
      stopTimer.current = window.setTimeout(stop, greetingVideoMaxSeconds() * 1000);
    } catch {
      stopTracks();
      openFileInput(cameraFileRef.current);
    }
  };

  const clear = () => {
    releaseBlob(videoUrl);
    onChange({ greetingVideo: undefined, greetingPoster: undefined });
  };

  if (variant === "wizard") {
    return (
      <div data-testid="point-greeting">
        <button
          type="button"
          data-testid="point-greeting-box"
          onClick={() => (recording ? stop() : void record())}
          className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-line bg-chip text-[15px] font-semibold text-accent"
        >
          {recording ? (
            <video ref={liveRef} muted playsInline className="h-full w-full object-cover" />
          ) : videoUrl ? (
            <video src={videoUrl} poster={poster || undefined} muted playsInline preload="metadata" className="h-full w-full bg-chip object-contain" />
          ) : busy ? (
            t.shopLoad
          ) : (
            <span className="text-[40px] leading-none">+</span>
          )}
        </button>
        <div className="mt-3">
          {videoUrl && !recording ? <div className="mb-2 text-[13px] font-semibold text-ink">{t.pointGreetingReplace}</div> : null}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => (recording ? stop() : void record())} className="h-12 flex-1 rounded-2xl border border-line bg-white text-[14px] font-semibold disabled:opacity-50">
              {recording ? t.pointGreetingStop : t.pointGreetingShoot}
            </button>
            <button type="button" disabled={busy || recording} onClick={() => openFileInput(galleryRef.current)} className="h-12 flex-1 rounded-2xl border border-line bg-white text-[14px] font-semibold disabled:opacity-50">
              {t.postGallery}
            </button>
          </div>
          {videoUrl && !recording ? (
            <button type="button" data-testid="point-greeting-delete" disabled={busy} onClick={clear} className="mt-2 h-12 w-full rounded-2xl border border-line bg-white text-[14px] font-semibold text-accent disabled:opacity-50">
              {t.pointGreetingDelete}
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
        <input
          ref={cameraFileRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            resetFileInput(input);
            if (file) void accept(file);
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            resetFileInput(input);
            if (file) void accept(file);
          }}
        />
      </div>
    );
  }

  return (
    <div data-testid="point-greeting">
      <div className="shadow-btn relative overflow-hidden rounded-2xl bg-accent text-accent-on ring-2 ring-[#FFE600]">
        {recording ? (
          <div className="relative">
            <video ref={liveRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
            <button type="button" onClick={stop} className="absolute inset-x-3 bottom-3 h-11 rounded-2xl bg-white text-[15px] font-bold text-ink">
              {t.pointGreetingStop}
            </button>
          </div>
        ) : videoUrl ? (
          <div className="relative bg-ink">
            <video src={videoUrl} poster={poster || undefined} muted playsInline preload="metadata" className="aspect-[4/3] w-full object-contain" />
            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE600] text-[14px] font-extrabold text-ink">✔</span>
          </div>
        ) : (
          <button type="button" disabled={busy} onClick={() => void record()} className="flex min-h-[132px] w-full flex-col items-center justify-center px-4 py-4 text-center disabled:opacity-60">
            <span className="text-[36px] leading-none">🎥</span>
            <span className="mt-1 text-[16px] font-bold">{t.pointGreeting}</span>
            <span className="mt-1 max-w-[18rem] text-[12px] font-semibold leading-tight">{t.pointGreetingHint}</span>
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={busy || recording} onClick={() => void record()} className="h-10 flex-1 rounded-xl border border-line bg-white text-[13px] font-semibold disabled:opacity-50">
          {videoUrl ? t.pointGreetingReplace : t.pointGreetingCamera}
        </button>
        <button type="button" disabled={busy || recording} onClick={() => openFileInput(galleryRef.current)} className="h-10 flex-1 rounded-xl border border-line bg-white text-[13px] font-semibold disabled:opacity-50">
          {t.pointGreetingGallery}
        </button>
        {videoUrl ? (
          <button type="button" onClick={clear} className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-accent">
            {t.pointGreetingDelete}
          </button>
        ) : null}
      </div>
      {videoUrl ? <p className="mt-1.5 text-[12px] leading-[1.4] text-muted">{t.pointGreetingHint}</p> : null}
      {error ? <p className="mt-1.5 text-[13px] font-semibold text-accent">{error}</p> : null}
      <input
        ref={cameraFileRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          resetFileInput(input);
          if (file) void accept(file);
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          resetFileInput(input);
          if (file) void accept(file);
        }}
      />
    </div>
  );
}
