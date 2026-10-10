"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, DISTRICTS, GIS_CITIES } from "@/lib/data";
import { districtLabel, spotForFix } from "@/lib/geo";
import { locate, type LocateError } from "@/lib/locate";
import { jpegDataUrl } from "@/lib/photo-price";
import { shopErrorText } from "@/lib/shop-copy";
import { landmarksFromText, NEW_POINT_GROUPS, normalizePhone } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop, ShopCategory } from "@/lib/types";
import { GeoError } from "./geo-error";
import { NativePhotoInputs } from "./native-photo";
import { Chip } from "./ui";

export const POINT_NEW_KEY = "konshu-point-new";
const STEP_KEY = "konshu-point-wizard";
const STEPS = 5;

export type PointKind = "shop" | "stall" | "service" | "cafe";

export function pointKindOf(raw: string | null | undefined): PointKind | undefined {
  return raw === "shop" || raw === "stall" || raw === "service" || raw === "cafe" ? raw : undefined;
}

/** Service wizard tiles, in the same order and wording as the search «Услуги» groups. */
const SERVICE_GROUPS: Array<{ id: ShopCategory; label: string }> = [
  { id: "auto", label: "svc-transport" },
  { id: "repair", label: "svc-tech" },
  { id: "household", label: "svc-home" },
  { id: "beauty", label: "svc-leisure" },
  { id: "tailor", label: "svc-clothes" },
  { id: "events", label: "svc-events" },
  { id: "travel", label: "svc-tourism" },
  { id: "health", label: "svc-health" },
  { id: "education", label: "education" },
  { id: "farm", label: "svc-farm" },
  { id: "other", label: "other" },
];
export const CAFE_TYPES = ["cafe", "canteen", "coffee", "fastfood", "restaurant", "chaikhana"] as const;
type CafeType = (typeof CAFE_TYPES)[number];

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function knownCity(id: string | undefined | null): string | null {
  return id && id !== "all" && GIS_CITIES[id] ? id : null;
}

function readStep(id: string): number {
  try {
    const raw = JSON.parse(localStorage.getItem(STEP_KEY) || "null") as { id?: string; step?: number } | null;
    if (raw?.id === id && typeof raw.step === "number" && raw.step >= 0 && raw.step < STEPS) return raw.step;
  } catch {
    /* ignore */
  }
  return 0;
}

function writeStep(id: string, step: number | null) {
  try {
    if (step == null) localStorage.removeItem(STEP_KEY);
    else localStorage.setItem(STEP_KEY, JSON.stringify({ id, step }));
  } catch {
    /* private mode */
  }
}

/**
 * New point as a wizard: one question per screen.
 * 1 name · 2 phone · 3 facade photo (skippable) · 4 place + landmark · 5 type → «Открыть точку».
 * Progress is kept in the persisted shop draft, so the owner can come back later.
 */
