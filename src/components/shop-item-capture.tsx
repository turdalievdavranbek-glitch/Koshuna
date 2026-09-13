"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { recorderMime, sampleVideoStills, startSpeech } from "@/lib/blob-media";
import { jpegDataUrl, makeDemoPriceTag, priceFromPhoto, stillFromVideo } from "@/lib/photo-price";
import { shopVideoMaxSeconds, shopVideoMaxStills, videoMaxBytes } from "@/lib/media-limits";
import { DEMO_SHOP_COUNTER } from "@/lib/shop-ai";
import { draftsFromShopSpeech, pairDraftsWithStills, kindParent, type ShopItemDraft } from "@/lib/shop-media";
import { displayPhotoForProduct, isCompactPriceTagDataUrl, isGeneratedPriceTag, isStockShopPhoto, looksLikeRenderedPriceTag, photoForProductTitle } from "@/lib/shop-photos";
import { shopErrorText, shopKindLabel, shopQtyLabel } from "@/lib/shop-copy";
import { SHOP_CATEGORIES } from "@/lib/shops";
  assortmentUseCount,
  canReuseAssortment,
  isOwnShop,
  pickShopForKind,
  PRODUCT_REUSE_MAX,
  publicProduct,
  shopsOf,
  validPrice,
  validQuantity,
  SHOP_CATEGORIES,
} from "@/lib/shops";
import { DEMO_VIDEO_URL } from "@/lib/video-ai";
import { listingIdForProduct } from "@/lib/shop-listing";
import { useApp } from "@/lib/store";
import type { MediaKind, Shop, ShopCategory, ShopKind, ShopProduct } from "@/lib/types";
import { IconCamera } from "./icons";
import { GisOnMapCard } from "./gis-on-map";
import { Chip, Field, Input, Toggle } from "./ui";

