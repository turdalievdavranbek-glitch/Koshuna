"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CITIES, DISTRICTS, GIS_CITIES } from "@/lib/data";
import { captureVideoPoster, keepBlob } from "@/lib/blob-media";
import { districtLabel, nearestDistrict } from "@/lib/geo";
import { locate, type LocateError } from "@/lib/locate";
import { videoMaxBytes } from "@/lib/media-limits";
import { jpegDataUrl } from "@/lib/photo-price";
import { shopErrorText, shopKindLabel } from "@/lib/shop-copy";
import {
  formatShopHours,
  landmarksFromText,
  pointGroupsFor,
  pointKindsFor,
  POINT_HIDDEN_GROUPS,
  pruneShopKinds,
  SHOP_CATEGORIES,
  shopDeliveryLine,
  shopDistrictName,
  shopKindsOf,
  shopLandmarkLine,
  toggleExtraCategory,
  toggleShopKind,
} from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop, ShopCategory, ShopKind } from "@/lib/types";
import { useDraftHistoryGuard } from "./draft-guard";
import { GeoError } from "./geo-error";
import { sectionIcon } from "./icons";
import { HoursPicker } from "./hours-picker";
import { LeaveDialog } from "./leave-dialog";
import { NativePhotoInputs } from "./native-photo";
import { POINT_GROUP_ICON, PointAvatar } from "./point-rows";
import { Chip, Field, Input, Toggle } from "./ui";

const GisMap = dynamic(() => import("./gis-map").then((m) => m.GisMap), { ssr: false });

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function initialLandmark(shop: Shop): string {
  if (shop.landmarks?.length) return shop.landmarks.join(" · ");
  return shop.address ?? "";
}

