"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CITIES } from "@/lib/data";
import { formatStayDay, formatStayRange } from "@/lib/dates";
import { searchPlaceholder } from "@/lib/i18n";
import { isSectionId, patchForSection } from "@/lib/section";
import { useApp } from "@/lib/store";
import { IconBack, IconSearch, IconSliders } from "@/components/icons";
import { SectionExtras } from "@/components/section-extras";
import { PhoneShell } from "@/components/shell";
import { Chip, ListingHero, ListingRow, useFiltered } from "@/components/ui";

export default function SectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, city, setCity, filters, setFilters, user, setPendingPath, toggleFav } = useApp();
  const listings = useFiltered();
  const featured = listings[0];
  const rest = listings.slice(1);

  useEffect(() => {
    if (id === "car-rental") {
      setFilters({ ...patchForSection("cars", filters), autoType: "rent" });
      router.replace("/section/cars");
      return;
    }
    if (!isSectionId(id)) return;
    setFilters(patchForSection(id, filters));
    // Sync from the URL once per section id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (id === "car-rental") {
    return (
      <PhoneShell tab>
        <div className="p-6" />
      </PhoneShell>
    );
  }

  if (!isSectionId(id)) {
    return (
      <PhoneShell tab>
        <div className="p-6">{t.empty}</div>
      </PhoneShell>
    );
  }

  const onFav = (listingId: string) => {
    const ok = toggleFav(listingId);
    if (!ok) {
      setPendingPath(`/section/${id}`);
      router.push("/login");
    }
  };

  return (
    <PhoneShell tab>
      <header className="shrink-0 bg-screen px-5 pb-3.5 pt-1.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
            aria-label={t.feed}
          >
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="font-display text-lg font-bold text-ink">{t.sectionNames[id]}</h1>
          <button type="button" onClick={() => router.push("/filters")} aria-label={t.filters}>
            <IconSliders size={17} color="#17140F" />
          </button>
        </div>
        <div className="mt-3 flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4">
          <IconSearch size={17} color="#A79C8C" />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={searchPlaceholder(id, t)}
            className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
          />
        </div>
      </header>

      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <div className="mt-1">
          <SectionExtras />
        </div>

        <div className="sc mt-3.5 flex gap-2 overflow-x-auto pb-0.5">
          {CITIES.map((cityId) => (
            <Chip key={cityId} active={city === cityId} onClick={() => setCity(cityId)}>
              {t.cities[cityId]}
            </Chip>
          ))}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-ink">{t.fresh}</h2>
          <span className="text-[13px] font-semibold text-muted">{t.nListings(listings.length)}</span>
        </div>
        <div className="sc mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
          <Chip onClick={() => router.push("/filters")}>
            {filters.sort === "new" ? t.newest : filters.sort === "price-asc" ? t.priceAsc : t.priceDesc}
            <span className="ml-1 text-[10px] text-muted-2">▾</span>
          </Chip>
          {id === "stays" && filters.checkIn ? (
            <Chip onClick={() => router.push("/filters")}>
              {filters.checkOut
                ? formatStayRange(filters.checkIn, filters.checkOut, lang)
                : formatStayDay(filters.checkIn, lang)}
            </Chip>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setFilters({
                query: "",
                category: null,
                goodsKind: "any",
                housingType: "any",
                priceMin: null,
                priceMax: null,
                rooms: [],
                bodyType: "any",
                gear: "any",
                photosOnly: false,
                verifiedOnly: false,
                noAgents: false,
                sort: "new",
                checkIn: null,
                checkOut: null,
                dealType: "any",
                stockType: "any",
                locLng: null,
                locLat: null,
                locLabel: null,
                autoType: "sale",
                section: id,
              });
            }}
            className="shrink-0 px-[13px] py-[7px] text-[13px] font-semibold text-accent"
          >
            {t.resetFilters}
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="mt-8 rounded-[18px] border border-line bg-surface p-6 text-center">
            <div className="text-[15px] font-semibold text-ink">{t.empty}</div>
            <p className="mt-2 text-[13px] text-muted">{t.emptyHint}</p>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  query: "",
                  category: null,
                  goodsKind: "any",
                  housingType: "any",
                  priceMin: null,
                  priceMax: null,
                  rooms: [],
                  bodyType: "any",
                  gear: "any",
                  photosOnly: false,
                  verifiedOnly: false,
                  noAgents: false,
                  sort: "new",
                  checkIn: null,
                  checkOut: null,
                  dealType: "any",
                  stockType: "any",
                  locLng: null,
                  locLat: null,
                  locLabel: null,
                  autoType: "sale",
                  section: id,
                });
              }}
              className="mt-4 text-[13px] font-semibold text-accent"
            >
              {t.resetFilters}
            </button>
          </div>
        ) : (
          <>
            {featured ? <ListingHero listing={featured} onFav={() => onFav(featured.id)} /> : null}
            <div className="mt-3 flex flex-col gap-3">
              {rest.map((item) => (
                <ListingRow key={item.id} listing={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </PhoneShell>
  );
}
