"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { captureVideoPoster, dropBlob, keepBlob, rememberBlob, recorderMime, recorderOptions, startSpeech } from "@/lib/blob-media";
import { FEATURES } from "@/lib/features";
import { videoMaxBytes, videoMaxSeconds, voiceMaxSeconds } from "@/lib/media-limits";
import {
  DEMO_POSTER_URL,
  DEMO_TRANSCRIPT,
  DEMO_VIDEO_URL,
  DEMO_VOICE_TRANSCRIPT,
  aiToDraftPatch,
  classifyListingSpeech,
} from "@/lib/video-ai";
import { priceFromPhoto } from "@/lib/photo-price";
import { useApp } from "@/lib/store";
import type { DraftListing, MediaKind } from "@/lib/types";
import { IconCamera, IconImage } from "./icons";
import { isGalleryVideo, NativePhotoInputs } from "./native-photo";
import { Chip, Eyebrow, Photo, Toggle } from "./ui";
import { PostTypePicker } from "./post-type-picker";
import { PostTaxonomy, pickSection } from "./post-taxonomy";

export function clampWall(wallSec: number, limit: number, auto: boolean) {
  return auto ? Math.min(wallSec, limit) : wallSec;
}

function clock(total: number) {
  const sec = Math.max(0, Math.floor(total));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function LiveVideoBox({
  videoRef,
  elapsed,
  recording,
  placeholder,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  elapsed: number;
  recording: boolean;
  placeholder?: string;
}) {
  const limit = videoMaxSeconds();
  return (
    <div className="relative">
      <video
        ref={videoRef}
        muted
        playsInline
        data-testid="post-live-video"
        className="aspect-[9/16] max-h-[280px] w-full bg-ink object-cover"
      />
      {placeholder ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] font-semibold text-screen">
          {placeholder}
        </div>
      ) : null}
      {recording ? (
        <div data-testid="post-live-timer" className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center">
          <div className="rounded-full bg-[rgba(23,20,15,.75)] px-3 py-1 text-[15px] font-bold text-white tabular-nums">
            <span style={{ color: "#E8112D" }}>●</span>{" "}
            {limit - elapsed <= 10 ? (
              <span style={{ color: "#E8112D" }}>{clock(Math.max(0, Math.ceil(limit - elapsed)))}</span>
            ) : (
              clock(elapsed)
            )}{" "}
            / {clock(limit)}
          </div>
          <div className="mt-2 h-[3px] w-[86%] overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-white" style={{ width: `${Math.max(0, 100 * (1 - elapsed / limit))}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
  variant?: "default" | "personal";
  hint?: string;
  emptyText?: string;
};

export function MediaCapture({ draft, onPatch, variant = "default", hint, emptyText }: Props) {
  const { t } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRecRef = useRef<(auto?: boolean) => void>(() => undefined);
  const releaseTracksRef = useRef<() => void>(() => undefined);
  const chunks = useRef<Blob[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const recStartedAt = useRef(0);
  const stopSpeech = useRef<(() => void) | null>(null);
  const heardRef = useRef("");
  const autoMicFor = useRef<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recMode, setRecMode] = useState<"video" | "audio" | null>(null);
  const [busy, setBusy] = useState("");
  const [live, setLive] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const limitTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const halted = useRef(false);
  const alive = useRef(true);
  const autoStopped = useRef(false);

  const clearRecTimers = () => {
    if (limitTimer.current != null) window.clearTimeout(limitTimer.current);
    if (tickTimer.current != null) window.clearInterval(tickTimer.current);
    limitTimer.current = null;
    tickTimer.current = null;
  };

  const releaseTracks = () => {
    const streams: MediaStream[] = [];
    if (streamRef.current) streams.push(streamRef.current);
    const preview = videoRef.current?.srcObject;
    if (preview instanceof MediaStream && preview !== streamRef.current) streams.push(preview);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    for (const stream of streams) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          /* already stopped */
        }
      });
    }
  };
  releaseTracksRef.current = releaseTracks;

  useEffect(() => {
    const stopIfLive = () => {
      if (!streamRef.current && !recRef.current) return;
      stopRecRef.current();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") stopIfLive();
    };
    const onDialog = () => {
      if (document.querySelector("[data-testid='leave-dialog']")) stopIfLive();
    };
    const obs = new MutationObserver(onDialog);
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", stopIfLive);
    return () => {
      obs.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", stopIfLive);
      alive.current = false;
      halted.current = true;
      clearRecTimers();
      stopSpeech.current?.();
      stopSpeech.current = null;
      try {
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
      recRef.current = null;
      releaseTracksRef.current();
    };
  }, []);

  const storedKind: MediaKind = draft.mediaKind ?? "photos";
  const kind: MediaKind = !FEATURES.ownerVoice && storedKind === "voice" ? "photos" : storedKind;

  useEffect(() => {
    if (FEATURES.ownerVoice || draft.mediaKind !== "voice") return;
    onPatch({ mediaKind: "photos" });
  }, [draft.mediaKind, onPatch]);

  useLayoutEffect(() => {
    if (!(recording && recMode === "video")) return;
    const stream = streamRef.current;
    const el = videoRef.current;
    if (!stream || !el || el.srcObject === stream) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
  }, [recording, recMode]);

  const videoDuration = (url: string) =>
    new Promise<number>((resolve) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      let settled = false;
      const finish = (value: number) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        el.onloadedmetadata = null;
        el.onerror = null;
        el.removeAttribute("src");
        el.load();
        resolve(value);
      };
      const timer = window.setTimeout(() => finish(0), 4000);
      el.onloadedmetadata = () => finish(Number.isFinite(el.duration) ? el.duration : 0);
      el.onerror = () => finish(0);
      el.src = url;
    });

  useEffect(() => {
    if (!FEATURES.ownerVoice) return;
    if (variant === "personal") return;
    if (kind !== "video" || recording) return;
    const url = draft.videoUrl;
    if (!url || draft.transcript?.trim() || draft.voiceUrl) return;
    if (autoMicFor.current === url) return;
    autoMicFor.current = url;
    const id = window.setTimeout(() => {
      void startRec("audio");
    }, 400);
    return () => window.clearTimeout(id);
    // startRec is stable enough for this prompt-once path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, draft.videoUrl, draft.transcript, draft.voiceUrl, recording, variant]);

  const applySpeech = (text: string) => {
    heardRef.current = text;
    const guess = classifyListingSpeech(text);
    const patch = aiToDraftPatch(guess);
    if (!guess.price) delete patch.price;
    onPatch({
      transcript: text,
      ...patch,
    });
  };

  const setKind = (next: MediaKind) => {
    if (next !== "video" && next !== "voice") dropBlob("video");
    if (next !== "voice" && next !== "video") dropBlob("voice");
    onPatch({
      mediaKind: next,
      videoUrl: next === "video" || next === "voice" ? draft.videoUrl : undefined,
      voiceUrl: next === "voice" || next === "video" ? draft.voiceUrl : undefined,
      aiConfirmed: false,
      transcript: next === "photos" ? undefined : draft.transcript,
    });
  };

  const discardVideo = () => {
    dropBlob("video");
    onPatch({ videoUrl: undefined, aiConfirmed: false });
  };

  const retakeVideo = () => {
    discardVideo();
    void startRec("video");
  };

  const stopRec = (auto = false) => {
    if (halted.current) return;
    halted.current = true;
    clearRecTimers();
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* already stopped */
    }
    stopSpeech.current?.();
    stopSpeech.current = null;
    releaseTracks();
    setRecording(false);
    setRecMode(null);
    if (auto) {
      autoStopped.current = true;
      setBusy(t.mediaRecStopped);
    }
  };
  stopRecRef.current = stopRec;

  const startRec = async (mode: "video" | "audio") => {
    setBusy("");
    const personalVideo = variant === "personal" && mode === "video";
    const openCameraApp = () => {
      videoFileRef.current?.click();
    };
    if (personalVideo && (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")) {
      openCameraApp();
      return;
    }
    const noDevice = mode === "audio" ? t.mediaNoMic : FEATURES.demoMedia ? t.mediaNoCamera : t.mediaNoCameraFile;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setBusy(noDevice);
      return;
    }
    try {
      halted.current = false;
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === "video"
          ? { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } }, audio: true }
          : { audio: true },
      );
      if (halted.current || !alive.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current && mode === "video") {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      if (halted.current || !alive.current) {
        releaseTracks();
        return;
      }
      const mime = recorderMime(mode === "video" ? "video" : "audio");
      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), ...recorderOptions(mode === "video" ? "video" : "audio") });
      } catch {
        releaseTracks();
        if (personalVideo) {
          openCameraApp();
          return;
        }
        setBusy(noDevice);
        return;
      }
      chunks.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.current.push(ev.data);
      };
      rec.onstop = async () => {
        const wallSec = recStartedAt.current ? (Date.now() - recStartedAt.current) / 1000 : 0;
        const limit = mode === "video" ? videoMaxSeconds() : voiceMaxSeconds();
        const wall = clampWall(wallSec, limit, autoStopped.current);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || (mode === "video" ? "video/webm" : "audio/webm") });
        const url = keepBlob(mode === "video" ? "video" : "voice", blob);
        if (mode === "video") {
          const meta = await videoDuration(url);
          const duration = meta > 0 && Number.isFinite(meta) ? meta : wall;
          if (duration > videoMaxSeconds()) {
            dropBlob("video");
            setBusy(t.videoTooLong(Math.round(videoMaxSeconds() / 60)));
            return;
          }
          const poster = (await captureVideoPoster(url)) ?? undefined;
          onPatch({
            mediaKind: "video",
            videoUrl: url,
            videoSec: duration || undefined,
            photo: poster || draft.photo,
            aiConfirmed: false,
          });
        } else {
          onPatch({
            mediaKind: draft.videoUrl ? "video" : "voice",
            voiceUrl: url,
            videoUrl: draft.videoUrl,
            aiConfirmed: false,
          });
        }
      };
      recStartedAt.current = Date.now();
      halted.current = false;
      autoStopped.current = false;
      const limit = mode === "video" ? videoMaxSeconds() : voiceMaxSeconds();
      setElapsed(0);
      rec.start();
      recRef.current = rec;
      setRecMode(mode);
      setRecording(true);
      tickTimer.current = window.setInterval(() => {
        const next = (Date.now() - recStartedAt.current) / 1000;
        setElapsed(next);
        if (next >= limit) stopRec(true);
      }, 250);
      limitTimer.current = window.setTimeout(() => stopRec(true), limit * 1000);
      setLive("");
      heardRef.current = mode === "video" ? "" : (draft.transcript ?? "");
      stopSpeech.current?.();
      stopSpeech.current = null;
      if (mode === "audio" && FEATURES.ownerVoice) {
        const Speech = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
        if (Speech) {
          stopSpeech.current = startSpeech((text) => {
            setLive(text);
            applySpeech(text);
          });
        } else {
          setBusy(t.mediaSttOff);
        }
      }
    } catch {
      releaseTracks();
      if (personalVideo) {
        openCameraApp();
        return;
      }
      setBusy(noDevice);
    }
  };

  const onFile = async (file: File) => {
    setBusy("");
    const isAudio = file.type.startsWith("audio");
    // Desktop browsers often give .mov/.mkv an empty type: the extension decides, not only file.type.
    const isVideo = !isAudio && isGalleryVideo(file);
    if (isVideo && file.size > videoMaxBytes()) {
      setBusy(t.videoTooBig(Math.round(videoMaxBytes() / (1024 * 1024))));
      return;
    }
    if (!isVideo && !isAudio && !file.type.startsWith("image") && file.type) {
      setBusy(t.videoBadFormat);
      return;
    }
    const url = keepBlob(isVideo ? "video" : isAudio ? "voice" : "photo", file);
    if (!isVideo && !isAudio && variant === "personal") {
      onPatch({ photo: url, photos: [url], mediaKind: "photos", aiConfirmed: false });
      return;
    }
    if (isVideo) {
      setBusy(t.videoPreparing);
      try {
        const duration = await videoDuration(url);
        if (duration > videoMaxSeconds()) {
          dropBlob("video");
          setBusy(t.videoTooLong(Math.round(videoMaxSeconds() / 60)));
          return;
        }
        const poster = (await captureVideoPoster(url)) ?? DEMO_POSTER_URL;
        onPatch({ mediaKind: "video", videoUrl: url, videoSec: duration || undefined, photo: poster, aiConfirmed: false });
        setBusy("");
      } catch {
        dropBlob("video");
        setBusy(t.videoReadFail);
      }
    } else if (isAudio) {
      onPatch({ mediaKind: "voice", voiceUrl: url, aiConfirmed: false });
    } else {
      const reader = new FileReader();
      reader.onload = async () => {
        const photo = String(reader.result);
        onPatch({ photo, mediaKind: kind === "voice" ? "voice" : "photos" });
        setBusy(t.mediaPhotoAiBusy);
        try {
          const guess = await priceFromPhoto(photo);
          if (guess.price != null) {
            onPatch({ photo, price: String(guess.price), aiConfirmed: false });
            setBusy(t.shopItemPriceAi);
          } else {
            setBusy(t.shopItemPriceNoAi);
          }
        } catch {
          setBusy(t.shopItemPriceNoAi);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onGallery = async (files: File[]) => {
    const video = files.find((file) => isGalleryVideo(file));
    if (video) {
      await onFile(video);
      return;
    }
    if (variant === "personal" && files.length > 1) {
      const urls = files.map((file, index) => (index === 0 ? keepBlob("photo", file) : rememberBlob(file)));
      onPatch({ photo: urls[0], photos: urls, mediaKind: "photos", videoUrl: undefined, aiConfirmed: false });
      return;
    }
    if (files[0]) await onFile(files[0]);
  };

  const useDemoVideo = () => {
    const guess = classifyListingSpeech(DEMO_TRANSCRIPT);
    onPatch({
      mediaKind: "video",
      videoUrl: DEMO_VIDEO_URL,
      photo: DEMO_POSTER_URL,
      transcript: DEMO_TRANSCRIPT,
      ...aiToDraftPatch(guess),
    });
    setLive(DEMO_TRANSCRIPT);
    setBusy("");
  };

  const useDemoVoice = () => {
    const guess = classifyListingSpeech(DEMO_VOICE_TRANSCRIPT);
    onPatch({
      mediaKind: "voice",
      photo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=70",
      voiceUrl: undefined,
      transcript: DEMO_VOICE_TRANSCRIPT,
      ...aiToDraftPatch(guess),
    });
    setLive(DEMO_VOICE_TRANSCRIPT);
    setBusy("");
  };

  if (variant === "personal") {
    const hasMedia = Boolean(draft.videoUrl || draft.photo);
    const liveVideo = recording && recMode === "video";
    return (
      <div>
        {liveVideo ? (
          <div className="overflow-hidden rounded-[16px] border border-line bg-ink">
            <LiveVideoBox videoRef={videoRef} elapsed={elapsed} recording />
            <div className="bg-white p-3">
              <button
                type="button"
                data-testid="post-stop"
                onClick={() => stopRec()}
                className="h-12 w-full rounded-[12px] text-[15px] font-semibold"
                style={{ background: "#B8452F", color: "#F7F3EC" }}
              >
                {t.mediaStop}
              </button>
            </div>
          </div>
        ) : hasMedia ? (
          <div className="overflow-hidden rounded-[16px] border border-line bg-white">
            {draft.videoUrl ? (
              <video src={draft.videoUrl} poster={draft.photo} controls playsInline className="h-40 w-full bg-ink object-cover" />
            ) : draft.photo ? (
              <div className="h-40">
                <Photo src={draft.photo} alt="" fit="contain" />
              </div>
            ) : null}
            <button
              type="button"
              data-testid="post-reshoot"
              onClick={() => onPatch({ videoUrl: undefined, photo: undefined, photos: [], draftMedia: undefined })}
              className="h-11 w-full text-[14px] font-semibold text-accent"
            >
              {t.postReshoot}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="post-shoot"
                onClick={() => void startRec("video")}
                className="h-12 flex-1 rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
              >
                {t.postShootVideo}
              </button>
              <button
                type="button"
                data-testid="post-photo"
                onClick={() => cameraRef.current?.click()}
                className="h-12 flex-1 rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
              >
                {t.postPhoto}
              </button>
            </div>
            <button
              type="button"
              data-testid="post-gallery"
              onClick={() => fileRef.current?.click()}
              className="h-12 w-full rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
            >
              {t.postGallery}
            </button>
          </div>
        )}
        <input
          ref={cameraRef}
          data-testid="post-camera-file"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          data-testid="post-photo-file"
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void onGallery(files);
          }}
        />
        <input
          ref={videoFileRef}
          data-testid="post-video-file"
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
        {FEATURES.ownerVoice ? (
          <div className="mt-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
            <div className="text-[15px] font-semibold text-ink">{t.ownerVoice}</div>
            <p className="mt-1 text-[12px] leading-[1.4] text-muted">
              {t.ownerVoiceHint} ({t.voiceUpTo(voiceMaxSeconds())})
            </p>
            {draft.voiceUrl ? (
              <div className="mt-2">
                <audio src={draft.voiceUrl} controls className="w-full" />
                <button type="button" onClick={() => onPatch({ voiceUrl: undefined })} className="mt-2 text-[13px] font-semibold text-accent">
                  {t.leaveDelete}
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="post-voice"
                onClick={() => (recording ? stopRec() : void startRec("audio"))}
                className="mt-2 h-10 rounded-xl border border-line px-3 text-[13px] font-bold"
              >
                {recording ? t.mediaListening : t.ownerVoice}
              </button>
            )}
          </div>
        ) : null}
        {busy ? <p className="mt-2 text-[13px] text-accent">{busy}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>{t.mediaHow}</Eyebrow>
      {kind !== "video" ? (
        <p className="mt-2 rounded-[12px] bg-accent-tint px-3 py-2 text-[12px] leading-[1.4] text-accent-dark">{t.videoTrustBanner}</p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Chip active={kind === "video"} accent={kind === "video"} onClick={() => setKind("video")}>
          {t.mediaVideo}
        </Chip>
        {FEATURES.ownerVoice ? (
          <Chip active={kind === "voice"} accent={kind === "voice"} onClick={() => setKind("voice")}>
            {t.mediaVoice}
          </Chip>
        ) : null}
        <Chip active={kind === "photos"} onClick={() => setKind("photos")}>
          {t.mediaPhotos}
        </Chip>
        <Chip active={kind === "text"} onClick={() => setKind("text")}>
          {t.mediaText}
        </Chip>
      </div>
      <p className="mt-2 text-[12px] leading-[1.45] text-muted">{hint || t.mediaHint}</p>

      {kind === "video" ? (
        <div className="mt-3 overflow-hidden rounded-[16px] border border-line bg-ink">
          {draft.videoUrl && recMode !== "video" ? (
            <video src={draft.videoUrl} poster={draft.photo} controls playsInline className="aspect-[9/16] max-h-[280px] w-full object-cover" />
          ) : (
            <LiveVideoBox
              videoRef={videoRef}
              elapsed={elapsed}
              recording={recording && recMode === "video"}
              placeholder={emptyText && !draft.videoUrl && !(recording && recMode === "video") ? emptyText : undefined}
            />
          )}
          <div className="flex flex-col gap-2 bg-white p-3">
            {draft.videoUrl && recMode !== "video" ? (
              <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retakeVideo}
                  className="h-11 flex-1 rounded-[12px] bg-accent text-[13px] font-semibold text-accent-on"
                >
                  {t.mediaRetake}
                </button>
                <button
                  type="button"
                  onClick={discardVideo}
                  className="h-11 rounded-[12px] border border-line px-3 text-[13px] font-semibold"
                >
                  {t.mediaDiscard}
                </button>
                {FEATURES.ownerVoice ? (
                  <button
                    type="button"
                    onClick={() => void startRec("audio")}
                    className="h-11 rounded-[12px] border border-line px-3 text-[13px] font-semibold"
                  >
                    {t.mediaAddVoice}
                  </button>
                ) : null}
              </div>
              {draft.voiceUrl ? <audio src={draft.voiceUrl} controls className="w-full" /> : null}
              {!draft.transcript && !draft.voiceUrl ? (
                <p className="text-[12px] leading-[1.4] text-muted">{t.mediaSilentHint}</p>
              ) : null}
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => (recording ? stopRec() : startRec("video"))}
                  className="h-11 flex-1 rounded-[12px] text-[13px] font-semibold"
                  style={{ background: recording ? "#B8452F" : "#17140F", color: "#F7F3EC" }}
                >
                  {recording ? t.mediaStop : t.mediaRecord}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.accept = "video/*";
                      fileRef.current.click();
                    }
                  }}
                  className="h-11 rounded-[12px] border border-line px-3 text-[13px] font-semibold"
                >
                  {t.mediaFile}
                </button>
              </div>
            )}
            {!draft.videoUrl && !recording ? <p className="text-[12px] leading-[1.4] text-muted">{t.mediaVideoHint}</p> : null}
          </div>
        </div>
      ) : null}

      {FEATURES.ownerVoice && kind === "voice" ? (
        <div className="mt-3 rounded-[16px] border border-line bg-white p-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.accept = "image/*";
                  fileRef.current.click();
                }
              }}
              className="relative aspect-square overflow-hidden rounded-[14px] bg-chip"
            >
              {draft.photo ? <Photo src={draft.photo} alt="" fit="contain" /> : <span className="px-1 text-center text-[11px] text-muted">{emptyText || t.photos}</span>}
            </button>
            <button
              type="button"
              onClick={() => (recording ? stopRec() : startRec("audio"))}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#D3C7B4]"
            >
              <span className="text-lg">{recording ? "■" : "🎤"}</span>
              <span className="text-[11px] font-semibold text-accent-dark">{recording ? t.mediaStop : t.mediaVoiceRec}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.accept = "image/*,audio/*";
                  fileRef.current.click();
                }
              }}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#D3C7B4]"
            >
              <IconImage size={22} color="#6E6558" />
              <span className="text-[11px] font-semibold text-muted">{t.gallery}</span>
            </button>
          </div>
          {draft.voiceUrl ? <audio src={draft.voiceUrl} controls className="mt-3 w-full" /> : null}
        </div>
      ) : null}

      {kind === "photos" ? (
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="relative aspect-square overflow-hidden rounded-[14px] bg-chip"
            >
              {draft.photo ? <Photo src={draft.photo} alt="" fit="contain" /> : <span className="px-1 text-center text-[11px] text-muted">{emptyText || t.photos}</span>}
              <span className="absolute bottom-1.5 left-1.5 rounded bg-[rgba(23,20,15,.75)] px-1.5 py-0.5 text-[10px] font-bold text-screen">
                {t.mainPhoto}
              </span>
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#D3C7B4] bg-white"
            >
              <IconCamera size={22} color="#B8452F" />
              <span className="text-[11px] font-semibold text-accent-dark">{t.camera}</span>
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#D3C7B4] bg-white"
            >
              <IconImage size={22} color="#6E6558" />
              <span className="text-[11px] font-semibold text-muted">{t.postGallery}</span>
            </button>
          </div>
          <NativePhotoInputs
            cameraRef={cameraRef}
            galleryRef={galleryRef}
            onFile={(file) => void onFile(file)}
            onGalleryFiles={(files) => void onGallery(files)}
            galleryAccept="image/*,video/*"
            galleryMultiple
          />
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />

      {FEATURES.demoMedia && kind !== "photos" && kind !== "text" ? (
        <button
          type="button"
          onClick={kind === "video" ? useDemoVideo : useDemoVoice}
          className="mt-3 h-11 w-full rounded-[12px] border border-line bg-accent-tint text-[13px] font-semibold text-accent-dark"
        >
          {t.mediaDemo}
        </button>
      ) : null}

      {kind !== "photos" && kind !== "text" ? (
        <label className="mt-3 block">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.mediaTranscript}</span>
          <textarea
            value={draft.transcript ?? live}
            onChange={(e) => {
              setLive(e.target.value);
              applySpeech(e.target.value);
            }}
            placeholder={t.mediaTranscriptPh}
            className="mt-1.5 min-h-[88px] w-full rounded-[14px] border border-line bg-white px-[15px] py-[13px] text-[15px] leading-[1.45] outline-none placeholder:text-muted-2"
          />
        </label>
      ) : null}

      {busy ? <p className="mt-2 text-[13px] text-accent">{busy}</p> : null}
      {FEATURES.ownerVoice && recording && recMode === "audio" ? (
        <p className="mt-2 text-[12px] text-muted">
          {t.mediaListening}
          {` · ${clock(elapsed)} / ${clock(voiceMaxSeconds())}`}
        </p>
      ) : null}
    </div>
  );
}

export function AiConfirmCard({ draft, onPatch }: Props) {
  const { t } = useApp();
  const heard = (draft.transcript ?? "").trim();

  return (
    <div className="rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.confirmAiTitle}</div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.confirmAiHint}</p>
      {heard ? (
        <div className="mt-3 rounded-[14px] bg-chip px-3.5 py-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.confirmAiHeard}</div>
          <p className="mt-1.5 text-[13px] leading-[1.45] text-ink">{heard}</p>
        </div>
      ) : null}

      <div className="mt-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.confirmAiPickSection}</div>
        <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.confirmAiFix}</p>
        <div className="mt-2">
          <PostTypePicker value={draft.section} onPick={(id) => onPatch(pickSection(draft, id))} />
        </div>
        <PostTaxonomy draft={draft} onPatch={(patch) => onPatch({ ...patch, aiConfirmed: false })} />
      </div>

      <label className="mt-3 block">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.title}</span>
        <input
          value={draft.title}
          onChange={(e) => onPatch({ title: e.target.value, aiConfirmed: false })}
          className="mt-1.5 h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px] outline-none"
        />
      </label>
      <label className="mt-3 block">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.description}</span>
        <textarea
          value={draft.description}
          onChange={(e) => onPatch({ description: e.target.value, aiConfirmed: false })}
          className="mt-1.5 min-h-[96px] w-full rounded-[14px] border border-line bg-white px-[15px] py-[13px] text-[15px] leading-[1.45] outline-none"
        />
      </label>
      <div className="mt-3 flex items-start justify-between gap-3 rounded-[14px] border border-line bg-accent-tint px-3.5 py-3">
        <div>
          <div className="text-[15px] font-semibold text-ink">{t.confirmAiYes}</div>
          <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.confirmAiHint}</p>
        </div>
        <Toggle on={Boolean(draft.aiConfirmed)} onChange={() => onPatch({ aiConfirmed: !draft.aiConfirmed })} />
      </div>
    </div>
  );
}
