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
import {
  ANIMAL_GROUPS,
  animalKindsOf,
  CATEGORIES,
  CONSTRUCTION_CATEGORIES,
  goodsKindsOf,
  isTechCategory,
  PROPERTY_TYPES,
  RESTAURANT_CATEGORIES,
  SECTIONS,
  SERVICE_CATEGORIES,
  techBrandsOf,
  techModelsOf,
} from "@/lib/data";
import { VEHICLE_GROUPS, vehicleMakesOf, vehicleModelsOf, vehicleTypesOf } from "@/lib/transport";
import { useApp } from "@/lib/store";
import type { DraftListing, MediaKind, SectionId } from "@/lib/types";
import { IconCamera, IconImage } from "./icons";
import { Chip, Eyebrow, Photo, Toggle } from "./ui";

type Props = {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
};

export function MediaCapture({ draft, onPatch }: Props) {
  const { t } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chunks = useRef<Blob[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const stopSpeech = useRef<(() => void) | null>(null);
  const [recording, setRecording] = useState(false);
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
    if (next !== "video") dropBlob("video");
    if (next !== "voice") dropBlob("voice");
    onPatch({
      mediaKind: next,
      videoUrl: next === "video" ? draft.videoUrl : undefined,
      voiceUrl: next === "voice" ? draft.voiceUrl : undefined,
      aiConfirmed: false,
      transcript: next === "photos" ? undefined : draft.transcript,
    });
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
  };

  const startRec = async (mode: "video" | "audio") => {
    setBusy("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setBusy(t.mediaNoCamera);
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
          onPatch({ mediaKind: "voice", voiceUrl: url, aiConfirmed: false });
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setLive("");
      stopSpeech.current?.();
      stopSpeech.current = startSpeech((text) => {
        setLive(text);
        applySpeech(text);
      });
    } catch {
      setBusy(t.mediaNoCamera);
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
      reader.onload = () =>
        onPatch({ photo: String(reader.result), mediaKind: kind === "voice" ? "voice" : "photos" });
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
      </div>
      <p className="mt-2 text-[12px] leading-[1.45] text-muted">{t.mediaHint}</p>

      {kind === "video" ? (
        <div className="mt-3 overflow-hidden rounded-[16px] border border-line bg-ink">
          {draft.videoUrl && !recording ? (
            <video src={draft.videoUrl} poster={draft.photo} controls playsInline className="aspect-[9/16] max-h-[280px] w-full object-cover" />
          ) : (
            <video ref={videoRef} muted playsInline className="aspect-[9/16] max-h-[280px] w-full bg-ink object-cover" />
          )}
          <div className="flex gap-2 bg-white p-3">
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
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              onPatch({
                photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70",
              })
            }
            className="relative aspect-square overflow-hidden rounded-[14px] bg-chip"
          >
            {draft.photo ? <Photo src={draft.photo} alt="" /> : <span className="text-[11px] text-muted">{t.photos}</span>}
            <span className="absolute bottom-1.5 left-1.5 rounded bg-[rgba(23,20,15,.75)] px-1.5 py-0.5 text-[10px] font-bold text-screen">
              {t.mainPhoto}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.accept = "image/*";
                fileRef.current.click();
              }
            }}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#D3C7B4] bg-white"
          >
            <IconCamera size={22} color="#B8452F" />
            <span className="text-[11px] font-semibold text-accent-dark">{t.camera}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onPatch({
                photo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=70",
              })
            }
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#D3C7B4] bg-white"
          >
            <IconImage size={22} color="#6E6558" />
            <span className="text-[11px] font-semibold text-muted">{t.gallery}</span>
          </button>
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

      {kind !== "photos" ? (
        <button
          type="button"
          onClick={kind === "video" ? useDemoVideo : useDemoVoice}
          className="mt-3 h-11 w-full rounded-[12px] border border-line bg-accent-tint text-[13px] font-semibold text-accent-dark"
        >
          {t.mediaDemo}
        </button>
      ) : null}

      {kind !== "photos" ? (
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

function pickSection(draft: DraftListing, id: SectionId): Partial<DraftListing> {
  const kind = id === "rent" || id === "stays" ? "rent" : "goods";
  const next: Partial<DraftListing> = { section: id, kind, aiConfirmed: false };
  if (id === "rent") next.housingKind = draft.housingKind ?? "apartment";
  if (id === "secondhand") {
    const keep = draft.category && (CATEGORIES as readonly string[]).includes(draft.category);
    next.category = keep ? draft.category : "phones";
  }
  if (id === "animals") next.animalGroup = draft.animalGroup ?? "pets";
  if (id === "services") next.category = draft.category ?? SERVICE_CATEGORIES[0];
  if (id === "construction") next.category = draft.category ?? CONSTRUCTION_CATEGORIES[0];
  if (id === "restaurants") next.category = draft.category ?? RESTAURANT_CATEGORIES[0];
  return next;
}

export function AiConfirmCard({ draft, onPatch }: Props) {
  const { t } = useApp();
  const visualSection = draft.section === "car-rental" ? "cars" : draft.section;
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
        <div className="mt-2 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <Chip
              key={s.id}
              active={visualSection === s.id}
              accent={visualSection === s.id}
              onClick={() => onPatch(pickSection(draft, s.id))}
            >
              {t.sectionNames[s.id]}
            </Chip>
          ))}
        </div>
      </div>

      {visualSection === "cars" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={draft.section === "cars"} onClick={() => onPatch({ section: "cars", kind: "goods", aiConfirmed: false })}>
            {t.autoSale}
          </Chip>
          <Chip
            active={draft.section === "car-rental"}
            onClick={() => onPatch({ section: "car-rental", kind: "goods", aiConfirmed: false })}
          >
            {t.autoRent}
          </Chip>
          {VEHICLE_GROUPS.map((id) => (
            <Chip
              key={id}
              active={(draft.vehicleGroup ?? "passenger") === id}
              onClick={() => onPatch({ vehicleGroup: id, vehicleType: undefined, carMake: undefined, carModel: undefined, aiConfirmed: false })}
            >
              {t.vehicleGroups[id]}
            </Chip>
          ))}
          {vehicleTypesOf(draft.vehicleGroup ?? "passenger").map((id) => (
            <Chip
              key={id}
              active={draft.vehicleType === id}
              onClick={() => onPatch({ vehicleType: id, carMake: undefined, carModel: undefined, aiConfirmed: false })}
            >
              {t.vehicleTypes[id]}
            </Chip>
          ))}
          {vehicleMakesOf(draft.vehicleGroup ?? "passenger", draft.vehicleType).map((id) => (
            <Chip
              key={id}
              active={draft.carMake === id}
              onClick={() => onPatch({ carMake: id, carModel: undefined, aiConfirmed: false })}
            >
              {t.carMakes[id] ?? id}
            </Chip>
          ))}
          {vehicleModelsOf(draft.carMake, draft.vehicleGroup ?? "passenger", draft.vehicleType).map((id) => (
            <Chip
              key={id}
              active={draft.carModel === id}
              onClick={() => onPatch({ carModel: id, aiConfirmed: false })}
            >
              {t.carModels[id] ?? id}
            </Chip>
          ))}
        </div>
      ) : null}

      {draft.section === "rent" ? (
        <div className="mt-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.confirmAiPickCategory}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROPERTY_TYPES.map((id) => (
              <Chip
                key={id}
                active={draft.housingKind === id}
                onClick={() => onPatch({ housingKind: id, aiConfirmed: false })}
              >
                {t.propertyTypes[id]}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {draft.section === "secondhand" ? (
        <div className="mt-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.confirmAiPickCategory}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                active={draft.category === c}
                onClick={() =>
                  onPatch({
                    category: c,
                    goodsKind: undefined,
                    techBrand: undefined,
                    techModel: undefined,
                    aiConfirmed: false,
                  })
                }
              >
                {t.cats[c]}
              </Chip>
            ))}
          </div>
          {goodsKindsOf(draft.category).length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {goodsKindsOf(draft.category).map((id) => (
                <Chip
                  key={id}
                  active={draft.goodsKind === id}
                  onClick={() => onPatch({ goodsKind: id, aiConfirmed: false })}
                >
                  {t.goodsKinds[id]}
                </Chip>
              ))}
            </div>
          ) : null}
          {isTechCategory(draft.category) ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {techBrandsOf(draft.category).map((id) => (
                <Chip
                  key={id}
                  active={draft.techBrand === id}
                  onClick={() => onPatch({ techBrand: id, techModel: undefined, aiConfirmed: false })}
                >
                  {t.techBrands[id]}
                </Chip>
              ))}
            </div>
          ) : null}
          {techModelsOf(draft.category, draft.techBrand).length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {techModelsOf(draft.category, draft.techBrand).map((id) => (
                <Chip
                  key={id}
                  active={draft.techModel === id}
                  onClick={() => onPatch({ techModel: id, aiConfirmed: false })}
                >
                  {t.techModels[id]}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {draft.section === "animals" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {ANIMAL_GROUPS.map((id) => (
            <Chip
              key={id}
              active={(draft.animalGroup ?? "pets") === id}
              onClick={() => onPatch({ animalGroup: id, animalKind: undefined, aiConfirmed: false })}
            >
              {id === "pets" ? t.animalPets : t.animalFarm}
            </Chip>
          ))}
          {animalKindsOf(draft.animalGroup ?? "pets").map((id) => (
            <Chip
              key={id}
              active={draft.animalKind === id}
              onClick={() => onPatch({ animalKind: id, aiConfirmed: false })}
            >
              {t.animalKinds[id]}
            </Chip>
          ))}
        </div>
      ) : null}

      {draft.section === "services" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {SERVICE_CATEGORIES.map((c) => (
            <Chip key={c} active={draft.category === c} onClick={() => onPatch({ category: c, aiConfirmed: false })}>
              {t.cats[c]}
            </Chip>
          ))}
        </div>
      ) : null}

      {draft.section === "construction" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {CONSTRUCTION_CATEGORIES.map((c) => (
            <Chip key={c} active={draft.category === c} onClick={() => onPatch({ category: c, aiConfirmed: false })}>
              {t.cats[c]}
            </Chip>
          ))}
        </div>
      ) : null}

      {draft.section === "restaurants" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {RESTAURANT_CATEGORIES.map((c) => (
            <Chip key={c} active={draft.category === c} onClick={() => onPatch({ category: c, aiConfirmed: false })}>
              {t.cats[c]}
            </Chip>
          ))}
        </div>
      ) : null}

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
