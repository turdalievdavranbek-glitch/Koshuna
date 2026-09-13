"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recorderMime, sampleVideoStills, startSpeech } from "@/lib/blob-media";
import { jpegDataUrl, priceFromPhoto, stillFromVideo } from "@/lib/photo-price";
import { listingTitle } from "@/lib/i18n";
import { shopVideoMaxSeconds, shopVideoMaxStills, videoMaxBytes } from "@/lib/media-limits";
import { mineRestaurants, parentOfMenuKind } from "@/lib/menu";
import { DEMO_MENU_COUNTER } from "@/lib/menu-ai";
import { menuKindLabel } from "@/lib/menu-copy";
import { draftsFromMenuSpeech, pairMenuDraftsWithStills, type MenuItemDraft } from "@/lib/menu-media";
import { validPrice } from "@/lib/shops";
import { DEMO_VIDEO_URL } from "@/lib/video-ai";
import { useApp } from "@/lib/store";
import type { MediaKind, RestaurantDish } from "@/lib/types";
import { IconCamera } from "./icons";
import { NativePhotoInputs } from "./native-photo";
import { Chip, Field, Input, Toggle } from "./ui";

export function RestaurantMenuCapture() {
  const { t, lang, user, shops, extraListings, allListings, ready, setPendingPath, setDraft, updateListing } = useApp();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stopSpeech = useRef<(() => void) | null>(null);
  const recTimer = useRef(0);
  const spokenRef = useRef("");
  const [mode, setMode] = useState<MediaKind>("photos");
  const [live, setLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [photo, setPhoto] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [ai, setAi] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<MenuItemDraft[]>([]);
  const venues = mineRestaurants(allListings, extraListings, user, shops);
  const [venueId, setVenueId] = useState("");
  const venue = venues.find((item) => item.id === venueId) ?? venues[0];
  const here = "/restaurants/quick";

  useEffect(() => {
    if (!venueId && venues[0]) setVenueId(venues[0].id);
  }, [venueId, venues]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recStreamRef.current?.getTracks().forEach((track) => track.stop());
      stopSpeech.current?.();
      if (recTimer.current) window.clearTimeout(recTimer.current);
    };
  }, []);

  const rememberSpeech = (text: string) => {
    spokenRef.current = text;
    setSpoken(text);
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  };

  const applyPhoto = async (dataUrl: string) => {
    setError("");
    setAi(t.shopItemAiBusy);
    const compact = await jpegDataUrl(dataUrl, 900);
    setPhoto(compact);
    try {
      const guess = await priceFromPhoto(dataUrl);
      if (guess.price != null) {
        setPrice(String(guess.price));
        setAi(t.shopItemPriceAi);
      } else {
        setAi(t.shopItemPriceNoAi);
      }
      if (spokenRef.current.trim()) {
        await applyTranscript(spokenRef.current, [compact], "photos");
      }
    } catch {
      setAi(t.shopItemPriceNoAi);
    }
  };

  const shot = async () => {
    if (!videoRef.current) return;
    const still = stillFromVideo(videoRef.current);
    if (!still) return;
    stopCam();
    await applyPhoto(still);
  };

  const onFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => void applyPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const applyTranscript = async (text: string, stills: string[], source: MenuItemDraft["source"]) => {
    const raw = draftsFromMenuSpeech(text);
    const next = pairMenuDraftsWithStills(raw, stills, source);
    if (!next.length) {
      setError(t.shopAiNeedSpeech);
      return;
    }
    rememberSpeech(text);
    setDrafts(next);
    setError("");
    setNote("");
    stopCam();
  };

  const startVoice = async () => {
    setError("");
    setNote("");
    if (!photo) {
      setError(t.shopItemNeedPhoto);
      return;
    }
    setRecording(true);
    rememberSpeech("");
    chunks.current = [];
    try {
      const recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = recStream;
      const mime = recorderMime("audio");
      const rec = mime ? new MediaRecorder(recStream, { mimeType: mime }) : new MediaRecorder(recStream);
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      rec.start();
      recRef.current = rec;
    } catch {
      /* речь без файла тоже ок */
    }
    stopSpeech.current = startSpeech(rememberSpeech);
  };

  const stopVoice = async () => {
    stopSpeech.current?.();
    stopSpeech.current = null;
    const rec = recRef.current;
    recRef.current = null;
    recStreamRef.current?.getTracks().forEach((track) => track.stop());
    recStreamRef.current = null;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
    await applyTranscript(spokenRef.current, photo ? [photo] : [], "voice");
  };

  const startVideo = async () => {
    setError("");
    setNote("");
    rememberSpeech("");
    setDrafts([]);
    chunks.current = [];
    stopCam();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      await videoRef.current?.play();
      setLive(true);
      setRecording(true);
      const mime = recorderMime("video");
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      rec.start();
      recRef.current = rec;
      stopSpeech.current = startSpeech(rememberSpeech);
      recTimer.current = window.setTimeout(() => {
        void stopVideo();
      }, shopVideoMaxSeconds() * 1000);
    } catch {
      setError(t.mediaNoCamera);
      setRecording(false);
    }
  };

  const stopVideo = async () => {
    if (recTimer.current) {
      window.clearTimeout(recTimer.current);
      recTimer.current = 0;
    }
    stopSpeech.current?.();
    stopSpeech.current = null;
    const rec = recRef.current;
    recRef.current = null;
    const blob = await new Promise<Blob>((resolve) => {
      if (!rec || rec.state === "inactive") {
        resolve(new Blob(chunks.current, { type: "video/webm" }));
        return;
      }
      rec.onstop = () => resolve(new Blob(chunks.current, { type: rec.mimeType || "video/webm" }));
      rec.stop();
    });
    chunks.current = [];
    stopCam();
    setRecording(false);
    if (blob.size > videoMaxBytes()) {
      setError(t.shopVideoSize);
      return;
    }
    const url = URL.createObjectURL(blob);
    try {
      const stills = await sampleVideoStills(url, shopVideoMaxStills());
      await applyTranscript(spokenRef.current, stills, "video");
    } catch {
      setError(t.shopAiNeedSpeech);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const runDemo = async () => {
    setError("");
    setNote("");
    setMode("video");
    try {
      const stills = await sampleVideoStills(DEMO_VIDEO_URL, shopVideoMaxStills());
      await applyTranscript(DEMO_MENU_COUNTER, stills, "video");
    } catch {
      await applyTranscript(DEMO_MENU_COUNTER, [], "video");
    }
  };

  const changeMode = (next: MediaKind) => {
    if (recording) return;
    stopCam();
    setMode(next);
    setDrafts([]);
    rememberSpeech("");
    setError("");
    setNote("");
  };

  const goNeedPlace = () => {
    setPendingPath(here);
    setDraft({ section: "restaurants", kind: "goods", category: "national", neighborPledge: false });
    router.push("/post?card=cafe");
  };

  const toDish = (row: MenuItemDraft, index: number): RestaurantDish => ({
    id: `dish-${Date.now()}-${index}`,
    title: row.title.trim(),
    price: row.price,
    photo: row.photo,
    kind: row.kind,
    category: row.category ?? parentOfMenuKind(row.kind),
  });

  const saveDishes = (items: RestaurantDish[]) => {
    if (!venue) {
      goNeedPlace();
      return false;
    }
    updateListing(venue.id, { menu: [...(venue.menu ?? []), ...items] });
    setDrafts([]);
    rememberSpeech("");
    setPhoto("");
    setTitle("");
    setPrice("");
    setAi("");
    setNote(t.restaurantDishPublished);
    return true;
  };

  const publishPhoto = () => {
    setError("");
    setNote("");
    if (!user) {
      setPendingPath(here);
      router.push("/login");
      return;
    }
    if (!venue) {
      goNeedPlace();
      return;
    }
    if (!photo) {
      setError(t.shopItemNeedPhoto);
      return;
    }
    if (!title.trim()) {
      setError(t.shopNeedName);
      return;
    }
    const n = price.trim() ? validPrice(price) : undefined;
    if (price.trim() && n == null) {
      setError(t.shopNeedPrice);
      return;
    }
    saveDishes([
      {
        id: `dish-${Date.now()}`,
        title: title.trim(),
        price: n,
        photo,
      },
    ]);
  };

  const publishDrafts = () => {
    setError("");
    setNote("");
    if (!user) {
      setPendingPath(here);
      router.push("/login");
      return;
    }
    if (!venue) {
      goNeedPlace();
      return;
    }
    const selected = drafts.filter((row) => row.selected);
    if (!selected.length) return;
    for (const row of selected) {
      if (!row.title.trim()) {
        setError(t.shopNeedName);
        return;
      }
    }
    saveDishes(selected.map(toDish));
  };

  const patchDraft = (id: string, patch: Partial<MenuItemDraft>) => {
    setDrafts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const confirming = drafts.length > 0;
  const selectedCount = drafts.filter((row) => row.selected).length;

  return (
    <div className="pb-5">
      <p className="text-[12px] text-muted">{t.restaurantQuickCta}</p>
      <p className="mt-1 text-[13px] leading-[1.45] text-muted">{t.restaurantQuickHint}</p>

      {venues.length > 1 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold text-muted">{t.restaurantPickPlace}</p>
          <div className="flex flex-wrap gap-2">
            {venues.map((item) => (
              <Chip key={item.id} active={venue?.id === item.id} onClick={() => setVenueId(item.id)}>
                {listingTitle(item, lang)}
              </Chip>
            ))}
          </div>
        </div>
      ) : venue ? (
        <p className="mt-2 text-[12px] font-semibold text-ink">{listingTitle(venue, lang)}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Chip active={mode === "photos"} onClick={() => changeMode("photos")}>
          {t.mediaPhotos}
        </Chip>
        <Chip active={mode === "voice"} accent={mode === "voice"} onClick={() => changeMode("voice")}>
          {t.mediaVoice}
        </Chip>
        <Chip active={mode === "video"} accent={mode === "video"} onClick={() => changeMode("video")}>
          {t.mediaVideo}
        </Chip>
      </div>

      {confirming ? (
        <div className="mt-4">
          <div className="font-display text-[16px] font-bold text-ink">{t.shopDraftsTitle}</div>
          {spoken ? <p className="mt-1 text-[12px] leading-[1.4] text-muted">{spoken}</p> : null}
          <div className="mt-3 flex flex-col gap-3">
            {drafts.map((row) => (
              <div key={row.id} className="rounded-[16px] border border-line bg-white p-3">
                <div className="flex gap-3">
                  {row.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.photo} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[12px] bg-chip">
                      <IconCamera size={18} color="#A79C8C" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Field label={t.shopItemName}>
                      <Input value={row.title} onChange={(v) => patchDraft(row.id, { title: v })} />
                    </Field>
                    <div className="mt-2">
                      <Field label={t.shopItemPrice}>
                        <Input
                          value={row.price != null ? String(row.price) : ""}
                          placeholder={t.shopAskPrice}
                          onChange={(v) => patchDraft(row.id, { price: v.trim() ? validPrice(v) : undefined })}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
                {row.kindOptions.length ? (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[11px] font-semibold text-muted">{t.restaurantKindGuess}</p>
                    <div className="flex flex-wrap gap-2">
                      {row.kindOptions.map((id) => (
                        <Chip
                          key={id}
                          active={row.kind === id}
                          onClick={() => patchDraft(row.id, { kind: id, category: parentOfMenuKind(id) })}
                        >
                          {menuKindLabel(t, id)}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-ink">{t.shopItemPublish}</span>
                  <Toggle on={row.selected} onChange={() => patchDraft(row.id, { selected: !row.selected })} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 overflow-hidden rounded-[18px] bg-ink">
            <video ref={videoRef} muted playsInline className={live ? "aspect-[4/5] w-full object-cover" : "hidden"} />
            {!live && photo && mode !== "video" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="aspect-[4/5] w-full bg-[#f4efe6] object-contain" />
            ) : null}
            {!live && (mode === "video" || !photo) ? (
              <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 px-6 text-center">
                <IconCamera size={28} color="#FFF7F0" />
                <div className="text-[14px] font-semibold text-screen">{mode === "video" ? t.mediaRecord : t.shopItemLive}</div>
              </div>
            ) : null}
          </div>

          {mode === "photos" || mode === "voice" ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {live ? (
                <button type="button" onClick={() => void shot()} className="h-11 rounded-2xl bg-accent text-[13px] font-semibold text-accent-on">
                  {t.shopItemShot}
                </button>
              ) : (
                <button type="button" onClick={() => cameraRef.current?.click()} className="h-11 rounded-2xl bg-ink text-[13px] font-semibold text-screen">
                  {t.camera}
                </button>
              )}
              <button type="button" onClick={() => galleryRef.current?.click()} className="h-11 rounded-2xl border border-line bg-white text-[13px] font-semibold">
                {t.gallery}
              </button>
            </div>
          ) : null}

          {mode === "voice" ? (
            <button
              type="button"
              onClick={() => (recording ? void stopVoice() : void startVoice())}
              className="mt-2 h-11 w-full rounded-2xl text-[13px] font-semibold"
              style={{ background: recording ? "#B8452F" : "#17140F", color: "#F7F3EC" }}
            >
              {recording ? t.mediaStop : t.mediaVoiceRec}
            </button>
          ) : null}

          {mode === "video" ? (
            <button
              type="button"
              onClick={() => (recording ? void stopVideo() : void startVideo())}
              className="mt-3 h-11 w-full rounded-2xl text-[13px] font-semibold"
              style={{ background: recording ? "#B8452F" : "#17140F", color: "#F7F3EC" }}
            >
              {recording ? t.mediaStop : t.mediaRecord}
            </button>
          ) : null}

          {spoken && mode !== "photos" ? <p className="mt-2 text-[12px] leading-[1.4] text-muted">{spoken}</p> : null}

          <button type="button" onClick={() => void runDemo()} className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold text-muted">
            {t.restaurantQuickDemo}
          </button>
          <NativePhotoInputs cameraRef={cameraRef} galleryRef={galleryRef} onFile={(file) => void onFile(file)} />

          {mode === "photos" ? (
            <div className="mt-4 flex flex-col gap-3">
              <Field label={t.shopItemName}>
                <Input value={title} onChange={setTitle} />
              </Field>
              <Field label={t.shopItemPrice}>
                <Input value={price} placeholder={t.shopAskPrice} onChange={setPrice} />
              </Field>
              {ai ? <p className="text-[12px] leading-[1.4] text-muted">{ai}</p> : null}
            </div>
          ) : null}
        </>
      )}

      {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
      {note ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{note}</p> : null}
      {!ready ? <p className="mt-3 text-[13px] text-muted">{t.shopLoad}</p> : null}

      {user && !venue ? (
        <button type="button" onClick={goNeedPlace} className="mt-4 h-12 w-full rounded-2xl border border-line bg-white text-[14px] font-semibold">
          {t.restaurantNeedPlace}
        </button>
      ) : confirming ? (
        <button
          type="button"
          disabled={!selectedCount}
          onClick={publishDrafts}
          className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on disabled:opacity-40"
        >
          {t.shopPublishSelected(selectedCount)}
        </button>
      ) : mode === "photos" ? (
        <button type="button" onClick={publishPhoto} className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on">
          {t.shopItemPublish}
        </button>
      ) : null}
      {!user ? <p className="mt-2 text-center text-[12px] text-muted">{t.shopNeedAuth}</p> : null}
    </div>
  );
}
