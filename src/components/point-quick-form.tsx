"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, DISTRICTS, GIS_CITIES } from "@/lib/data";
import { districtLabel, spotForFix } from "@/lib/geo";
import { locate, type LocateError } from "@/lib/locate";
import { jpegDataUrl } from "@/lib/photo-price";
import { shopErrorText } from "@/lib/shop-copy";
import { landmarksFromText, normalizePhone, pointGroupsFor } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop, ShopCategory } from "@/lib/types";
import { GeoError } from "./geo-error";
import { HoursPicker } from "./hours-picker";
import { sectionIcon } from "./icons";
import { NativePhotoInputs } from "./native-photo";
import { POINT_GROUP_ICON } from "./point-rows";
import { Chip, Field, Input } from "./ui";

export const POINT_NEW_KEY = "konshu-point-new";

const inputClass =
  "h-[50px] w-full rounded-[14px] border border-line bg-surface px-[15px] text-[15px] text-ink outline-none placeholder:text-muted-2";

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

/** New point on one short screen: name, phone, type, place. Everything else is optional. */
export function PointQuickForm({ venue }: { venue?: "shop" | "stall" }) {
  const { t, lang, user, city, filters, shopDraft, startShopDraft, setShopDraft, publishShop } = useApp();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const booted = useRef(false);
  const [group, setGroup] = useState<ShopCategory | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [landmark, setLandmark] = useState("");
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<LocateError | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (booted.current || !user) return;
    booted.current = true;
    const draft = startShopDraft(undefined, { fresh: true });
    if (!draft) return;
    const chosen = knownCity(city) ?? knownCity(filters.city);
    const gis = chosen ? GIS_CITIES[chosen] : null;
    setShopDraft({
      venueKind: venue ?? "shop",
      city: chosen ?? "all",
      lat: gis?.lat,
      lng: gis?.lng,
      district: undefined,
      contacts: { ...draft.contacts, phone: draft.contacts.phone || user.phone || "" },
    });
    if (!chosen) setPlaceOpen(true);
    // Store setters are new on every render; this runs once per screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        nameRef.current?.focus();
      } catch {
        /* ignore */
      }
    }, 60);
    return () => window.clearTimeout(id);
  }, []);

  if (!user || !shopDraft) return <p className="text-[14px] text-muted">{t.shopLoad}</p>;
  const d = shopDraft;
  const groups = pointGroupsFor(d, true);
  const placed = Boolean(knownCity(d.city)) || (d.lat != null && d.lng != null && d.city !== "all");
  const cityDistricts = DISTRICTS.filter((item) => item.city === d.city);
  const district = cityDistricts.find((item) => item.id === d.district);
  const placeLine = placed
    ? [t.cities[d.city] || d.city, district ? districtLabel(district, lang) : ""].filter(Boolean).join(" · ")
    : t.pointQuickPlacePick;
  const phone = d.contacts.phone ?? "";

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
    try {
      const raw = await readFile(file);
      setShopDraft({ coverUrl: await jpegDataUrl(raw, 900) });
    } catch {
      setError(t.shopError);
    }
  };

  const submit = async () => {
    setError("");
    if (!d.name.trim()) {
      setError(t.shopNeedName);
      nameRef.current?.focus();
      return;
    }
    if (normalizePhone(phone).length < 9) {
      setError(t.pointQuickPhoneNeed);
      return;
    }
    if (!group) {
      setError(t.pointNeedGroup);
      return;
    }
    if (!placed) {
      setPlaceOpen(true);
      setError(t.shopNeedCity);
      return;
    }
    const marks = landmarksFromText(landmark);
    const shop: Shop = {
      ...d,
      name: d.name.trim().slice(0, 80),
      category: group,
      kinds: [],
      venueKind: d.venueKind ?? venue ?? "shop",
      landmarks: marks,
      address: marks.join(" · "),
      district: d.district || undefined,
      description: d.description.trim(),
      contacts: { ...d.contacts, phone: phone.trim() },
    };
    setBusy(true);
    const result = await publishShop(shop);
    setBusy(false);
    if (result.error || !result.shop) {
      setError(shopErrorText(t, result.error));
      return;
    }
    try {
      sessionStorage.setItem(POINT_NEW_KEY, result.shop.id);
    } catch {
      /* private mode */
    }
    router.replace(`/shops/${result.shop.id}`);
  };

  return (
    <div data-testid="point-quick" className="flex w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden pb-4">
      <label className="block">
        <span className="block text-[13px] font-semibold text-ink">{t.pointQuickName}</span>
        <input
          ref={nameRef}
          data-testid="point-name"
          value={d.name}
          maxLength={80}
          enterKeyHint="next"
          placeholder={t.pointQuickNameHint}
          onChange={(event) => setShopDraft({ name: event.target.value })}
          className={`mt-[7px] ${inputClass}`}
        />
      </label>

      <label className="block">
        <span className="block text-[13px] font-semibold text-ink">{t.pointQuickPhone}</span>
        <input
          data-testid="point-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          placeholder="+996 …"
          onChange={(event) => setShopDraft({ contacts: { ...d.contacts, phone: event.target.value } })}
          className={`mt-[7px] ${inputClass}`}
        />
      </label>

      <div>
        <div className="text-[13px] font-semibold text-ink">{t.pointQuickType}</div>
        <div data-testid="point-groups" className="mt-2 grid grid-cols-3 gap-2 desk:grid-cols-4">
          {groups.map((id) => {
            const active = group === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`point-group-${id}`}
                aria-pressed={active}
                onClick={() => setGroup(id)}
                className={`flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-2 text-center touch-manipulation ${active ? "border-accent bg-[#FFF4EC]" : "border-line bg-white"}`}
              >
                {sectionIcon(POINT_GROUP_ICON[id] || "bag", active ? "#B8452F" : "#5C5246", 20)}
                <span className="text-[12px] font-semibold leading-tight text-ink">{t.pointCatShort[id] ?? t.shopCats[id]}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => router.push("/post?card=service")} className="mt-2 text-left text-[12px] font-semibold text-muted">
          {t.pointServiceLink}
        </button>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-ink">{t.pointQuickPlace}</div>
        <div className="mt-2 flex items-center justify-between gap-2 rounded-[14px] border border-line bg-white px-4 py-3">
          <span data-testid="point-place" className={`min-w-0 truncate text-[14px] font-semibold ${placed ? "text-ink" : "text-muted"}`}>
            {placeLine}
          </span>
          <button type="button" onClick={() => setPlaceOpen((open) => !open)} className="shrink-0 text-[13px] font-semibold text-accent">
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
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold disabled:opacity-60"
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
      </div>

      <div>
        <button type="button" data-testid="point-more" onClick={() => setMore((open) => !open)} className="text-[13px] font-semibold text-accent">
          {more ? "▾ " : "▸ "}
          {t.pointQuickMore}
        </button>
        {!more ? <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.pointQuickMoreHint}</p> : null}
        {more ? (
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex gap-1.5">
              {(["shop", "stall"] as const).map((id) => {
                const active = (d.venueKind ?? venue ?? "shop") === id;
                return (
                  <Chip key={id} active={active} onClick={() => setShopDraft({ venueKind: id })}>
                    {id === "shop" ? t.sellCardShop : t.sellCardStall}
                  </Chip>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <button type="button" onClick={() => galleryRef.current?.click()} className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold">
                {t.postGallery}
              </button>
              <NativePhotoInputs
                cameraRef={cameraRef}
                galleryRef={galleryRef}
                galleryTestId="point-photo"
                onFile={(file) => void onPhoto(file)}
                onGalleryFiles={(files) => void onPhoto(files[0])}
              />
            </div>
            <Field label={t.pointLandmark}>
              <Input testId="point-landmark" value={landmark} onChange={setLandmark} />
            </Field>
            <Field label={t.shopDesc}>
              <textarea
                value={d.description}
                onChange={(event) => setShopDraft({ description: event.target.value })}
                className="min-h-[80px] w-full rounded-[14px] border border-line bg-surface px-[15px] py-3 text-[15px] text-ink outline-none"
              />
            </Field>
            <HoursPicker hours={d.hours} onChange={(hours) => setShopDraft({ hours })} />
          </div>
        ) : null}
      </div>

      {error ? (
        <p data-testid="point-error" className="text-[13px] font-semibold text-accent">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="point-create"
        disabled={busy}
        onClick={() => void submit()}
        className="shadow-btn h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on disabled:opacity-60"
      >
        {t.pointOpen}
      </button>
    </div>
  );
}
