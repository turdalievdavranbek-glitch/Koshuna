"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { CITIES, GIS_CITIES } from "@/lib/data";
import { captureVideoPoster, keepBlob, recorderMime, startSpeech } from "@/lib/blob-media";
import { videoMaxBytes, videoMaxSeconds } from "@/lib/media-limits";
import { applyShopAi, classifyShopSpeech } from "@/lib/shop-ai";
import { shopErrorText } from "@/lib/shop-copy";
import { publishErrors } from "@/lib/shop-rules";
import { parentOfShopKind, SHOP_CATEGORIES, setPrimaryCategory, shopKindsOf, toggleExtraCategory, toggleShopKind } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop, ShopCategory, ShopHoursSlot } from "@/lib/types";
import { GisMap } from "./gis-map";
import { GisOnMapCard } from "./gis-on-map";
import { ShopKindPicker } from "./shop-kind-picker";
import { Chip, Eyebrow, Field, Input, Toggle } from "./ui";

type AiState = "idle" | "recording" | "analyzing" | "ready" | "empty" | "error";

export function ShopForm() {
  const {
    t,
    user,
    shopDraft,
    setShopDraft,
    lockShopField,
    saveShopDraft,
    publishShop,
    startShopDraft,
    pendingPath,
    setPendingPath,
  } = useApp();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stopSpeech = useRef<(() => void) | null>(null);
  const [ai, setAi] = useState<AiState>("idle");
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [onMap, setOnMap] = useState<{ lat: number; lng: number; city: string } | null>(null);
  const [deptParent, setDeptParent] = useState<ShopCategory | null>(null);

  useEffect(() => {
    if (!shopDraft && user) startShopDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopDraft, user]);

  if (!shopDraft) return <p className="text-[14px] text-muted">{t.shopLoad}</p>;
  const d = shopDraft;

  const lock = (key: keyof Shop, patch: Partial<typeof d>) => {
    lockShopField(key);
    setShopDraft(patch);
  };

  const stopRec = () => {
    recRef.current?.stop();
    recRef.current = null;
    stopSpeech.current?.();
    stopSpeech.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const runAnalyze = async (transcript: string) => {
    setAi("analyzing");
    setError("");
    const local = classifyShopSpeech(transcript);
    const localPatch = applyShopAi(d, local);
    setShopDraft({ transcript, ...localPatch });
    try {
      const res = await fetch("/api/shops/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript, draft: { ...d, transcript, ...localPatch } }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; patch?: Partial<typeof d> };
      if (data.ok && data.patch) setShopDraft(data.patch);
      else if (!data.ok && data.error === "need-transcript") setAi("empty");
      setAi(transcript.trim() ? "ready" : "empty");
    } catch {
      setAi(transcript.trim() ? "ready" : "error");
    }
  };

  const startRec = async () => {
    setBusy("");
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setBusy(t.mediaNoCamera);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const mime = recorderMime("video");
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "video/webm" });
        if (blob.size > videoMaxBytes()) {
          setError(t.shopVideoSize);
          setAi("error");
          return;
        }
        const url = keepBlob("video", blob);
        const poster = (await captureVideoPoster(url)) ?? undefined;
        setShopDraft({ videoUrl: url, coverUrl: poster || d.coverUrl });
        setAi("idle");
      };
      rec.start();
      recRef.current = rec;
      setAi("recording");
      setLive("");
      stopSpeech.current?.();
      stopSpeech.current = startSpeech((text) => {
        setLive(text);
        setShopDraft({ transcript: text });
      });
    } catch {
      setBusy(t.mediaNoCamera);
    }
  };

  const onFile = async (file: File) => {
    setError("");
    if (file.size > videoMaxBytes()) {
      setError(t.shopVideoSize);
      return;
    }
    const url = keepBlob("video", file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    await new Promise<void>((resolve) => {
      probe.onloadedmetadata = () => resolve();
      probe.onerror = () => resolve();
      window.setTimeout(() => resolve(), 2000);
    });
    if (probe.duration && probe.duration > videoMaxSeconds()) {
      setError(t.shopVideoTime);
      return;
    }
    const poster = (await captureVideoPoster(url)) ?? undefined;
    setShopDraft({ videoUrl: url, coverUrl: poster || d.coverUrl });
  };

  const save = () => {
    saveShopDraft();
    setNote(t.shopDraftSaved);
    setError("");
  };

  const publish = async () => {
    setError("");
    if (!d.aiConfirmed) {
      setError(t.shopNeedConfirm);
      return;
    }
    const errs = publishErrors(d);
    if (errs.length) {
      setError(shopErrorText(t, errs[0]));
      return;
    }
    saveShopDraft();
    const result = await publishShop();
    if (result.error) {
      setError(shopErrorText(t, result.error));
      saveShopDraft();
      return;
    }
    const next = pendingPath;
    if (next && (next.startsWith("/shops/quick") || next.startsWith("/shops/c/"))) {
      setPendingPath(null);
      router.push(next);
      return;
    }
    const shop = result.shop;
    if (shop && shop.lat != null && shop.lng != null) {
      setOnMap({ lat: shop.lat, lng: shop.lng, city: shop.city });
    }
    setNote(t.published);
  };

  const slot = (label: string, value: ShopHoursSlot | null | undefined, onChange: (next: ShopHoursSlot | null | undefined) => void) => (
    <div className="rounded-[14px] border border-line bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <Chip active={value === null} onClick={() => onChange(value === null ? { open: "09:00", close: "18:00" } : null)}>
          {t.shopClosedDay}
        </Chip>
      </div>
      {value !== null ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label={t.shopOpen}>
            <Input value={value?.open ?? ""} onChange={(v) => onChange({ open: v, close: value?.close ?? "18:00" })} placeholder="09:00" />
          </Field>
          <Field label={t.shopClose}>
            <Input value={value?.close ?? ""} onChange={(v) => onChange({ open: value?.open ?? "09:00", close: v })} placeholder="18:00" />
          </Field>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
    <div className="flex flex-col gap-5">
      <div>
        <Eyebrow>{t.shopVideo}</Eyebrow>
        <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.shopAiHint}</p>
        <video ref={videoRef} muted playsInline className="mt-3 max-h-[220px] w-full rounded-[18px] bg-ink object-contain" />
        {d.videoUrl && ai !== "recording" ? (
          <video src={d.videoUrl} poster={d.coverUrl} controls playsInline className="mt-2 max-h-[220px] w-full rounded-[18px] bg-ink object-contain" />
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ai === "recording" ? (
            <button
              type="button"
              onClick={() => {
                stopRec();
                void runAnalyze(d.transcript || live);
              }}
              className="h-12 rounded-2xl bg-accent text-[14px] font-semibold text-accent-on"
            >
              {t.shopStop}
            </button>
          ) : (
            <button type="button" onClick={() => void startRec()} className="h-12 rounded-2xl bg-ink text-[14px] font-semibold text-screen">
              {t.shopRecord}
            </button>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="h-12 rounded-2xl border border-line bg-white text-[14px] font-semibold">
            {t.shopUpload}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
        {live ? <p className="mt-2 text-[12px] text-muted">{live}</p> : null}
        {ai === "analyzing" ? <p className="mt-2 text-[13px] font-semibold text-accent-dark">{t.shopAiBusy}</p> : null}
        {ai === "ready" ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{t.shopAiReady}</p> : null}
        {ai === "empty" ? <p className="mt-2 text-[13px] text-muted">{t.shopAiNeedSpeech}</p> : null}
        {ai === "error" ? <p className="mt-2 text-[13px] text-accent">{t.shopAiNoService}</p> : null}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => void runAnalyze(d.transcript || live)} className="h-10 rounded-2xl border border-line bg-white px-3 text-[12px] font-semibold">
            {t.shopAiRetry}
          </button>
          <button type="button" onClick={() => setAi("idle")} className="h-10 rounded-2xl border border-line bg-white px-3 text-[12px] font-semibold">
            {t.shopAiManual}
          </button>
        </div>
      </div>

      {d.pendingProducts?.length ? (
        <div className="rounded-[18px] border border-line bg-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.shopAiPendingItems}</div>
          <div className="mt-2 flex flex-col gap-2">
            {d.pendingProducts.map((item, i) => (
              <div key={`${item.title}-${i}`} className="flex items-center justify-between gap-2 rounded-[14px] bg-chip px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{item.title}</div>
                  {item.price ? <div className="text-[12px] text-muted">{item.price} KGS</div> : <div className="text-[12px] text-muted">{t.shopAskPrice}</div>}
                  {item.quantity != null && item.quantity > 0 ? (
                    <div className="text-[12px] text-muted">
                      {item.quantity} {t.shopUnits[item.unit ?? "piece"]}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-screen"
                    onClick={() => {
                      const now = new Date().toISOString();
                      setShopDraft({
                        products: [
                          ...d.products,
                          {
                            id: `sp-${Date.now()}-${i}`,
                            shopId: d.id,
                            title: item.title,
                            price: item.price,
                            quantity: item.quantity,
                            currency: "KGS",
                            unit: item.unit ?? "piece",
                            stock: "in",
                            category: d.category,
                            published: true,
                            createdAt: now,
                            updatedAt: now,
                          },
                        ],
                        pendingProducts: d.pendingProducts?.filter((_, j) => j !== i),
                      });
                    }}
                  >
                    {t.shopAiAcceptItem}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold"
                    onClick={() => setShopDraft({ pendingProducts: d.pendingProducts?.filter((_, j) => j !== i) })}
                  >
                    {t.shopAiSkipItem}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Field label={t.shopName}>
        <Input value={d.name} onChange={(v) => lock("name", { name: v })} />
      </Field>
      <Field label={t.shopDesc}>
        <textarea
          value={d.description}
          onChange={(e) => lock("description", { description: e.target.value })}
          className="min-h-[96px] w-full rounded-[14px] border border-line bg-surface px-[15px] py-3 text-[15px] text-ink outline-none"
        />
      </Field>

      <div>
        <Eyebrow>{t.shopCategory}</Eyebrow>
        <div className="mt-2 flex flex-wrap gap-2">
          {SHOP_CATEGORIES.map((id) => (
            <Chip
              key={id}
              active={d.category === id}
              accent={d.category === id}
              onClick={() => {
                lock("category", setPrimaryCategory(d, id as ShopCategory));
                if (shopKindsOf(id).length) setDeptParent(id);
              }}
            >
              {t.shopCats[id]}
            </Chip>
          ))}
        </div>
        <div className="mt-3 text-[13px] font-semibold text-ink">{t.shopExtraCats}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SHOP_CATEGORIES.filter((id) => id !== d.category).map((id) => (
            <Chip
              key={id}
              active={d.extraCategories.includes(id)}
              onClick={() => {
                const adding = !d.extraCategories.includes(id);
                lock("extraCategories", toggleExtraCategory(d, id));
                if (adding && shopKindsOf(id).length) setDeptParent(id);
              }}
            >
              {t.shopCats[id]}
            </Chip>
          ))}
        </div>
        {shopKindsOf(d.category, ...d.extraCategories).length ? (
          <div className="mt-3">
            <div className="text-[13px] font-semibold text-ink">{t.shopDepartments}</div>
            <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.shopDepartmentHint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(d.kinds ?? []).length ? (
                (d.kinds ?? []).map((id) => (
                  <Chip key={id} active onClick={() => setDeptParent(parentOfShopKind(id) ?? d.category)}>
                    {t.shopKinds[id]}
                  </Chip>
                ))
              ) : (
                <span className="text-[13px] text-muted">{t.shopAllInCat}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDeptParent(d.category)}
              className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold"
            >
              {t.shopPickDepartments}
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <Eyebrow>{t.shopCity}</Eyebrow>
        <div className="mt-2 flex flex-wrap gap-2">
          {CITIES.filter((id) => id !== "all").map((id) => (
            <Chip
              key={id}
              active={d.city === id}
              onClick={() => {
                lockShopField("city");
                const gis = GIS_CITIES[id];
                setShopDraft({ city: id, lat: gis?.lat, lng: gis?.lng });
              }}
            >
              {t.cities[id]}
            </Chip>
          ))}
        </div>
      </div>
      <Field label={t.shopAddress}>
        <Input value={d.address} onChange={(v) => lock("address", { address: v })} />
      </Field>
      <div>
        <Eyebrow>{t.shopMap}</Eyebrow>
        <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.shopMapHint}</p>
        <div className="mt-2 h-[180px] overflow-hidden rounded-[18px] border border-line">
          <GisMap
            center={{ lat: d.lat ?? GIS_CITIES.bishkek.lat, lng: d.lng ?? GIS_CITIES.bishkek.lng }}
            pick={d.lat && d.lng ? { lat: d.lat, lng: d.lng } : null}
            onPick={(lat, lng) => lock("lat", { lat, lng })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>{t.shopHours}</Eyebrow>
        {slot(t.shopWeekdays, d.hours?.weekdays, (weekdays) => lock("hours", { hours: { ...d.hours, weekdays } }))}
        {slot(t.shopSaturday, d.hours?.saturday, (saturday) => lock("hours", { hours: { ...d.hours, saturday } }))}
        {slot(t.shopSunday, d.hours?.sunday, (sunday) => lock("hours", { hours: { ...d.hours, sunday } }))}
        <Field label={t.shopHoursNote}>
          <Input value={d.hoursNote ?? ""} onChange={(v) => lock("hoursNote", { hoursNote: v })} />
        </Field>
      </div>

      <Field label={t.shopPhone}>
        <Input value={d.contacts.phone ?? ""} onChange={(v) => lock("contacts", { contacts: { ...d.contacts, phone: v } })} />
      </Field>
      <div className="flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3">
        <span className="text-[14px] font-semibold">WhatsApp</span>
        <Toggle on={Boolean(d.contacts.whatsapp)} onChange={() => lock("contacts", { contacts: { ...d.contacts, whatsapp: !d.contacts.whatsapp } })} />
      </div>
      <div className="flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3">
        <span className="text-[14px] font-semibold">Telegram</span>
        <Toggle on={Boolean(d.contacts.telegram)} onChange={() => lock("contacts", { contacts: { ...d.contacts, telegram: !d.contacts.telegram } })} />
      </div>
      <div className="flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3">
        <span className="text-[14px] font-semibold">{t.shopPickup}</span>
        <Toggle on={d.pickup} onChange={() => lock("pickup", { pickup: !d.pickup })} />
      </div>
      <div className="flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3">
        <span className="text-[14px] font-semibold">{t.shopDelivery}</span>
        <Toggle on={d.delivery} onChange={() => lock("delivery", { delivery: !d.delivery })} />
      </div>
      {d.delivery ? (
        <Field label={t.shopDeliveryNote}>
          <Input value={d.deliveryNote ?? ""} onChange={(v) => lock("deliveryNote", { deliveryNote: v })} />
        </Field>
      ) : null}

      <div className="flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3">
        <span className="text-[14px] font-semibold">{t.shopAiConfirm}</span>
        <Toggle on={d.aiConfirmed} onChange={() => setShopDraft({ aiConfirmed: !d.aiConfirmed })} />
      </div>

      {error ? <p className="text-[13px] font-semibold text-accent">{error}</p> : null}
      {busy ? <p className="text-[13px] text-muted">{busy}</p> : null}
      {note ? <p className="text-[13px] font-semibold text-success-ink">{note}</p> : null}
      {onMap ? <GisOnMapCard city={onMap.city} lat={onMap.lat} lng={onMap.lng} compact showHint /> : null}

      <button type="button" onClick={save} className="h-12 rounded-2xl border border-line bg-white text-[15px] font-semibold">
        {t.shopDraftSave}
      </button>
      <button type="button" onClick={() => void publish()} className="shadow-btn h-12 rounded-2xl bg-accent text-[15px] font-semibold text-accent-on">
        {t.shopPublish}
      </button>
    </div>
    {deptParent
      ? createPortal(
          <div className="absolute inset-0 z-30 flex flex-col bg-screen pt-11">
            <ShopKindPicker
              parent={deptParent}
              multiple
              selected={(d.kinds ?? []).filter((id) => shopKindsOf(deptParent).includes(id))}
              onToggle={(id) => lock("kinds", { kinds: toggleShopKind(d, id) })}
              onBack={() => setDeptParent(null)}
              onDone={() => setDeptParent(null)}
            />
          </div>,
          document.getElementById("konshu-phone") ?? document.body,
        )
      : null}
    </>
  );
}