export function ShopItemCapture({
  parent,
  kind,
  card,
}: {
  parent?: ShopCategory;
  kind?: ShopKind;
  card?: "shop" | "stall";
}) {
  const { t, user, shops, ready, upsertShopProduct, setPendingPath, startShopDraft, setShopDraft, publishShop } = useApp();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stopSpeech = useRef<(() => void) | null>(null);
  const recTimer = useRef(0);
  const spokenRef = useRef("");
  const priceTouched = useRef(false);
  const noPriceRef = useRef(false);
  const [mode, setMode] = useState<MediaKind>("photos");
  const [live, setLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [photo, setPhoto] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [noPrice, setNoPrice] = useState(false);
  const [fromPhoto, setFromPhoto] = useState(false);
  const [ai, setAi] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number; city: string; listingId?: string } | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [hoursNote, setHoursNote] = useState("");
  const [cardCat, setCardCat] = useState<ShopCategory | undefined>(parent);
  const [placeLat, setPlaceLat] = useState<number | undefined>();
  const [placeLng, setPlaceLng] = useState<number | undefined>();
  const [drafts, setDrafts] = useState<ShopItemDraft[]>([]);
  const shop = parent ? pickShopForKind(shops, user, parent, kind) : shopsOf(shops, user)[0];
  noPriceRef.current = noPrice;
  const here = parent && kind ? `/shops/c/${parent}/${kind}` : "/shops/quick";

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recStreamRef.current?.getTracks().forEach((track) => track.stop());
      recStreamRef.current = null;
      stopSpeech.current?.();
      if (recTimer.current) window.clearTimeout(recTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!photo) return;
    const next = photoForProductTitle(title, kind);
    if (!next || next === photo) return;
    if (isStockShopPhoto(photo) || isGeneratedPriceTag(photo) || isCompactPriceTagDataUrl(photo, title)) {
      setPhoto(next);
      return;
    }
    let cancelled = false;
    void looksLikeRenderedPriceTag(photo).then((tag) => {
      if (!cancelled && tag) setPhoto(next);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, photo, title]);

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

  const startCam = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t.mediaNoCamera);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setLive(true);
    } catch {
      setError(t.mediaNoCamera);
    }
  };

  const applyPhoto = async (dataUrl: string) => {
    setError("");
    setAi(t.shopItemAiBusy);
    const compact = await jpegDataUrl(dataUrl, 900);
    const tag =
      isGeneratedPriceTag(dataUrl) ||
      isGeneratedPriceTag(compact) ||
      isCompactPriceTagDataUrl(dataUrl, title) ||
      isCompactPriceTagDataUrl(compact, title) ||
      (await looksLikeRenderedPriceTag(dataUrl)) ||
      (await looksLikeRenderedPriceTag(compact));
    setPhoto(tag ? photoForProductTitle(title, kind) || photoForProductTitle("", kind) || compact : compact);
    try {
      const guess = await priceFromPhoto(dataUrl);
      if (noPriceRef.current) {
        setFromPhoto(false);
        setAi("");
      } else if (guess.price != null && !priceTouched.current) {
        setPrice(String(guess.price));
        setFromPhoto(true);
        setAi(t.shopItemPriceAi);
      } else if (guess.price != null && priceTouched.current) {
        setAi(t.shopItemPriceAi);
      } else {
        setFromPhoto(false);
        setAi(t.shopItemPriceNoAi);
      }
    } catch {
      setFromPhoto(false);
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

  const demoTag = async () => {
    priceTouched.current = false;
    setError("");
    setAi(t.shopItemAiBusy);
    const itemPhoto = photoForProductTitle(title, kind) || photoForProductTitle("", kind);
    if (itemPhoto) setPhoto(itemPhoto);
    if (!title.trim()) setTitle(shopKindLabel(t, kind) || t.shopItemName);
    try {
      const guess = await priceFromPhoto(makeDemoPriceTag(85));
      if (noPriceRef.current) {
        setFromPhoto(false);
        setAi("");
      } else if (guess.price != null && !priceTouched.current) {
        setPrice(String(guess.price));
        setFromPhoto(true);
        setAi(t.shopItemPriceAi);
      } else if (guess.price != null) {
        setAi(t.shopItemPriceAi);
      } else {
        setFromPhoto(false);
        setAi(t.shopItemPriceNoAi);
      }
    } catch {
      setFromPhoto(false);
      setAi(t.shopItemPriceNoAi);
    }
  };

  const applyTranscript = async (text: string, stills: string[], source: ShopItemDraft["source"]) => {
    const raw = draftsFromShopSpeech(text, { category: parent, kind });
    const next = pairDraftsWithStills(raw, stills, source).map((row) => ({
      ...row,
      photo: row.photo || photoForProductTitle(row.title, row.kind),
      kind: kind ?? row.kind,
      category: kindParent(kind ?? row.kind, parent ?? row.category),
      kindOptions: kind ? [kind] : row.kindOptions,
    }));
    if (!next.length) {
      setError(t.shopAiNeedSpeech);
      return;
    }
    rememberSpeech(text);
    setDrafts(next);
    setError("");
    setNote("");
    setMapPin(null);
    stopCam();
  };

  const startVoice = async () => {
    setError("");
    setNote("");
    setMapPin(null);
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
    const recStream = recStreamRef.current;
    recStreamRef.current = null;
    recStream?.getTracks().forEach((track) => track.stop());
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
    const stills = photo ? [photo] : [];
    await applyTranscript(spokenRef.current, stills, "voice");
  };

  const startVideo = async () => {
    setError("");
    setNote("");
    setMapPin(null);
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
      rec.onstop = () => {
        resolve(new Blob(chunks.current, { type: rec.mimeType || "video/webm" }));
      };
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
    setMapPin(null);
    setMode("video");
    try {
      const stills = await sampleVideoStills(DEMO_VIDEO_URL, shopVideoMaxStills());
      await applyTranscript(DEMO_SHOP_COUNTER, stills, "video");
    } catch {
      await applyTranscript(DEMO_SHOP_COUNTER, [], "video");
    }
  };

  const ensurePlace = async (): Promise<Shop | null> => {
    if (shop) return shop;
    if (!user) return null;
    const draft = startShopDraft();
    if (!draft) return null;
    setShopDraft({
      name: placeName.trim() || (card === "stall" ? t.sellCardStall : t.sellCardShop),
      address: placeAddress.trim() || t.cities[draft.city] || draft.city,
      hoursNote: hoursNote.trim(),
      venueKind: card ?? "shop",
      category: parent ?? cardCat ?? draft.category,
      status: "draft",
      lat: placeLat ?? draft.lat,
      lng: placeLng ?? draft.lng,
    });
    const saved = await publishShop();
    return saved.shop;
  };

  const changeMode = (next: MediaKind) => {
    if (recording) return;
    stopCam();
    setMode(next);
    setDrafts([]);
    rememberSpeech("");
    setError("");
    setNote("");
    setMapPin(null);
  };

  const publish = async () => {
    setError("");
    setNote("");
    setMapPin(null);
    if (!user) {
      setPendingPath(here);
      router.push("/login");
      return;
    }
    const place = shop ?? (await ensurePlace());
    if (!place) {
      setPendingPath(here);
      router.push("/shops/new");
      return;
    }
    if (!photo && mode !== "text") {
      setError(t.shopItemNeedPhoto);
      return;
    }
    if (!title.trim()) {
      setError(t.shopNeedName);
      return;
    }
    const n = noPrice || !price.trim() ? undefined : validPrice(price);
    if (!noPrice && price.trim() && n == null) {
      setError(t.shopNeedPrice);
      return;
    }
    const quantity = qty.trim() ? validQuantity(qty) : undefined;
    if (qty.trim() && quantity == null) {
      setError(t.shopNeedQuantity);
      return;
    }
    const result = await upsertShopProduct(place.id, {
      title: title.trim(),
      price: n,
      quantity,
      photo: photo || undefined,
      category: parent ?? cardCat,
      kind,
      priceFromPhoto: fromPhoto,
    });
    if (result.error) {
      setError(shopErrorText(t, result.error));
      return;
    }
    setNote(t.shopItemPublished);
    if (place.lat != null && place.lng != null && result.product) {
      setMapPin({
        lat: place.lat,
        lng: place.lng,
        city: place.city,
        listingId: result.product.listingId || listingIdForProduct(result.product.id),
      });
    }
    setPhoto("");
    setTitle("");
    setPrice("");
    setQty("");
    setNoPrice(false);
    setFromPhoto(false);
    setAi("");
    priceTouched.current = false;
  };

  const reuse = async (item: ShopProduct) => {
    if (!shop) return;
    const result = await upsertShopProduct(shop.id, {
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      photo: item.photo,
      category: item.category,
      kind: item.kind,
      unit: item.unit,
      sourceId: assortmentKey(item),
      priceFromPhoto: item.priceFromPhoto,
    });
    if (result.error) setError(shopErrorText(t, result.error));
    else setNote(t.shopItemReused);
  };

  const publishDrafts = async () => {
    setError("");
    setNote("");
    setMapPin(null);
    if (!user) {
      setPendingPath(here);
      router.push("/login");
      return;
    }
    const place = shop ?? (await ensurePlace());
    if (!place) {
      setPendingPath(here);
      router.push("/shops/new");
      return;
    }
    const selected = drafts.filter((row) => row.selected);
    if (!selected.length) return;
    let lastId: string | undefined;
    for (const row of selected) {
      if (!row.photo) {
        setError(t.shopItemNeedPhoto);
        return;
      }
      if (!row.title.trim()) {
        setError(t.shopNeedName);
        return;
      }
      const result = await upsertShopProduct(place.id, {
        title: row.title.trim(),
        price: row.price,
        quantity: row.quantity,
        unit: row.unit,
        photo: row.photo,
        category: row.category ?? parent,
        kind: row.kind,
        priceFromPhoto: false,
      });
      if (result.error) {
        setError(shopErrorText(t, result.error));
        return;
      }
      lastId = result.product?.listingId || (result.product ? listingIdForProduct(result.product.id) : lastId);
    }
    setDrafts([]);
    rememberSpeech("");
    setNote(t.shopItemPublished);
    if (place.lat != null && place.lng != null) {
      setMapPin({ lat: place.lat, lng: place.lng, city: place.city, listingId: lastId });
    }
  };

  const patchDraft = (id: string, patch: Partial<ShopItemDraft>) => {
    setDrafts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const mine = shop ? shop.products.filter((item) => (kind ? item.kind === kind : true)) : [];
  const publicItems = kind
    ? shops.flatMap((row) =>
        row.products
          .filter((item) => item.kind === kind && publicProduct(item, row) && !isOwnShop(row, user))
          .map((product) => ({ shop: row, product })),
      )
    : [];
  const confirming = drafts.length > 0;
  const selectedCount = drafts.filter((row) => row.selected).length;

  return (
    <div className="pb-5">
      {parent && kind ? (
        <p className="text-[12px] text-muted">
          {t.shopCats[parent]} · {shopKindLabel(t, kind)}
        </p>
      ) : (
        <p className="text-[12px] text-muted">{card === "stall" ? t.sellCardStall : card === "shop" ? t.sellCardShop : t.shopQuickCta}</p>
      )}
      <p className="mt-1 text-[13px] leading-[1.45] text-muted">
        {card === "stall" ? t.sellCardStallHint : card === "shop" ? t.sellCardShopHint : t.shopQuickHint}
      </p>

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
        <Chip active={mode === "text"} onClick={() => changeMode("text")}>
          {t.mediaText}
        </Chip>
      </div>

      {card ? (
        <div className="mt-3 flex flex-col gap-3">
          <Field label={t.shopName}>
            <Input value={placeName} onChange={setPlaceName} placeholder={card === "stall" ? t.sellCardStall : t.sellCardShop} />
          </Field>
          <Field label={t.venueAddress}>
            <Input value={placeAddress} onChange={setPlaceAddress} />
          </Field>
          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition((pos) => {
                setPlaceLat(pos.coords.latitude);
                setPlaceLng(pos.coords.longitude);
              });
            }}
            className="h-10 rounded-xl border border-line text-[13px] font-semibold"
          >
            {t.locationGeo}
          </button>
          <div className="flex flex-wrap gap-2">
            {SHOP_CATEGORIES.map((id) => (
              <Chip key={id} active={(cardCat ?? parent) === id} onClick={() => setCardCat(id)}>
                {t.shopCats[id]}
              </Chip>
            ))}
          </div>
          <Field label={t.shopHoursOptional}>
            <Input value={hoursNote} onChange={setHoursNote} />
          </Field>
        </div>
      ) : null}

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
                    <div className="mt-2">
                      <Field label={t.shopProductQuantity}>
                        <Input
                          value={row.quantity != null ? String(row.quantity) : ""}
                          placeholder={t.shopQuantityPh}
                          onChange={(v) => patchDraft(row.id, { quantity: v.trim() ? validQuantity(v) : undefined })}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
                {row.kindOptions.length ? (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[11px] font-semibold text-muted">{t.shopKindGuess}</p>
                    <div className="flex flex-wrap gap-2">
                      {row.kindOptions.map((id) => (
                        <Chip
                          key={id}
                          active={row.kind === id}
                          onClick={() =>
                            patchDraft(row.id, { kind: id, category: kindParent(id, parent) })
                          }
                        >
                          {shopKindLabel(t, id)}
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
          {mode !== "text" ? (
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
          ) : null}

          {mode === "photos" ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {live ? (
                  <button type="button" onClick={() => void shot()} className="h-11 rounded-2xl bg-accent text-[13px] font-semibold text-accent-on">
                    {t.shopItemShot}
                  </button>
                ) : (
                  <button type="button" onClick={() => void startCam()} className="h-11 rounded-2xl bg-ink text-[13px] font-semibold text-screen">
                    {t.camera}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-11 rounded-2xl border border-line bg-white text-[13px] font-semibold"
                >
                  {t.gallery}
                </button>
              </div>
              <button type="button" onClick={() => void demoTag()} className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold text-muted">
                {t.shopItemDemoTag}
              </button>
            </>
          ) : null}

          {mode === "voice" ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {live ? (
                  <button type="button" onClick={() => void shot()} className="h-11 rounded-2xl bg-accent text-[13px] font-semibold text-accent-on">
                    {t.shopItemShot}
                  </button>
                ) : (
                  <button type="button" onClick={() => void startCam()} className="h-11 rounded-2xl bg-ink text-[13px] font-semibold text-screen">
                    {t.camera}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-11 rounded-2xl border border-line bg-white text-[13px] font-semibold"
                >
                  {t.gallery}
                </button>
              </div>
              <button
                type="button"
                onClick={() => (recording ? void stopVoice() : void startVoice())}
                className="mt-2 h-11 w-full rounded-2xl text-[13px] font-semibold"
                style={{ background: recording ? "#B8452F" : "#17140F", color: "#F7F3EC" }}
              >
                {recording ? t.mediaStop : t.mediaVoiceRec}
              </button>
              {spoken ? <p className="mt-2 text-[12px] leading-[1.4] text-muted">{spoken}</p> : null}
            </>
          ) : null}

          {mode === "video" ? (
            <>
              <button
                type="button"
                onClick={() => (recording ? void stopVideo() : void startVideo())}
                className="mt-3 h-11 w-full rounded-2xl text-[13px] font-semibold"
                style={{ background: recording ? "#B8452F" : "#17140F", color: "#F7F3EC" }}
              >
                {recording ? t.mediaStop : t.mediaRecord}
              </button>
              {spoken ? <p className="mt-2 text-[12px] leading-[1.4] text-muted">{spoken}</p> : null}
              <button
                type="button"
                onClick={() => (recording ? void stopVoice() : void startVoice())}
                className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold"
              >
                {recording ? t.mediaStop : t.mediaAddVoice}
              </button>
            </>
          ) : null}

          {mode === "text" ? (
            <div className="mt-4 flex flex-col gap-3">
              <Field label={t.shopItemName}>
                <Input value={title} onChange={setTitle} />
              </Field>
              <Field label={t.shopItemPrice}>
                <Input value={noPrice ? "" : price} onChange={setPrice} placeholder={t.shopAskPrice} />
              </Field>
              <p className="text-[12px] leading-[1.4] text-muted">{t.pasteListingHint}</p>
            </div>
          ) : null}

          {mode !== "text" ? (
          <button type="button" onClick={() => void runDemo()} className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold text-muted">
            {t.shopQuickDemo}
          </button>
          ) : null}
          <input
            ref={fileRef}
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

          {mode === "photos" ? (
            <div className="mt-4 flex flex-col gap-3">
              <Field label={t.shopItemName}>
                <Input value={title} onChange={setTitle} />
              </Field>
              <Field label={t.shopItemPrice}>
                <Input
                  value={noPrice ? "" : price}
                  placeholder={noPrice ? t.shopAskPrice : undefined}
                  disabled={noPrice}
                  onChange={(v) => {
                    priceTouched.current = true;
                    setNoPrice(false);
                    setFromPhoto(false);
                    setPrice(v);
                  }}
                />
              </Field>
              <Field label={t.shopProductQuantity}>
                <Input value={qty} onChange={setQty} placeholder={t.shopQuantityPh} />
              </Field>
              <p className="-mt-2 text-[12px] leading-[1.4] text-muted">{t.shopQuantityHint}</p>
              <div className="flex items-start justify-between gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
                <div>
                  <div className="text-[15px] font-semibold text-ink">{t.shopNoPrice}</div>
                  <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.shopNoPriceHint}</p>
                </div>
                <Toggle
                  on={noPrice}
                  onChange={() => {
                    const next = !noPrice;
                    setNoPrice(next);
                    if (next) {
                      priceTouched.current = true;
                      setPrice("");
                      setFromPhoto(false);
                      setAi("");
                    }
                  }}
                />
              </div>
              {ai ? <p className="text-[12px] leading-[1.4] text-muted">{ai}</p> : null}
              <p className="text-[12px] text-muted-2">{t.shopItemReuseRule}</p>
            </div>
          ) : null}
        </>
      )}

      {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
      {note ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{note}</p> : null}
      {mapPin ? (
        <div className="mt-3">
          <GisOnMapCard city={mapPin.city} lat={mapPin.lat} lng={mapPin.lng} listingId={mapPin.listingId} compact showHint />
        </div>
      ) : null}

      {!ready ? <p className="mt-3 text-[13px] text-muted">{t.shopLoad}</p> : null}
      {user && !shop && !card ? (
        <button
          type="button"
          onClick={() => {
            setPendingPath(here);
            router.push("/shops/new");
          }}
          className="mt-4 h-12 w-full rounded-2xl border border-line bg-white text-[14px] font-semibold"
        >
          {t.shopItemNeedShop}
        </button>
      ) : confirming ? (
        <button
          type="button"
          disabled={!selectedCount}
          onClick={() => void publishDrafts()}
          className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on disabled:opacity-40"
        >
          {t.shopPublishSelected(selectedCount)}
        </button>
      ) : mode === "photos" || mode === "text" ? (
        <button type="button" onClick={() => void publish()} className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on">
          {t.shopItemPublish}
        </button>
      ) : null}
      {!user ? (
        <p className="mt-2 text-center text-[12px] text-muted">{t.shopNeedAuth}</p>
      ) : null}

      {mine.length ? (
        <div className="mt-6">
          <div className="font-display text-[16px] font-bold text-ink">{t.shopItemMine}</div>
          <div className="mt-2 flex flex-col gap-2">
            {mine.map((item) => (
              <ItemCard
                key={item.id}
                product={item}
                shop={shop as Shop}
                uses={assortmentUseCount(shop as Shop, assortmentKey(item))}
                canReuse={canReuseAssortment(shop as Shop, assortmentKey(item))}
                onReuse={() => void reuse(item)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {publicItems.length ? (
        <div className="mt-6">
          <div className="font-display text-[16px] font-bold text-ink">{t.shopCatalog}</div>
          <div className="mt-2 flex flex-col gap-2">
            {publicItems.map(({ shop: row, product }) => (
              <button
                key={`${row.id}-${product.id}`}
                type="button"
                onClick={() => router.push(`/shops/${row.id}`)}
                className="flex gap-3 rounded-[16px] border border-line bg-white p-3 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayPhotoForProduct(product)} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{product.title}</span>
                  <span className="mt-0.5 block text-[13px] font-semibold text-accent">
                    {product.price != null ? `${formatSom(product.price)} KGS` : t.shopAskPrice}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-2">{row.name}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemCard({
  product,
  uses,
  canReuse,
  onReuse,
}: {
  product: ShopProduct;
  shop: Shop;
  uses: number;
  canReuse: boolean;
  onReuse: () => void;
}) {
  const { t } = useApp();
  return (
    <div className="flex gap-3 rounded-[16px] border border-line bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={displayPhotoForProduct(product)} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-ink">{product.title}</div>
        <div className="mt-0.5 text-[13px] font-semibold text-accent">
          {product.price != null ? `${formatSom(product.price)} KGS` : t.shopAskPrice}
        </div>
        {shopQtyLabel(t, product) ? <div className="mt-0.5 text-[11px] text-muted">{shopQtyLabel(t, product)}</div> : null}
        {product.priceFromPhoto ? <div className="mt-0.5 text-[11px] text-muted">{t.shopItemPriceAiShort}</div> : null}
        <div className="mt-0.5 text-[11px] text-muted-2">{t.shopItemReuseLeft(PRODUCT_REUSE_MAX - uses, PRODUCT_REUSE_MAX)}</div>
        <button
          type="button"
          disabled={!canReuse}
          onClick={onReuse}
          className="mt-2 h-9 rounded-xl border border-line px-3 text-[12px] font-semibold disabled:opacity-40"
        >
          {t.shopItemReuse}
        </button>
      </div>
    </div>
  );
}
