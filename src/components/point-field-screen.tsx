"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { GIS_CITIES } from "@/lib/data";
import { goBack } from "@/lib/go-back";
import { jpegDataUrl } from "@/lib/photo-price";
import { shopErrorText } from "@/lib/shop-copy";
import { isOwnShop, landmarksFromText } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop, ShopHours } from "@/lib/types";
import { HoursPicker } from "./hours-picker";
import { IconBack } from "./icons";
import { NativePhotoInputs } from "./native-photo";
import { PlaceCascade } from "./place-cascade";

const GisMap = dynamic(() => import("./gis-map").then((m) => m.GisMap), { ssr: false });

export const POINT_FIELDS = ["photo", "hours", "desc", "place", "item"] as const;
export type PointField = (typeof POINT_FIELDS)[number];
export function isPointField(raw: string | undefined): raw is PointField {
  return (POINT_FIELDS as readonly string[]).includes(raw ?? "");
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const bigInput =
  "h-[56px] w-full rounded-[16px] border border-line bg-surface px-4 text-[17px] text-ink outline-none placeholder:text-muted-2 focus:border-accent";

/** One question per screen for a point that already exists: photo, hours, description, place or one service/menu item. */
export function PointFieldScreen({ shopId, field }: { shopId: string; field: PointField }) {
  const { t, user, shops, synced, publishShop, upsertShopProduct } = useApp();
  const router = useRouter();
  const shop = shops.find((item) => item.id === shopId);
  const seeded = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState("");
  const [hours, setHours] = useState<ShopHours | undefined>(undefined);
  const [desc, setDesc] = useState("");
  const [landmark, setLandmark] = useState("");
  const [place, setPlace] = useState<Pick<Shop, "city" | "district" | "lat" | "lng">>({ city: "all" });
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shop || seeded.current) return;
    seeded.current = true;
    setCover(shop.coverUrl ?? "");
    setHours(shop.hours);
    setDesc(shop.description ?? "");
    setLandmark((shop.landmarks ?? []).join(" · ") || shop.address || "");
    setPlace({ city: shop.city, district: shop.district, lat: shop.lat, lng: shop.lng });
  }, [shop]);

  const back = () => goBack(router, `/shops/${shopId}`);
  const done = () => router.replace(`/shops/${shopId}`);

  if (!shop) {
    return <p className="px-5 pt-4 text-[14px] text-muted">{synced ? t.shopForbidden : t.shopLoad}</p>;
  }
  if (!isOwnShop(shop, user)) return <p className="px-5 pt-4 text-[14px] text-muted">{t.shopForbidden}</p>;

  const kind = shop.venueKind ?? "shop";
  const itemTitle = kind === "cafe" ? t.fieldMenuTitle : t.fieldServiceTitle;
  const itemHint = kind === "cafe" ? t.fieldMenuHint : t.fieldServiceHint;
  const copy: Record<PointField, { title: string; hint: string }> = {
    photo: { title: kind === "shop" || kind === "stall" ? t.pointQuickPhoto : t.pointQuickCover, hint: t.fieldPhotoHint },
    hours: { title: t.pointTodoHours, hint: t.fieldHoursHint },
    desc: { title: t.pointTodoDesc, hint: t.fieldDescHint },
    place: { title: t.pointTodoPlace, hint: t.fieldPlaceHint },
    item: { title: itemTitle, hint: itemHint },
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setPhotoBusy(true);
    try {
      setCover(await jpegDataUrl(await readFile(file), 900));
    } catch {
      setError(t.shopError);
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    setError("");
    if (field === "item") {
      if (!title.trim()) {
        setError(t.shopNeedName);
        return;
      }
      const digits = price.replace(/\s/g, "");
      const n = digits ? Number(digits) : undefined;
      if (digits && (!Number.isFinite(n) || (n ?? 0) < 0)) {
        setError(t.shopNeedPrice);
        return;
      }
      setBusy(true);
      const result = await upsertShopProduct(shop.id, { title: title.trim().slice(0, 80), price: n, unit: "other", stock: "in" });
      setBusy(false);
      if (result.error) {
        setError(shopErrorText(t, result.error));
        return;
      }
      done();
      return;
    }
    let patch: Partial<Shop> = {};
    if (field === "photo") {
      if (!cover) {
        setError(t.fieldPhotoNeed);
        return;
      }
      patch = { coverUrl: cover };
    }
    if (field === "hours") patch = { hours };
    if (field === "desc") patch = { description: desc.trim().slice(0, 1000) };
    if (field === "place") {
      if (!place.city || place.city === "all") {
        setError(t.shopNeedCity);
        return;
      }
      const marks = landmarksFromText(landmark);
      patch = { ...place, landmarks: marks, address: marks.join(" · ") || shop.address };
    }
    setBusy(true);
    const result = await publishShop({ ...shop, ...patch });
    setBusy(false);
    if (result.error || !result.shop) {
      setError(shopErrorText(t, result.error));
      return;
    }
    done();
  };

  return (
    <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1" data-testid={`point-field-${field}`}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface" aria-label={t.backLeave}>
          <IconBack size={16} color="#17140F" />
        </button>
        <span className="min-w-0 truncate px-2 font-display text-[15px] font-bold">{shop.name}</span>
        <span className="w-9" />
      </div>

      <h2 className="mt-6 font-display text-[24px] font-bold leading-tight text-ink">{copy[field].title}</h2>
      <p className="mt-1.5 text-[14px] leading-[1.45] text-muted">{copy[field].hint}</p>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {field === "photo" ? (
          <div>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-line bg-chip text-[15px] font-semibold text-accent"
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full bg-chip object-contain" />
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
              galleryTestId="point-field-photo"
              onFile={(file) => void onPhoto(file)}
              onGalleryFiles={(files) => void onPhoto(files[0])}
            />
          </div>
        ) : null}

        {field === "hours" ? <HoursPicker hours={hours} onChange={setHours} /> : null}

        {field === "desc" ? (
          <textarea
            data-testid="point-field-desc"
            value={desc}
            maxLength={1000}
            autoFocus
            placeholder={t.fieldDescPlaceholder}
            onChange={(event) => setDesc(event.target.value)}
            className="min-h-[160px] w-full rounded-[16px] border border-line bg-surface px-4 py-3 text-[16px] leading-[1.5] text-ink outline-none focus:border-accent"
          />
        ) : null}

        {field === "place" ? (
          <div>
            <div className="h-[200px] max-w-full overflow-hidden rounded-[18px] border border-line [&_.leaflet-control-attribution]:max-w-[68%] [&_.leaflet-control-attribution]:truncate">
              <GisMap
                center={{
                  lat: place.lat ?? GIS_CITIES[place.city]?.lat ?? GIS_CITIES.bishkek.lat,
                  lng: place.lng ?? GIS_CITIES[place.city]?.lng ?? GIS_CITIES.bishkek.lng,
                }}
                pick={place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null}
                onPick={(lat, lng) => setPlace((cur) => ({ ...cur, lat, lng }))}
              />
            </div>
            <p className="mt-1 text-[12px] text-muted">{t.pointOnMap}</p>
            <div className="mt-4">
              <PlaceCascade
                place={place}
                onPlace={(next) => {
                  setError("");
                  setPlace({ city: next.city, district: next.district, lat: next.lat, lng: next.lng });
                }}
                landmark={landmark}
                onLandmark={setLandmark}
              />
            </div>
          </div>
        ) : null}

        {field === "item" ? (
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="block text-[14px] font-semibold text-ink">{t.fieldItemName}</span>
              <input
                data-testid="point-field-item-title"
                value={title}
                maxLength={80}
                autoFocus
                placeholder={kind === "cafe" ? t.fieldMenuExample : t.fieldServiceExample}
                onChange={(event) => setTitle(event.target.value)}
                className={`mt-2 ${bigInput}`}
              />
            </label>
            <label className="block">
              <span className="block text-[14px] font-semibold text-ink">{t.fieldItemPrice}</span>
              <input
                data-testid="point-field-item-price"
                value={price}
                inputMode="numeric"
                placeholder="0"
                onChange={(event) => setPrice(event.target.value.replace(/[^\d\s]/g, "").slice(0, 9))}
                className={`mt-2 ${bigInput}`}
              />
            </label>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-[14px] font-semibold text-accent">{error}</p> : null}

        <button
          type="submit"
          data-testid="point-field-save"
          disabled={busy || photoBusy}
          className="shadow-btn mt-6 h-[56px] w-full rounded-2xl bg-accent text-[17px] font-semibold text-accent-on disabled:opacity-60"
        >
          {t.pointSave}
        </button>
      </form>
      <button type="button" onClick={back} className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink">
        ← {t.pointPrev}
      </button>
      <button type="button" onClick={() => router.push(`/shops/${shopId}/edit`)} className="mt-4 w-full text-center text-[13px] font-semibold text-muted">
        {t.pointEditAll}
      </button>
    </div>
  );
}
