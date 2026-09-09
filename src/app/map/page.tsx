"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DISTRICTS, formatSom } from "@/lib/data";
import { districtLabel, gisCity, nearestCityId, nearestDistrict, twoGisUrl } from "@/lib/geo";
import { listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { IconLocate, IconSearch, IconSliders } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { ListingRow, Photo, useFiltered } from "@/components/ui";
import { ListingThumb, isVideoListing } from "@/components/listing-media";

const GisMap = dynamic(() => import("@/components/gis-map").then((m) => m.GisMap), { ssr: false });

export default function MapPage() {
  const { t, lang, user, setPendingPath, saveCurrentSearch, filters, setFilters, setCity, city } = useApp();
  const router = useRouter();
  const listings = useFiltered();
  const [mode, setMode] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState(listings[0]?.id);
  const current = listings.find((l) => l.id === selected) ?? listings[0];

  const cityId = filters.city !== "all" ? filters.city : city !== "all" ? city : "bishkek";
  const centerCity = gisCity(cityId);
  const pick =
    filters.locLat != null && filters.locLng != null
      ? { lat: filters.locLat, lng: filters.locLng }
      : null;

  const markers = useMemo(
    () =>
      listings
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => ({
          id: l.id,
          lat: l.lat!,
          lng: l.lng!,
          label: `${formatSom(l.price)} KGS`,
          active: l.id === selected,
        })),
    [listings, selected],
  );

  const districts = DISTRICTS.filter((d) => d.city === cityId);

  const applyPoint = (lat: number, lng: number, label?: string) => {
    const nextCity = nearestCityId(lat, lng);
    const area = nearestDistrict(lat, lng, nextCity);
    setCity(nextCity);
    setFilters({
      section: filters.section ?? "rent",
      locLat: lat,
      locLng: lng,
      locLabel: label ?? (area ? districtLabel(area, lang) : t.cities[nextCity]),
    });
  };

  return (
    <PhoneShell tab>
      <div className="relative min-h-0 flex-1">
        {mode === "map" ? (
          <div className="absolute inset-0">
            <GisMap
              center={pick ?? { lat: centerCity.lat, lng: centerCity.lng }}
              zoom={pick ? 14 : centerCity.zoom}
              markers={markers}
              pick={pick}
              onPick={(lat, lng) => applyPoint(lat, lng)}
              onMarkerClick={(id) => setSelected(id)}
            />
          </div>
        ) : null}

        <div className="relative z-10 flex gap-2 px-4 pt-1">
          <button
            type="button"
            onClick={() => router.push("/filters")}
            className="shadow-float flex h-12 flex-1 items-center gap-2.5 rounded-2xl bg-white px-4"
          >
            <IconSearch size={17} color="#A79C8C" />
            <span className="truncate text-[15px] text-ink">
              {filters.locLabel ?? `${t.cities[cityId]} · 2ГИС`}
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/filters")}
            className="shadow-float flex h-12 w-12 items-center justify-center rounded-2xl bg-white"
          >
            <IconSliders size={17} color="#17140F" />
          </button>
        </div>

        {mode === "list" ? (
          <div className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col px-4 pb-3">
            <div className="mb-3 flex justify-center">
              <div className="flex gap-1 rounded-full bg-white p-1 shadow-float">
                <button
                  type="button"
                  onClick={() => setMode("map")}
                  className="rounded-full px-4 py-2 text-[13px] font-semibold text-muted"
                >
                  {t.mapMode}
                </button>
                <button type="button" className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-screen">
                  {t.listMode}
                </button>
              </div>
            </div>
            <div className="sc flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto rounded-[18px] bg-screen/90 p-2">
              {listings.map((item) => (
                <ListingRow key={item.id} listing={item} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="relative z-10 mt-2.5 px-4">
              <div className="sc flex gap-2 overflow-x-auto pb-0.5">
                {districts.map((d) => {
                  const active = filters.locLabel === districtLabel(d, lang);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => applyPoint(d.lat, d.lng, districtLabel(d, lang))}
                      className="shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold"
                      style={{
                        background: active ? "#17140F" : "#FFFFFF",
                        color: active ? "#F7F3EC" : "#17140F",
                        border: active ? "none" : "1px solid #E4DCCE",
                      }}
                    >
                      {districtLabel(d, lang)}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition((pos) => {
                  applyPoint(pos.coords.latitude, pos.coords.longitude);
                });
              }}
              className="shadow-float absolute right-4 top-[58px] z-10 flex h-11 w-11 items-center justify-center rounded-[14px] bg-white"
              aria-label={t.pickOnMap}
            >
              <IconLocate size={18} color="#17140F" />
            </button>
            <div className="absolute bottom-[168px] left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white p-1 shadow-float">
              <button
                type="button"
                onClick={() => setMode("map")}
                className="rounded-full px-4 py-2 text-[13px] font-semibold"
                style={{ background: "#17140F", color: "#F7F3EC" }}
              >
                {t.mapMode}
              </button>
              <button
                type="button"
                onClick={() => setMode("list")}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-muted"
              >
                {t.listMode}
              </button>
            </div>
          </>
        )}

        {mode === "map" ? (
          <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-[26px] bg-screen px-5 pb-3 pt-2.5 shadow-[0_-10px_30px_rgba(23,20,15,.14)]">
            <span className="mx-auto mb-3 block h-1 w-11 rounded-full bg-toggle-off" />
            <p className="mb-2 text-[12px] text-muted">{t.mapPickHint}</p>
            {pick ? (
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push(filters.section ? `/section/${filters.section}` : "/")}
                  className="shadow-btn flex h-11 flex-1 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-accent-on"
                >
                  {t.searchHere}
                </button>
                <a
                  href={twoGisUrl(cityId, pick.lng, pick.lat)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center rounded-2xl border border-line bg-white px-3 text-sm font-semibold text-ink"
                >
                  {t.open2gis}
                </a>
              </div>
            ) : null}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[15px] font-bold text-ink">{t.mapListings(listings.length)}</span>
              {pick ? (
                <button
                  type="button"
                  onClick={() => setFilters({ locLat: null, locLng: null, locLabel: null })}
                  className="text-[13px] font-semibold text-accent"
                >
                  {t.clearLocation}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      setPendingPath("/map");
                      router.push("/login");
                      return;
                    }
                    saveCurrentSearch();
                    router.push("/favorites");
                  }}
                  className="text-[13px] font-semibold text-accent"
                >
                  {t.saveSearch}
                </button>
              )}
            </div>
            {current ? (
              <button
                type="button"
                onClick={() => router.push(`/listing/${current.id}`)}
                className="flex w-full items-center overflow-hidden rounded-[18px] border border-line bg-white text-left"
              >
                <div className={`shrink-0 p-2 ${isVideoListing(current) ? "w-[84px]" : "h-[88px] w-[88px] p-0"}`}>
                  {isVideoListing(current) ? (
                    <ListingThumb listing={current} alt="" compact />
                  ) : (
                    <div className="h-[88px] w-[88px] overflow-hidden rounded-[10px]">
                      <Photo src={current.photos[0]} alt="" />
                    </div>
                  )}
                </div>
                <div className="flex-1 px-3.5 py-2.5">
                  <div className="font-display text-[17px] font-bold text-ink">
                    {formatSom(current.price)}{" "}
                    {current.unit === "month" ? (
                      <span className="text-xs font-medium text-muted">{t.perMonthShort}</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-sm leading-[1.3] text-ink">{listingTitle(current, lang)}</div>
                  <div className="mt-1 text-xs text-muted-2">
                    {current.district ?? t.cities[current.city]}
                  </div>
                </div>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </PhoneShell>
  );
}
