"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatSom } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { IconLocate, IconPlus, IconSearch, IconSliders } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { ListingRow, MapSketch, Photo, useFiltered } from "@/components/ui";

export default function MapPage() {
  const { t, lang, user, setPendingPath, saveCurrentSearch } = useApp();
  const router = useRouter();
  const listings = useFiltered();
  const [mode, setMode] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState(listings[0]?.id);
  const current = listings.find((l) => l.id === selected) ?? listings[0];

  return (
    <PhoneShell tab>
      <div className="relative min-h-0 flex-1">
        <MapSketch />
        <div className="relative z-10 flex gap-2 px-4 pt-1">
          <button
            type="button"
            onClick={() => router.push("/filters")}
            className="shadow-float flex h-12 flex-1 items-center gap-2.5 rounded-2xl bg-white px-4"
          >
            <IconSearch size={17} color="#A79C8C" />
            <span className="text-[15px] text-ink">
              {t.cities.bishkek} · {t.rent.toLowerCase()}
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
                <button type="button" onClick={() => setMode("map")} className="rounded-full px-4 py-2 text-[13px] font-semibold text-muted">
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
          <div className="relative z-10 h-[46%]">
            {listings.slice(0, 5).map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                className="absolute rounded-full px-3 py-[7px] text-[13px] font-bold shadow-[0_6px_14px_rgba(23,20,15,.18)]"
                style={{
                  left: `${18 + (i % 4) * 18}%`,
                  top: `${18 + i * 14}%`,
                  background: selected === item.id ? "#B8452F" : "#FFFFFF",
                  color: selected === item.id ? "#FFF7F0" : "#17140F",
                }}
              >
                {formatSom(item.price)}
              </button>
            ))}
            <span className="absolute right-[22%] top-[62%] flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-screen shadow-[0_6px_14px_rgba(23,20,15,.22)]">
              {listings.length}
            </span>
            <div className="absolute right-4 top-4 flex flex-col gap-2">
              <button type="button" className="shadow-float flex h-11 w-11 items-center justify-center rounded-[14px] bg-white">
                <IconPlus size={18} color="#17140F" />
              </button>
              <button type="button" className="shadow-float flex h-11 w-11 items-center justify-center rounded-[14px] bg-white">
                <IconLocate size={18} color="#17140F" />
              </button>
            </div>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white p-1 shadow-float">
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
          </div>
        )}

        {current && mode === "map" ? (
          <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-[26px] bg-screen px-5 pb-3 pt-2.5 shadow-[0_-10px_30px_rgba(23,20,15,.14)]">
            <span className="mx-auto mb-3.5 block h-1 w-11 rounded-full bg-toggle-off" />
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-bold text-ink">{t.mapListings(listings.length)}</span>
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
            </div>
            <button
              type="button"
              onClick={() => router.push(`/listing/${current.id}`)}
              className="flex w-full overflow-hidden rounded-[18px] border border-line bg-white text-left"
            >
              <div className="h-[104px] w-[104px] shrink-0">
                <Photo src={current.photos[0]} alt="" />
              </div>
              <div className="flex-1 px-3.5 py-3">
                <div className="font-display text-[19px] font-bold text-ink">
                  {formatSom(current.price)}{" "}
                  {current.unit === "month" ? <span className="text-xs font-medium text-muted">{t.perMonthShort}</span> : null}
                </div>
                <div className="mt-1 text-sm leading-[1.3] text-ink">{listingTitle(current, lang)}</div>
                <div className="mt-1.5 text-xs text-muted-2">
                  {current.rooms
                    ? `${current.rooms} ${t.roomWord} · ${current.area} м² · ${current.distance ?? t.cities[current.city]}`
                    : t.cities[current.city]}
                </div>
              </div>
            </button>
          </div>
        ) : null}
      </div>
    </PhoneShell>
  );
}