export function PointForm({
  mode,
  venue,
  createdId,
}: {
  mode: "create" | "edit";
  venue?: "shop" | "stall";
  createdId?: string;
}) {
  const {
    t,
    lang,
    user,
    shopDraft,
    startShopDraft,
    setShopDraft,
    lockShopField,
    saveShopDraft,
    publishShop,
    discardShopDraft,
    setLeaveGuard,
  } = useApp();
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const seenId = useRef("");
  const booted = useRef(false);
  const leaveBack = useRef<() => void>(() => undefined);
  const [landmarkText, setLandmarkText] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [hoursAsk, setHoursAsk] = useState(false);
  const [more, setMore] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<LocateError | null>(null);
  const [doneId, setDoneId] = useState(createdId ?? "");
  const [leave, setLeave] = useState<null | { proceed: () => void }>(null);
  const historyGuard = useDraftHistoryGuard(touched && !doneId, () => setLeave({ proceed: () => leaveBack.current() }));
  leaveBack.current = () => historyGuard.leave();

  useEffect(() => {
    if (mode !== "create" || createdId || booted.current) return;
    booted.current = true;
    startShopDraft(undefined, { fresh: true });
  }, [mode, createdId, startShopDraft]);

  useEffect(() => {
    if (!shopDraft || seenId.current === shopDraft.id) return;
    seenId.current = shopDraft.id;
    setLandmarkText(initialLandmark(shopDraft));
    if (mode === "edit" && (shopDraft.description || shopDraft.extraCategories.length || (shopDraft.kinds ?? []).length > 1)) {
      setMore(true);
    }
  }, [shopDraft, mode]);

  useEffect(() => {
    if (mode !== "create" || !venue || !shopDraft || shopDraft.venueKind === venue) return;
    setShopDraft({ venueKind: venue });
    // set once per draft; venueKind equality stops the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, venue, shopDraft?.id, shopDraft?.venueKind]);

  useEffect(() => {
    if (!touched || doneId) {
      setLeaveGuard(null);
      return;
    }
    setLeaveGuard(({ proceed }) => setLeave({ proceed }));
    return () => setLeaveGuard(null);
  }, [touched, doneId, setLeaveGuard]);

  if (doneId) {
    return (
      <div className="pb-5" data-testid="point-created">
        <p className="font-display text-[22px] font-bold text-ink">{t.pointCreated}</p>
        <button
          type="button"
          onClick={() => router.push(`/shops/quick?shop=${doneId}`)}
          className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
        >
          {t.pointAddProduct}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/shops/${doneId}`)}
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-white text-[15px] font-semibold"
        >
          {t.pointOpen}
        </button>
      </div>
    );
  }

  if (!shopDraft || !user) return <p className="text-[14px] text-muted">{t.shopLoad}</p>;
  const d = shopDraft;
  const creating = mode === "create";
  const groupChosen = !creating || Boolean(d.locked?.category);
  const groups = pointGroupsFor(d, creating);
  const kinds = groupChosen ? pointKindsFor(d.category, d.kinds, creating) : [];
  const primaryKind = (d.kinds ?? []).find((id) => pointKindsFor(d.category, d.kinds, creating).includes(id));
  const cityDistricts = DISTRICTS.filter((item) => item.city === d.city);
  const hoursLine = formatShopHours(d.hours, {
    days: { mon: t.dayMon, tue: t.dayTue, wed: t.dayWed, thu: t.dayThu, fri: t.dayFri, sat: t.daySat, sun: t.daySun },
    daily: t.hoursDaily,
    allDay: t.hours24,
  });
  const districtName = shopDistrictName(d.district, lang);
  const liveMarks = landmarksFromText(landmarkText);
  const kindText = primaryKind ? shopKindLabel(t, primaryKind) : d.category === "other" ? (d.kindOther ?? "").trim() : "";
  const previewMeta = groupChosen ? [t.shopCats[d.category], kindText].filter(Boolean).join(" · ") : "";
  const deliveryLine = shopDeliveryLine(d, t.pointDeliveryFreeLine, t.pointDeliveryPaidLine);

  const patch = (next: Partial<Shop>) => {
    setTouched(true);
    setShopDraft(next);
  };

  const chooseGroup = (id: ShopCategory) => {
    setTouched(true);
    const extraCategories = d.extraCategories.filter((item) => item !== id);
    const next = { category: id, extraCategories, kinds: d.kinds ?? [] };
    lockShopField("category");
    setShopDraft({
      ...next,
      kinds: pruneShopKinds(next),
      kindOther: id === "other" ? d.kindOther ?? "" : "",
    });
  };

  const chooseKind = (id: ShopKind) => {
    const inGroup = (d.kinds ?? []).filter((kind) => pointKindsFor(d.category, d.kinds, creating).includes(kind));
    const rest = (d.kinds ?? []).filter((kind) => !inGroup.includes(kind));
    if (inGroup[0] === id) {
      patch({ kinds: [...inGroup.slice(1), ...rest] });
      return;
    }
    const extras = inGroup.filter((kind) => kind !== id);
    patch({ kinds: [id, ...extras, ...rest] });
  };

  const setLandmark = (value: string) => {
    setLandmarkText(value);
    const marks = landmarksFromText(value);
    patch({ landmarks: marks, address: marks.join(" · ") });
  };

  const toggleLandmark = (stem: string) => {
    const parts = landmarksFromText(landmarkText);
    const hit = parts.findIndex((part) => part === stem || part.startsWith(stem));
    const next = hit >= 0 ? parts.filter((_, index) => index !== hit) : parts.length >= 3 ? parts : [...parts, stem];
    setLandmark(next.join(" · "));
  };

  const insertName = (piece: string) => {
    const cur = d.name.trim();
    patch({ name: cur ? `${cur} ${piece}` : piece });
  };

  const locatePin = async () => {
    setGeoBusy(true);
    setGeoError(null);
    const fix = await locate();
    setGeoBusy(false);
    if (!fix.ok) {
      setGeoError(fix.error);
      return;
    }
    const district = nearestDistrict(fix.lat, fix.lng, d.city);
    patch({ lat: fix.lat, lng: fix.lng, district: district?.id });
  };

  const onPhoto = async (file: File) => {
    setError("");
    try {
      const raw = await readFile(file);
      const compact = await jpegDataUrl(raw, 900);
      patch({ coverUrl: compact });
    } catch {
      setError(t.shopError);
    }
  };

  const onVideo = async (file: File) => {
    setError("");
    if (file.size > videoMaxBytes()) {
      setError(t.shopVideoSize);
      return;
    }
    const url = keepBlob("video", file);
    const poster = (await captureVideoPoster(url)) ?? "";
    patch(poster ? { videoUrl: url, coverUrl: poster } : { videoUrl: url });
  };

  const submit = async (skipHours = false) => {
    setError("");
    setNote("");
    if (!groupChosen) {
      setError(t.pointNeedGroup);
      return;
    }
    if (!d.name.trim()) {
      setError(t.shopNeedName);
      return;
    }
    const placed = Boolean(d.city && d.city !== "all") || (d.lat != null && d.lng != null);
    if (!placed) {
      setError(t.shopNeedCity);
      return;
    }
    if (!skipHours && !hoursLine) {
      setHoursAsk(true);
      return;
    }
    setHoursAsk(false);
    const marks = landmarksFromText(landmarkText);
    const shopToSave: Shop = {
      ...d,
      name: d.name.trim(),
      venueKind: d.venueKind ?? venue ?? "shop",
      landmarks: marks,
      address: marks.join(" · "),
      district: d.district || undefined,
      kindOther: d.category === "other" ? (d.kindOther ?? "").trim().slice(0, 40) : undefined,
      deliveryFree: d.delivery && typeof d.deliveryFree === "boolean" ? d.deliveryFree : undefined,
      deliveryDistricts: d.delivery ? (d.deliveryDistricts ?? []).slice(0, 10) : [],
      contacts: { ...d.contacts, phone: (d.contacts.phone ?? "").trim() },
    };
    setBusy(true);
    const result = await publishShop(shopToSave);
    setBusy(false);
    if (result.error || !result.shop) {
      setError(shopErrorText(t, result.error));
      return;
    }
    setTouched(false);
    setLeaveGuard(null);
    if (creating) {
      setDoneId(result.shop.id);
      return;
    }
    setNote(t.published);
    router.push(`/shops/${result.shop.id}`);
  };

  const nameCombo = `${groupChosen ? t.shopCats[d.category] : t.postSection} · ${districtName || t.pointDistrict}`;
  const landmarkChips = [
    { id: "entrance", label: t.pointChipEntrance, stem: t.pointChipEntrance },
    { id: "row", label: t.pointLandmarkRow, stem: t.pointLandmarkRow.replace("…", "").trim() },
    { id: "near", label: t.pointChipNear, stem: t.pointChipNear.replace("…", "").trim() },
    { id: "floor", label: t.pointChipFloor, stem: t.pointChipFloor },
  ];
  const extraPool = SHOP_CATEGORIES.filter((id) => {
    if (id === d.category) return false;
    if (!POINT_HIDDEN_GROUPS.includes(id)) return true;
    return d.extraCategories.includes(id);
  });

  return (
    <div data-testid="point-form" className="flex w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden pb-4">
      <div>
        <div className="flex flex-wrap gap-2">
          {(["shop", "stall"] as const).map((id) => (
            <Chip key={id} testId={`point-venue-${id}`} active={(d.venueKind ?? "shop") === id} accent={(d.venueKind ?? "shop") === id} onClick={() => patch({ venueKind: id })}>
              {id === "shop" ? t.sellCardShop : t.sellCardStall}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-[1.4] text-muted">{t.pointVenueHint}</p>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-ink">{t.pointSell}</div>
        <div data-testid="point-groups" className="mt-2 grid grid-cols-2 gap-2">
          {groups.map((id) => {
            const active = groupChosen && d.category === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`point-group-${id}`}
                onClick={() => chooseGroup(id)}
                className={`flex min-w-0 flex-col items-start gap-2 rounded-2xl border p-3 text-left ${active ? "border-accent bg-[#FFF4EC]" : "border-line bg-white"}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-chip">
                  {sectionIcon(POINT_GROUP_ICON[id] || "bag", "#B8452F", 18)}
                </span>
                <span className="text-[14px] font-semibold leading-tight text-ink">{t.shopCats[id]}</span>
              </button>
            );
          })}
        </div>
        {groupChosen && kinds.length ? (
          <div className="mt-3">
            <div className="text-[12px] text-muted">{t.pointKindOptional}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {kinds.map((id) => (
                <Chip key={id} testId={`point-kind-${id}`} active={primaryKind === id} onClick={() => chooseKind(id)}>
                  {t.shopKinds[id]}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        {groupChosen && d.category === "other" ? (
          <div className="mt-3">
            <Field label={t.pointKindOther}>
              <Input testId="point-kind-other" value={d.kindOther ?? ""} onChange={(value) => patch({ kindOther: value.slice(0, 40) })} />
            </Field>
          </div>
        ) : null}
        {creating ? (
          <button
            type="button"
            data-testid="point-service-link"
            onClick={() => {
              const go = () => router.push("/post?card=service");
              if (!touched) {
                go();
                return;
              }
              setLeave({ proceed: go });
            }}
            className="mt-3 text-left text-[13px] font-semibold leading-[1.4] text-accent"
          >
            {t.pointServiceLink}
          </button>
        ) : null}
      </div>

      <div>
        <Field label={t.shopName}>
          <Input testId="point-name" value={d.name} onChange={(value) => patch({ name: value })} />
        </Field>
        <p className="mt-2 text-[12px] leading-[1.4] text-muted">{t.pointNameHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip testId="point-name-combo" onClick={() => insertName(nameCombo)}>
            {nameCombo}
          </Chip>
          <Chip testId="point-name-row" onClick={() => insertName(t.pointChipRow.replace("…", "").trim())}>
            {t.pointChipRow}
          </Chip>
          <Chip testId="point-name-entrance" onClick={() => insertName(t.pointChipEntrance)}>
            {t.pointChipEntrance}
          </Chip>
        </div>
        <p className="mt-2 text-[12px] leading-[1.4] text-muted">{t.pointNameExample}</p>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-ink">{t.pointNoStreet}</div>
        <div className="mt-2 h-[160px] max-w-full overflow-hidden rounded-[18px] border border-line [&_.leaflet-control-attribution]:max-w-[68%] [&_.leaflet-control-attribution]:truncate">
          <GisMap
            center={{ lat: d.lat ?? GIS_CITIES.bishkek.lat, lng: d.lng ?? GIS_CITIES.bishkek.lng }}
            pick={d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null}
            onPick={(lat, lng) => {
              const district = nearestDistrict(lat, lng, d.city);
              patch({ lat, lng, district: district?.id ?? d.district });
            }}
          />
        </div>
        <p className="mt-1 text-[12px] text-muted">{t.pointOnMap}</p>
        <button
          type="button"
          data-testid="point-locate"
          disabled={geoBusy}
          onClick={() => void locatePin()}
          className="mt-2 h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold"
        >
          {t.pointLocate}
        </button>
        {geoError ? (
          <div className="mt-2">
            <GeoError error={geoError} compact onRetry={() => void locatePin()} />
          </div>
        ) : null}
        <div className="mt-3 text-[13px] font-semibold text-ink">{t.shopCity}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {CITIES.filter((id) => id !== "all").map((id) => (
            <Chip
              key={id}
              active={d.city === id}
              onClick={() => {
                const gis = GIS_CITIES[id];
                const keep = DISTRICTS.some((item) => item.city === id && item.id === d.district);
                patch({ city: id, lat: gis?.lat, lng: gis?.lng, district: keep ? d.district : undefined });
              }}
            >
              {t.cities[id]}
            </Chip>
          ))}
        </div>
        {cityDistricts.length ? (
          <div className="mt-3">
            <div className="text-[13px] font-semibold text-ink">{t.pointDistrict}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {cityDistricts.map((item) => (
                <Chip key={item.id} testId={`point-district-${item.id}`} active={d.district === item.id} onClick={() => patch({ district: d.district === item.id ? undefined : item.id })}>
                  {districtLabel(item, lang)}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-3">
          <Field label={t.pointLandmark}>
            <Input testId="point-landmark" value={landmarkText} onChange={setLandmark} />
          </Field>
          <div className="mt-2 flex flex-wrap gap-2">
            {landmarkChips.map((chip) => (
              <Chip key={chip.id} active={liveMarks.some((part) => part === chip.stem || part.startsWith(chip.stem))} onClick={() => toggleLandmark(chip.stem)}>
                {chip.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <HoursPicker hours={d.hours} onChange={(hours) => patch({ hours })} />
      {d.hoursNote?.trim() ? (
        <div className="rounded-[14px] border border-line bg-white p-3">
          <div className="text-[12px] font-semibold text-muted">{t.hoursOldNote}</div>
          <p className="mt-1 text-[13px] leading-[1.4] text-ink">{d.hoursNote}</p>
        </div>
      ) : null}
      {hoursAsk ? (
        <div data-testid="hours-soft" className="rounded-[14px] border border-line bg-white p-3">
          <p className="text-[13px] leading-[1.45] text-ink">{t.hoursSoftAsk}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              data-testid="hours-soft-fill"
              onClick={() => {
                setHoursAsk(false);
                document.getElementById("hours-block")?.scrollIntoView({ block: "center" });
              }}
              className="h-10 flex-1 rounded-xl bg-ink text-[13px] font-semibold text-screen"
            >
              {t.hoursSoftFill}
            </button>
            <button type="button" data-testid="hours-soft-skip" onClick={() => void submit(true)} className="h-10 flex-1 rounded-xl border border-line text-[13px] font-semibold">
              {t.hoursSoftSkip}
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3">
          <span className="text-[14px] font-semibold">{t.shopPickup}</span>
          <Toggle on={d.pickup} onChange={() => patch({ pickup: !d.pickup })} />
        </div>
        <div className="mt-3 text-[13px] font-semibold text-ink">{t.shopDelivery}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip testId="point-delivery-no" active={!d.delivery} onClick={() => patch({ delivery: false, deliveryFree: undefined, deliveryDistricts: [] })}>
            {t.pointDeliveryNo}
          </Chip>
          <Chip testId="point-delivery-yes" active={d.delivery} onClick={() => patch({ delivery: true })}>
            {t.pointDeliveryYes}
          </Chip>
        </div>
        {d.delivery ? (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              <Chip testId="point-delivery-free" active={d.deliveryFree === true} onClick={() => patch({ deliveryFree: true })}>
                {t.pointDeliveryFree}
              </Chip>
              <Chip testId="point-delivery-paid" active={d.deliveryFree === false} onClick={() => patch({ deliveryFree: false })}>
                {t.pointDeliveryPaid}
              </Chip>
            </div>
            {cityDistricts.length ? (
              <div className="mt-3">
                <div className="text-[13px] font-semibold text-ink">{t.pointDeliveryWhere}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cityDistricts.map((item) => {
                    const on = (d.deliveryDistricts ?? []).includes(item.id);
                    return (
                      <Chip
                        key={item.id}
                        active={on}
                        onClick={() => {
                          const cur = d.deliveryDistricts ?? [];
                          const next = on ? cur.filter((id) => id !== item.id) : cur.length >= 10 ? cur : [...cur, item.id];
                          patch({ deliveryDistricts: next });
                        }}
                      >
                        {districtLabel(item, lang)}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="mt-3">
              <Field label={t.shopDeliveryNote}>
                <Input value={d.deliveryNote ?? ""} onChange={(value) => patch({ deliveryNote: value })} />
              </Field>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink">{t.pointPhotoAdd}</span>
          <span className="text-[12px] text-muted">{t.pointOptional}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.pointPhotoHint}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => galleryRef.current?.click()} className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-chip text-accent">
            {d.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[28px] leading-none">+</span>
            )}
          </button>
          <button type="button" onClick={() => cameraRef.current?.click()} className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold">
            {t.postPhoto}
          </button>
          <button type="button" onClick={() => videoRef.current?.click()} className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold">
            {t.pointPhotoVideo}
          </button>
        </div>
        <NativePhotoInputs cameraRef={cameraRef} galleryRef={galleryRef} galleryTestId="point-photo" onFile={(file) => void onPhoto(file)} />
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void onVideo(file);
          }}
        />
      </div>

      <div data-testid="point-preview" className="rounded-[16px] border border-accent bg-white p-3">
        <div className="text-[12px] font-semibold text-muted">{t.pointPreview}</div>
        <div className="mt-2 flex min-w-0 items-center gap-3">
          <PointAvatar shop={{ ...d, coverUrl: d.coverUrl }} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-ink">{d.name.trim() || t.shopCard}</div>
            {previewMeta ? <div className="truncate text-[12px] text-accent">{previewMeta}</div> : null}
            {liveMarks.length ? <div className="truncate text-[12px] text-muted">{shopLandmarkLine({ landmarks: liveMarks, address: "" })}</div> : null}
            {districtName ? <div className="truncate text-[12px] text-muted">{`${districtName} ${t.pointOnMapShort}`}</div> : null}
            {hoursLine ? <div className="truncate text-[12px] text-muted">{hoursLine}</div> : null}
            {deliveryLine ? <div className="truncate text-[12px] text-muted">{deliveryLine}</div> : null}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink">{t.pointPhone}</span>
          <span className="text-[12px] text-muted">{t.pointPhoneLater}</span>
        </div>
        <div className="mt-2">
          <Input testId="point-phone" value={d.contacts.phone ?? ""} onChange={(value) => patch({ contacts: { ...d.contacts, phone: value } })} />
        </div>
      </div>

      <div>
        <button type="button" onClick={() => setMore((open) => !open)} className="text-[13px] font-semibold text-accent">
          {t.pointMore}
        </button>
        {more ? (
          <div className="mt-3 flex flex-col gap-3">
            <Field label={t.shopDesc}>
              <textarea
                value={d.description}
                onChange={(event) => patch({ description: event.target.value })}
                className="min-h-[88px] w-full rounded-[14px] border border-line bg-surface px-[15px] py-3 text-[15px] text-ink outline-none"
              />
            </Field>
            <div>
              <div className="text-[13px] font-semibold text-ink">{t.shopExtraCats}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {extraPool.map((id) => (
                  <Chip key={id} active={d.extraCategories.includes(id)} onClick={() => patch(toggleExtraCategory(d, id))}>
                    {t.shopCats[id]}
                  </Chip>
                ))}
              </div>
            </div>
            {shopKindsOf(d.category, ...d.extraCategories).length ? (
              <div>
                <div className="text-[13px] font-semibold text-ink">{t.shopDepartments}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {shopKindsOf(d.category, ...d.extraCategories)
                    .filter((id) => (id !== "health-clinic" && id !== "health-dentist") || (d.kinds ?? []).includes(id))
                    .map((id) => (
                      <Chip key={id} active={(d.kinds ?? []).includes(id)} onClick={() => patch({ kinds: toggleShopKind(d, id) })}>
                        {t.shopKinds[id]}
                      </Chip>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p data-testid="point-error" className="text-[13px] font-semibold text-accent">
          {error}
        </p>
      ) : null}
      {note ? <p className="text-[13px] font-semibold text-success-ink">{note}</p> : null}
      <button
        type="button"
        data-testid={creating ? "point-create" : "point-save"}
        disabled={busy}
        onClick={() => void submit(false)}
        className="shadow-btn h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on disabled:opacity-60"
      >
        {creating ? t.pointCreate : t.pointSave}
      </button>
      {creating ? <p className="text-center text-[12px] text-muted">{t.pointThenProduct}</p> : null}

      <LeaveDialog
        open={Boolean(leave)}
        onStay={() => {
          setLeave(null);
          historyGuard.stay();
        }}
        onSave={() => {
          const go = leave?.proceed;
          saveShopDraft();
          setLeave(null);
          setTouched(false);
          go?.();
        }}
        onDelete={() => {
          const go = leave?.proceed;
          discardShopDraft();
          setLeave(null);
          setTouched(false);
          go?.();
        }}
      />
    </div>
  );
}
