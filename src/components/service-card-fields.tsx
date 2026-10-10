"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CategoryChips } from "@/components/category-chips";
import { GeoError } from "@/components/geo-error";
import { HoursPicker } from "@/components/hours-picker";
import { Chip, Field, Input } from "@/components/ui";
import { CITIES, DISTRICTS, GIS_CITIES } from "@/lib/data";
import { districtLabel, gisCity, nearestDistrict, spotForFix } from "@/lib/geo";
import { locate, type LocateError } from "@/lib/locate";
import { useApp } from "@/lib/store";
import type { DraftListing } from "@/lib/types";

const GisMap = dynamic(() => import("@/components/gis-map").then((m) => m.GisMap), { ssr: false });

export function ServiceCardFields({
  draft,
  onPatch,
}: {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
}) {
  const { t, lang, user } = useApp();
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<LocateError | null>(null);
  const place = draft.serviceMode === "place";
  const mobile = draft.serviceMode === "mobile";
  const districts = DISTRICTS.filter((d) => d.city === draft.city);
  const needIdentity = !user?.name?.trim() || !user?.phone?.trim();
  const areaOn = draft.serviceArea === "district" || draft.serviceArea === "city";

  const locateDraft = () => {
    if (geoBusy) return;
    setGeoBusy(true);
    setGeoError(null);
    void locate().then((res) => {
      setGeoBusy(false);
      if (!res.ok) {
        setGeoError(res.error);
        return;
      }
      const spot = spotForFix(res.lat, res.lng);
      onPatch({ lat: res.lat, lng: res.lng, ...(spot.city ? { city: spot.city } : {}), district: spot.district?.name });
    });
  };

  return (
    <>
      <Field label={t.serviceWork}>
        <Input
          value={draft.title}
          onChange={(v) => onPatch({ title: v })}
          placeholder={t.serviceWorkPh}
          testId="service-work"
        />
      </Field>
      <CategoryChips draft={draft} onPatch={onPatch} section="services" personal />
      {place ? (
        <>
          <Field label={t.venueAddress}>
            <Input value={draft.address ?? ""} onChange={(v) => onPatch({ address: v })} placeholder={t.venueAddress} />
          </Field>
          <Field label={t.city}>
            <select
              value={draft.city}
              onChange={(e) => {
                const city = e.target.value;
                const gis = GIS_CITIES[city] ?? gisCity(city);
                onPatch({ city, lat: gis.lat, lng: gis.lng, district: undefined });
              }}
              className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px]"
            >
              {CITIES.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>
                  {t.cities[c]}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            disabled={geoBusy}
            onClick={locateDraft}
            className="h-11 rounded-[14px] border border-line bg-white text-[13px] font-semibold disabled:opacity-60"
          >
            {geoBusy ? t.locationGeoBusy : t.locationGeo}
          </button>
          {geoError ? <GeoError compact error={geoError} onRetry={locateDraft} /> : null}
          <Field label={t.mapPoint}>
            <p className="mb-2 text-[12px] leading-[1.4] text-muted">{t.mapPointHint}</p>
            <div className="relative isolate z-0 h-52 overflow-hidden rounded-[14px] border border-line">
              <GisMap
                center={{
                  lat: draft.lat ?? gisCity(draft.city).lat,
                  lng: draft.lng ?? gisCity(draft.city).lng,
                }}
                zoom={draft.lat != null ? 15 : gisCity(draft.city).zoom}
                pick={
                  draft.lat != null && draft.lng != null
                    ? { lat: draft.lat, lng: draft.lng }
                    : { lat: gisCity(draft.city).lat, lng: gisCity(draft.city).lng }
                }
                onPick={(lat, lng) => {
                  const area = nearestDistrict(lat, lng, draft.city);
                  onPatch({ lat, lng, district: area?.name });
                }}
              />
            </div>
          </Field>
        </>
      ) : null}
      {mobile ? (
        <>
          <Field label={t.city}>
            <select
              data-testid="service-city"
              value={draft.city}
              onChange={(e) => {
                const city = e.target.value;
                onPatch({
                  city,
                  district: undefined,
                  lat: undefined,
                  lng: undefined,
                  address: "",
                  serviceArea: draft.serviceArea === "district" ? "city" : draft.serviceArea,
                });
              }}
              className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px]"
            >
              {CITIES.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>
                  {t.cities[c]}
                </option>
              ))}
            </select>
          </Field>
          {districts.length ? (
            <div data-testid="service-districts" className="flex flex-wrap gap-2">
              {districts.map((d) => (
                <Chip
                  key={d.id}
                  active={draft.district === d.name}
                  onClick={() => onPatch({ district: draft.district === d.name ? undefined : d.name })}
                >
                  {districtLabel(d, lang)}
                </Chip>
              ))}
            </div>
          ) : null}
          <label className="flex items-start gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
            <input
              data-testid="service-area"
              type="checkbox"
              checked={areaOn}
              onChange={(e) => {
                if (!e.target.checked) {
                  onPatch({ serviceArea: undefined });
                  return;
                }
                onPatch({ serviceArea: draft.district ? "district" : "city" });
              }}
              className="mt-1"
            />
            <span className="text-[14px] font-semibold leading-[1.4] text-ink">{t.serviceAreaCheck}</span>
          </label>
          {areaOn ? (
            <div className="flex flex-wrap gap-2">
              <Chip
                testId="service-area-district"
                active={draft.serviceArea === "district"}
                onClick={() => onPatch({ serviceArea: "district" })}
              >
                {t.serviceAreaDistrict}
              </Chip>
              <Chip testId="service-area-city" active={draft.serviceArea === "city"} onClick={() => onPatch({ serviceArea: "city" })}>
                {t.serviceAreaCity}
              </Chip>
            </div>
          ) : null}
        </>
      ) : null}
      {draft.serviceMode ? (
        <HoursPicker
          hours={draft.hours}
          title={mobile ? t.serviceHoursOrders : undefined}
          onChange={(hours) => onPatch({ hours })}
        />
      ) : null}
      <Field label={t.servicePrice}>
        <Input
          value={draft.price}
          onChange={(v) => onPatch({ price: v, priceNegotiable: false })}
          placeholder="300"
          testId="service-price"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Chip
          testId="price-from"
          active={draft.priceFrom === true}
          accent={draft.priceFrom === true}
          onClick={() => onPatch({ priceFrom: draft.priceFrom !== true })}
        >
          {t.priceFromChip}
        </Chip>
        <Chip testId="unit-service" active={draft.saleUnit !== "hour"} onClick={() => onPatch({ saleUnit: "service" })}>
          {t.unitService}
        </Chip>
        <Chip testId="unit-hour" active={draft.saleUnit === "hour"} onClick={() => onPatch({ saleUnit: "hour" })}>
          {t.unitHour}
        </Chip>
      </div>
      {needIdentity ? (
        <div className="flex flex-col gap-3">
          <Field label={t.nameField}>
            <Input value={draft.name || user?.name || ""} onChange={(v) => onPatch({ name: v.slice(0, 40) })} testId="post-name" />
          </Field>
          <Field label={t.phoneCallField}>
            <Input value={draft.phone} onChange={(v) => onPatch({ phone: v })} placeholder="+996 " testId="post-phone" />
          </Field>
          <p className="text-[12px] leading-[1.45] text-muted">{t.phoneNoSms}</p>
        </div>
      ) : (
        <p className="text-[13px] text-muted">
          {t.callersSee} {user?.name}
          {user?.phone ? ` · ${user.phone}` : ""}
        </p>
      )}
    </>
  );
}
