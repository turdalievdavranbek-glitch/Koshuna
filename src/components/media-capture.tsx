"use client";

import { useRef, useState } from "react";
import { captureVideoPoster, dropBlob, keepBlob, recorderMime, startSpeech } from "@/lib/blob-media";
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
import { NativePhotoInputs } from "./native-photo";
import { Chip, Eyebrow, Photo, Toggle } from "./ui";
import { PostTypePicker } from "./post-type-picker";
import { PostTaxonomy, pickSection } from "./post-taxonomy";

type Props = {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
};

export function MediaCapture({ draft, onPatch }: Props) {
  const { t } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const chunks = useRef<Blob[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const stopSpeech = useRef<(() => void) | null>(null);
  const [recording, setRecording] = useState(false);
  const [recMode, setRecMode] = useState<"video" | "audio" | null>(null);
  const [busy, setBusy] = useState("");
  const [live, setLive] = useState("");

  const kind: MediaKind = draft.mediaKind ?? "photos";

  const applySpeech = (text: string) => {
    const guess = classifyListingSpeech(text);
    onPatch({
      transcript: text,
      ...aiToDraftPatch(guess),
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

  const stopRec = () => {
    recRef.current?.stop();
    recRef.current = null;
    stopSpeech.current?.();
    stopSpeech.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setRecording(false);
    setRecMode(null);
  };

  const startRec = async (mode: "video" | "audio") => {
    setBusy("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setBusy(mode === "audio" ? t.mediaNoMic : t.mediaNoCamera);
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setBusy(mode === "audio" ? t.mediaNoMic : t.mediaNoCamera);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === "video" ? { video: { facingMode: "environment" }, audio: true } : { audio: true },
      );
      if (videoRef.current && mode === "video") {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const mime = recorderMime(mode === "video" ? "video" : "audio");
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || (mode === "video" ? "video/webm" : "audio/webm") });
        const url = keepBlob(mode === "video" ? "video" : "voice", blob);
        if (mode === "video") {
          const poster = (await captureVideoPoster(url)) ?? undefined;
          onPatch({ mediaKind: "video", videoUrl: url, photo: poster || draft.photo, aiConfirmed: false });
        } else {
          onPatch({
            mediaKind: draft.videoUrl ? "video" : "voice",
            voiceUrl: url,
            videoUrl: draft.videoUrl,
            aiConfirmed: false,
          });
        }
      };
      rec.start();
      recRef.current = rec;
      setRecMode(mode);
      setRecording(true);
      setLive("");
      stopSpeech.current?.();
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
    } catch {
      setBusy(mode === "audio" ? t.mediaNoMic : t.mediaNoCamera);
    }
  };

  const onFile = async (file: File) => {
    setBusy("");
    const isVideo = file.type.startsWith("video");
    const isAudio = file.type.startsWith("audio");
    const url = keepBlob(isVideo ? "video" : isAudio ? "voice" : "photo", file);
    if (isVideo) {
      const poster = (await captureVideoPoster(url)) ?? DEMO_POSTER_URL;
      onPatch({ mediaKind: "video", videoUrl: url, photo: poster, aiConfirmed: false });
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

  return (
    <div>
      <Eyebrow>{t.mediaHow}</Eyebrow>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Chip active={kind === "video"} accent={kind === "video"} onClick={() => setKind("video")}>
          {t.mediaVideo}
        </Chip>
        <Chip active={kind === "voice"} accent={kind === "voice"} onClick={() => setKind("voice")}>
          {t.mediaVoice}
        </Chip>
        <Chip active={kind === "photos"} onClick={() => setKind("photos")}>
          {t.mediaPhotos}
        </Chip>
        <Chip active={kind === "text"} onClick={() => setKind("text")}>
          {t.mediaText}
        </Chip>
      </div>
      <p className="mt-2 text-[12px] leading-[1.45] text-muted">{t.mediaHint}</p>

      {kind === "video" ? (
        <div className="mt-3 overflow-hidden rounded-[16px] border border-line bg-ink">
          {draft.videoUrl && recMode !== "video" ? (
            <video src={draft.videoUrl} poster={draft.photo} controls playsInline className="aspect-[9/16] max-h-[280px] w-full object-cover" />
          ) : (
            <video ref={videoRef} muted playsInline className="aspect-[9/16] max-h-[280px] w-full bg-ink object-cover" />
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
                <button
                  type="button"
                  onClick={() => void startRec("audio")}
                  className="h-11 rounded-[12px] border border-line px-3 text-[13px] font-semibold"
                >
                  {t.mediaAddVoice}
                </button>
              </div>
              {draft.voiceUrl ? <audio src={draft.voiceUrl} controls className="w-full" /> : null}
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
          </div>
        </div>
      ) : null}

      {kind === "voice" ? (
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
              {draft.photo ? <Photo src={draft.photo} alt="" /> : <span className="text-[11px] text-muted">{t.photos}</span>}
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
              {draft.photo ? <Photo src={draft.photo} alt="" /> : <span className="text-[11px] text-muted">{t.photos}</span>}
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
              <span className="text-[11px] font-semibold text-muted">{t.gallery}</span>
            </button>
          </div>
          <NativePhotoInputs cameraRef={cameraRef} galleryRef={galleryRef} onFile={(file) => void onFile(file)} />
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

      {kind !== "photos" && kind !== "text" ? (
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
      {recording ? <p className="mt-2 text-[12px] text-muted">{t.mediaListening}</p> : null}
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
