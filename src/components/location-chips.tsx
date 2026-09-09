"use client";

import { CITIES, DISTRICTS } from "@/lib/data";
import { districtLabel } from "@/lib/geo";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function LocationChips({ labeled }: { labeled?: boolean }) {
  const { t, lang, city, setCity, filters, setFilters } = useApp();
  const cityId = filters.city !== "all" ? filters.city : city;
  const districts =
    cityId === "all" ? [...DISTRICTS] : DISTRICTS.filter((d) => d.city === cityId);

  const pickCity = (id: string) => {
    const keep =
      id !== "all" && DISTRICTS.some((d) => d.city === id && districtLabel(d, lang) === filters.locLabel);
    setCity(id);
    if (!keep) setFilters({ locLat: null, locLng: null, locLabel: null });
  };

  const pickDistrict = (d: (typeof DISTRICTS)[number]) => {
    const label = districtLabel(d, lang);
    if (filters.locLabel === label) {
      setFilters({ locLat: null, locLng: null, locLabel: null });
      return;
    }
    setCity(d.city);
    setFilters({ locLat: d.lat, locLng: d.lng, locLabel: label });
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
      {districts.length ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Chip
            active={!filters.locLabel}
            onClick={() => setFilters({ locLat: null, locLng: null, locLabel: null })}
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