/** One wizard for every business card: shop, stall, service/master and cafe. */
export function PointWizard({ kind }: { kind: PointKind }) {
  const { t, lang, user, city, filters, shopDraft, startShopDraft, setShopDraft, lockShopField, publishShop } = useApp();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const landmarkRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const booted = useRef(false);
  const [step, setStep] = useState(0);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [landmark, setLandmark] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<LocateError | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (booted.current || !user) return;
    booted.current = true;
    const prev = shopDraft && shopDraft.status !== "active" && (shopDraft.venueKind ?? "shop") === kind ? shopDraft : null;
    const draft = startShopDraft(undefined, prev ? undefined : { fresh: true });
    if (!draft) return;
    if (draft === prev || draft.id === prev?.id) {
      setStep(readStep(draft.id));
      setLandmark((draft.landmarks ?? []).join(" · ") || draft.address || "");
      if (!knownCity(draft.city)) setPlaceOpen(true);
      return;
    }
    const chosen = knownCity(city) ?? knownCity(filters.city);
    const gis = chosen ? GIS_CITIES[chosen] : null;
    setShopDraft({
      venueKind: kind,
      category: kind === "cafe" ? "food" : draft.category,
      city: chosen ?? "all",
      lat: gis?.lat,
      lng: gis?.lng,
      district: undefined,
      contacts: { ...draft.contacts, phone: draft.contacts.phone || user.phone || "" },
    });
    if (!chosen) setPlaceOpen(true);
    writeStep(draft.id, 0);
    // Store setters are new on every render; this runs once per screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const target = step === 0 ? nameRef : step === 1 ? phoneRef : null;
    if (!target) return;
    const id = window.setTimeout(() => {
      try {
        target.current?.focus();
      } catch {
        /* ignore */
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [step, shopDraft?.id]);

  if (!user || !shopDraft) return <p className="text-[14px] text-muted">{t.shopLoad}</p>;
  const d = shopDraft;
  const groups: Array<{ id: ShopCategory; label: string }> =
    kind === "service"
      ? SERVICE_GROUPS.map((row) => ({ id: row.id, label: t.cats[row.label] ?? t.shopCats[row.id] ?? row.id }))
      : NEW_POINT_GROUPS.map((id) => ({ id, label: t.pointCatShort[id] ?? t.shopCats[id] ?? id }));
  const cafeType = CAFE_TYPES.find((id) => d.locked?.category && d.kindOther === t.cafeTypes[id]) ?? null;
  const group = kind === "cafe" ? (cafeType ? ("food" as ShopCategory) : null) : d.locked?.category ? d.category : null;
  const placed = Boolean(knownCity(d.city));
  const cityDistricts = DISTRICTS.filter((item) => item.city === d.city);
  const district = cityDistricts.find((item) => item.id === d.district);
  const placeLine = placed
    ? [t.cities[d.city] || d.city, district ? districtLabel(district, lang) : ""].filter(Boolean).join(" · ")
    : t.pointQuickPlacePick;
  const phone = d.contacts.phone ?? "";

  const go = (next: number) => {
    setError("");
    setStep(next);
    writeStep(d.id, next);
  };

  const check = (at: number): string => {
    if (at === 0 && !d.name.trim()) return t.shopNeedName;
    if (at === 1 && normalizePhone(phone).length < 9) return t.pointQuickPhoneNeed;
    if (at === 3 && !placed) return t.shopNeedCity;
    if (at === 4 && !group) return t.pointNeedGroup;
    return "";
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
    const spot = spotForFix(fix.lat, fix.lng);
    setShopDraft({ lat: fix.lat, lng: fix.lng, ...(spot.city ? { city: spot.city } : {}), district: spot.district?.id });
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setPhotoBusy(true);
    try {
      const raw = await readFile(file);
      setShopDraft({ coverUrl: await jpegDataUrl(raw, 900) });
    } catch {
      setError(t.shopError);
    } finally {
      setPhotoBusy(false);
    }
  };

  const changeLandmark = (value: string) => {
    setLandmark(value);
    const marks = landmarksFromText(value);
    setShopDraft({ landmarks: marks, address: marks.join(" · ") });
  };

  const submit = async () => {
    for (let at = 0; at < STEPS; at += 1) {
      const problem = check(at);
      if (problem) {
        go(at);
        setError(problem);
        return;
      }
    }
    const marks = landmarksFromText(landmark);
    const shop: Shop = {
      ...d,
      name: d.name.trim().slice(0, 80),
      category: group ?? d.category,
      kinds: [],
      kindOther: kind === "cafe" && cafeType ? t.cafeTypes[cafeType] : undefined,
      venueKind: kind,
      landmarks: marks,
      address: marks.join(" · "),
      district: d.district || undefined,
      contacts: { ...d.contacts, phone: phone.trim() },
    };
    setError("");
    setBusy(true);
    const result = await publishShop(shop);
    setBusy(false);
    if (result.error || !result.shop) {
      setError(shopErrorText(t, result.error));
      return;
    }
    writeStep(d.id, null);
    try {
      sessionStorage.setItem(POINT_NEW_KEY, result.shop.id);
    } catch {
      /* private mode */
    }
    router.replace(`/shops/${result.shop.id}`);
  };

  const next = () => {
    const problem = check(step);
    if (problem) {
      setError(problem);
      return;
    }
    if (step === STEPS - 1) {
      void submit();
      return;
    }
    go(step + 1);
  };

  const goods = kind === "shop" || kind === "stall";
  const titles = [
    t.pointQuickName,
    t.pointQuickPhone,
    goods ? t.pointQuickPhoto : t.pointQuickCover,
    t.pointQuickPlace,
    kind === "service" ? t.pointQuickTypeService : kind === "cafe" ? t.pointQuickTypeCafe : t.pointQuickType,
  ];
  const hints = [
    kind === "service" ? t.pointQuickNameHintService : kind === "cafe" ? t.pointQuickNameHintCafe : t.pointQuickNameHint,
    t.pointQuickPhoneHint,
    goods ? t.pointQuickPhotoHint : t.pointQuickCoverHint,
    t.pointQuickPlaceHint,
    t.pointQuickTypeHint,
  ];
  const pickCafe = (id: CafeType) => {
    setError("");
    lockShopField("category");
    setShopDraft({ category: "food", kinds: [], kindOther: t.cafeTypes[id] });
  };
  const last = step === STEPS - 1;
  const bigInput =
    "h-[56px] w-full rounded-[16px] border border-line bg-surface px-4 text-[17px] text-ink outline-none placeholder:text-muted-2 focus:border-accent";

  return (
    <div data-testid="point-wizard" className="flex min-h-full w-full min-w-0 max-w-full flex-col overflow-x-hidden pb-4">
      <div className="flex items-center justify-between text-[12px] font-semibold text-muted">
        <span data-testid="point-step">{t.pointStepOf.replace("{n}", String(step + 1)).replace("{total}", String(STEPS))}</span>
        <span>{Math.round(((step + 1) / STEPS) * 100)}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-chip" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
      </div>

      <h2 className="mt-6 font-display text-[24px] font-bold leading-tight text-ink">{titles[step]}</h2>
      <p className="mt-1.5 text-[14px] leading-[1.45] text-muted">{hints[step]}</p>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          next();
        }}
      >
        {step === 0 ? (
          <input
            ref={nameRef}
            data-testid="point-name"
            value={d.name}
            maxLength={80}
            enterKeyHint="next"
            placeholder={t.pointQuickNameExample}
            onChange={(event) => setShopDraft({ name: event.target.value })}
            className={bigInput}
          />
        ) : null}

        {step === 1 ? (
          <input
            ref={phoneRef}
            data-testid="point-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            value={phone}
            placeholder="+996 …"
            onChange={(event) => setShopDraft({ contacts: { ...d.contacts, phone: event.target.value } })}
            className={bigInput}
          />
        ) : null}

        {step === 2 ? (
          <div>
            <button
              type="button"
              data-testid="point-photo-box"
              onClick={() => cameraRef.current?.click()}
              className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-line bg-chip text-[15px] font-semibold text-accent"
            >
              {d.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.coverUrl} alt="" className="h-full w-full bg-chip object-contain" />
              ) : photoBusy ? (
                t.shopLoad
              ) : (
                <span className="text-[40px] leading-none">+</span>
              )}
            </button>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => cameraRef.current?.click()} className="h-12 flex-1 rounded-2xl border border-line bg-white text-[14px] font-semibold">
                {t.postPhoto}
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()} className="h-12 flex-1 rounded-2xl border border-line bg-white text-[14px] font-semibold">
                {t.postGallery}
              </button>
            </div>
            <NativePhotoInputs
              cameraRef={cameraRef}
              galleryRef={galleryRef}
              galleryTestId="point-photo"
              onFile={(file) => void onPhoto(file)}
              onGalleryFiles={(files) => void onPhoto(files[0])}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <div className="flex items-center justify-between gap-2 rounded-[16px] border border-line bg-white px-4 py-3.5">
              <span data-testid="point-place" className={`min-w-0 truncate text-[16px] font-semibold ${placed ? "text-ink" : "text-muted"}`}>
                {placeLine}
              </span>
              <button type="button" onClick={() => setPlaceOpen((open) => !open)} className="shrink-0 text-[14px] font-semibold text-accent">
                {t.pointQuickPlaceChange}
              </button>
            </div>
            {placeOpen ? (
              <div className="mt-3">
                <button
                  type="button"
                  data-testid="point-locate"
                  disabled={geoBusy}
                  onClick={() => void locatePin()}
                  className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] font-semibold disabled:opacity-60"
                >
                  {t.pointQuickGeo}
                </button>
                {geoError ? (
                  <div className="mt-2">
                    <GeoError error={geoError} compact onRetry={() => void locatePin()} />
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {CITIES.filter((id) => id !== "all").map((id) => (
                    <Chip
                      key={id}
                      active={d.city === id}
                      onClick={() => {
                        const gis = GIS_CITIES[id];
                        setShopDraft({ city: id, lat: gis?.lat, lng: gis?.lng, district: undefined });
                      }}
                    >
                      {t.cities[id]}
                    </Chip>
                  ))}
                </div>
                {cityDistricts.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cityDistricts.map((item) => (
                      <Chip
                        key={item.id}
                        active={d.district === item.id}
                        onClick={() => setShopDraft({ district: d.district === item.id ? undefined : item.id })}
                      >
                        {districtLabel(item, lang)}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <label className="mt-4 block">
              <span className="block text-[14px] font-semibold text-ink">{t.pointQuickStreet}</span>
              <input
                ref={landmarkRef}
                data-testid="point-landmark"
                value={landmark}
                maxLength={120}
                enterKeyHint="next"
                placeholder={t.pointQuickStreetHint}
                onChange={(event) => changeLandmark(event.target.value)}
                className={`mt-2 ${bigInput}`}
              />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          kind === "cafe" ? (
            <div data-testid="point-groups" className="grid grid-cols-2 gap-2 desk:grid-cols-3">
              {CAFE_TYPES.map((id) => {
                const active = cafeType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`point-cafe-${id}`}
                    aria-pressed={active}
                    onClick={() => pickCafe(id)}
                    className={`flex min-h-[64px] min-w-0 items-center justify-center rounded-2xl border px-2 text-center text-[15px] font-semibold text-ink touch-manipulation ${active ? "border-2 border-accent bg-[#FFF4EC]" : "border-line bg-white"}`}
                  >
                    {t.cafeTypes[id]}
                  </button>
                );
              })}
            </div>
          ) : (
            <div data-testid="point-groups" className="grid grid-cols-2 gap-2 desk:grid-cols-3">
              {groups.map(({ id, label }) => {
                const active = group === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`point-group-${id}`}
                    aria-pressed={active}
                    onClick={() => {
                      setError("");
                      lockShopField("category");
                      setShopDraft({ category: id, kinds: [], kindOther: undefined, extraCategories: d.extraCategories.filter((item) => item !== id) });
                    }}
                    className={`flex min-h-[64px] min-w-0 items-center justify-center rounded-2xl border px-2 py-2 text-center text-[14px] font-semibold leading-tight text-ink touch-manipulation ${active ? "border-2 border-accent bg-[#FFF4EC]" : "border-line bg-white"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )
        ) : null}

        {error ? (
          <p data-testid="point-error" className="mt-3 text-[14px] font-semibold text-accent">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          data-testid={last ? "point-create" : "point-next"}
          disabled={busy || photoBusy}
          className="shadow-btn mt-6 h-[56px] w-full rounded-2xl bg-accent text-[17px] font-semibold text-accent-on disabled:opacity-60"
        >
          {last ? t.pointOpen : t.pointNext}
        </button>
      </form>

      {step === 2 && !d.coverUrl ? (
        <button type="button" data-testid="point-photo-skip" onClick={() => go(3)} className="mt-3 h-11 w-full text-[14px] font-semibold text-muted">
          {t.pointQuickPhotoSkip}
        </button>
      ) : null}
      {step > 0 ? (
        <button type="button" data-testid="point-prev" onClick={() => go(step - 1)} className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink">
          ← {t.pointPrev}
        </button>
      ) : null}
      <p className="mt-4 text-center text-[12px] text-muted">{t.pointDraftSaved}</p>
    </div>
  );
}
