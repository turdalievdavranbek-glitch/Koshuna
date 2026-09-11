"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { settlementLabel } from "@/lib/data";
import { districtLabel } from "@/lib/geo";
import {
  OBLASTS,
  applyPlace,
  citiesOfOblast,
  districtsOfOblast,
  isOblastId,
  placeCity,
  placeDistrict,
  placeFromGeo,
  placeOblast,
  placeSettlement,
  clearPlace,
  searchPlaces,
  settlementsOfOblast,
  type PlacePatch,
} from "@/lib/places";
import { useApp } from "@/lib/store";
import { IconBack, IconLocate, IconSearch } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { locationPickerBack } from "@/components/location-line";

function Rows({
  title,
  rows,
}: {
  title?: string;
  rows: { id: string; label: string; hint?: string; onClick: () => void }[];
}) {
  if (!rows.length) return null;
  return (
    <div>
      {title ? <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{title}</div> : null}
      <div className={`${title ? "mt-3" : ""} overflow-hidden rounded-[18px] border border-line bg-white`}>
        {rows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={row.onClick}
            className={`flex min-h-[54px] w-full items-center justify-between px-4 py-2.5 text-left ${
              i < rows.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <span>
              <span className="block text-[15px] font-semibold text-ink">{row.label}</span>
              {row.hint ? <span className="mt-0.5 block text-[12px] text-muted">{row.hint}</span> : null}
            </span>
            <span className="text-[18px] text-muted-2">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LocationPage() {
  const { place } = useParams<{ place?: string | string[] }>();
  const oblast = Array.isArray(place) ? place[0] : place;
  const router = useRouter();
  const { t, lang, setCity, setFilters } = useApp();
  const [query, setQuery] = useState("");
  const [geo, setGeo] = useState<"idle" | "busy" | "fail">("idle");

  const pick = (next: PlacePatch) => {
    applyPlace(setCity, setFilters, next);
    router.replace(locationPickerBack());
  };

  const hits = useMemo(
    () => (query.trim() ? searchPlaces(query, lang, t.cities, t.oblasts) : []),
    [query, lang, t.cities, t.oblasts],
  );

  const locate = () => {
    if (!navigator.geolocation) {
      setGeo("fail");
      return;
    }
    setGeo("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pick(placeFromGeo(pos.coords.latitude, pos.coords.longitude, lang));
      },
      () => setGeo("fail"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  };

  const drill = oblast && isOblastId(oblast) ? oblast : null;
  const cities = drill ? citiesOfOblast(drill) : [];
  const districts = drill ? districtsOfOblast(drill) : [];
  const settlements = drill ? settlementsOfOblast(drill) : [];

  return (
    <PhoneShell>
      <div className="flex items-center justify-between px-5 pb-2 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        <h1 className="font-display text-[17px] font-bold text-ink">{t.location}</h1>
        <span className="w-9" />
      </div>

      <div className="px-5">
        <div className="flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4">
          <IconSearch size={17} color="#A79C8C" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.locationSearch}
            className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
          />
        </div>
      </div>

      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {!drill && !query.trim() ? (
          <button
            type="button"
            onClick={locate}
            disabled={geo === "busy"}
            className="mb-4 flex w-full items-center gap-3 rounded-[18px] border border-line bg-white px-4 py-3.5 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-tint">
              <IconLocate size={18} color="#B8452F" />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-ink">{t.locationGeo}</span>
              <span className="mt-0.5 block text-[12px] text-muted">
                {geo === "busy" ? t.locationGeoBusy : geo === "fail" ? t.locationGeoFail : t.locationGeoHint}
              </span>
            </span>
            <span className="text-[18px] text-muted-2">›</span>
          </button>
        ) : null}

        {query.trim() ? (
          <Rows
            title={t.locationPickList}
            rows={
              hits.length
                ? hits.map((hit) => ({
                    id: hit.id,
                    label: hit.label,
                    hint: t.locationKinds[hit.kind],
                    onClick: () => {
                      if (hit.href) router.push(hit.href);
                      else pick(hit.place);
                    },
                  }))
                : []
            }
          />
        ) : drill ? (
          <div className="flex flex-col gap-4">
            <Rows
              rows={[
                {
                  id: "all-oblast",
                  label: t.oblasts[drill],
                  hint: t.locationAllHere,
                  onClick: () => pick(placeOblast(drill)),
                },
              ]}
            />
            <Rows
              title={t.city}
              rows={cities.map((id) => ({
                id,
                label: t.cities[id],
                onClick: () => pick(placeCity(id)),
              }))}
            />
            <Rows
              title={t.locationDistricts}
              rows={districts.map((d) => ({
                id: d.id,
                label: districtLabel(d, lang),
                onClick: () => pick(placeDistrict(d, lang)),
              }))}
            />
            <Rows
              title={t.aiyl}
              rows={settlements.map((s) => ({
                id: s.id,
                label: settlementLabel(s, lang),
                onClick: () => pick(placeSettlement(s, lang)),
              }))}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Rows
              rows={[
                {
                  id: "kg",
                  label: t.country,
                  hint: t.locationAllCountry,
                  onClick: () => pick(clearPlace()),
                },
              ]}
            />
            <Rows
              title={t.region}
              rows={OBLASTS.map((id) => ({
                id,
                label: t.oblasts[id],
                onClick: () => router.push(`/location/${id}`),
              }))}
            />
            <button
              type="button"
              onClick={() => router.push("/map")}
              className="flex w-full items-center justify-between rounded-[18px] border border-line bg-white px-4 py-3.5 text-left"
            >
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-accent-dark">2ГИС</span>
                <span className="mt-0.5 block text-[15px] font-semibold text-ink">{t.pickOnMap}</span>
              </span>
              <span className="text-[18px] text-muted-2">›</span>
            </button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
