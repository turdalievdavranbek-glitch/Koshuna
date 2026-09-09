"use client";

import { CITIES, DISTRICTS, settlementsForCity, settlementLabel } from "@/lib/data";
import { districtLabel } from "@/lib/geo";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function LocationChips({ labeled }: { labeled?: boolean }) {
  const { t, lang, city, setCity, filters, setFilters } = useApp();
  const cityId = filters.city !== "all" ? filters.city : city;
  const districts =
    cityId === "all" ? [...DISTRICTS] : DISTRICTS.filter((d) => d.city === cityId);
  const settlements = settlementsForCity(cityId);

  const pickCity = (id: string) => {
    const keep =
      id !== "all" && DISTRICTS.some((d) => d.city === id && districtLabel(d, lang) === filters.locLabel);
    setCity(id);
    setFilters({
      settlement: "any",
      aiylOnly: false,
      locLat: keep ? filters.locLat : null,
      locLng: keep ? filters.locLng : null,
      locLabel: keep ? filters.locLabel : null,
    });
  };

  const pickDistrict = (d: (typeof DISTRICTS)[number]) => {
    const label = districtLabel(d, lang);
    if (filters.locLabel === label) {
      setFilters({ locLat: null, locLng: null, locLabel: null, settlement: "any" });
      return;
    }
    setCity(d.city);
    setFilters({
      locLat: d.lat,
      locLng: d.lng,
      locLabel: label,
      settlement: "any",
      aiylOnly: false,
    });
  };

  const pickSettlement = (s: ReturnType<typeof settlementsForCity>[number]) => {
    const label = settlementLabel(s, lang);
    if (filters.settlement === s.id) {
      setFilters({ settlement: "any", aiylOnly: false, locLat: null, locLng: null, locLabel: null });
      return;
    }
    setCity(s.city);
    setFilters({
      settlement: s.id,
      aiylOnly: false,
      locLat: s.lat,
      locLng: s.lng,
      locLabel: label,
    });
  };

  const body = (
    <>
      <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
        {CITIES.map((id) => (
          <Chip key={id} active={city === id} onClick={() => pickCity(id)}>
            {t.cities[id]}
          </Chip>
        ))}
      </div>
      {settlements.length ? (
        <div className="mt-2.5">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{t.aiyl}</div>
          <div className="flex flex-wrap gap-2">
            <Chip
              active={filters.aiylOnly && filters.settlement === "any"}
              onClick={() =>
                setFilters({
                  aiylOnly: !(filters.aiylOnly && filters.settlement === "any"),
                  settlement: "any",
                  locLat: null,
                  locLng: null,
                  locLabel: null,
                })
              }
            >
              {t.bridgeAiyl}
            </Chip>
            {settlements.map((s) => (
              <Chip key={s.id} active={filters.settlement === s.id} onClick={() => pickSettlement(s)}>
                {settlementLabel(s, lang)}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
      {districts.length ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Chip
            active={!filters.locLabel && filters.settlement === "any"}
            onClick={() => setFilters({ locLat: null, locLng: null, locLabel: null, settlement: "any" })}
          >
            {t.any}
          </Chip>
          {districts.map((d) => (
            <Chip
              key={d.id}
              active={filters.locLabel === districtLabel(d, lang)}
              onClick={() => pickDistrict(d)}
            >
              {districtLabel(d, lang)}
            </Chip>
          ))}
        </div>
      ) : null}
    </>
  );

  if (labeled) {
    return (
      <div>
        <Eyebrow>{t.location}</Eyebrow>
        {body}
      </div>
    );
  }

  return body;
}
