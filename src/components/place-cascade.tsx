"use client";

import { useEffect, useState } from "react";
import {
  pointAreaForFix,
  pointAreaLabel,
  pointAreasOf,
  pointOblasts,
  pointPlaceForArea,
  pointPlaceSuggestions,
  resolvePointPlace,
  type PointPlace,
} from "@/lib/point-place";
import { locate, type LocateError } from "@/lib/locate";
import { useApp } from "@/lib/store";
import { GeoError } from "./geo-error";
import { Chip } from "./ui";

const bigInput =
  "h-[56px] w-full rounded-[16px] border border-line bg-surface px-4 text-[17px] text-ink outline-none placeholder:text-muted-2 focus:border-accent";

/**
 * Address as a clear cascade: 1) Область, 2) Город / район of that oblast, 3) Село / улица (free text + known villages).
 * Reads and writes the same shop fields as before (city, district, lat, lng) so stored points stay compatible.
 */
export function PlaceCascade({
  place,
  onPlace,
  landmark,
  onLandmark,
}: {
  place: PointPlace;
  onPlace: (next: PointPlace) => void;
  landmark: string;
  onLandmark: (text: string) => void;
}) {
  const { t, lang } = useApp();
  const resolved = resolvePointPlace(place);
  const [oblast, setOblast] = useState<string | undefined>(resolved.oblast);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<LocateError | null>(null);

  // A stored or geolocated place can arrive after mount (draft restore): follow it once it resolves.
  useEffect(() => {
    if (resolved.oblast && resolved.oblast !== oblast && resolved.area) setOblast(resolved.oblast);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.oblast, resolved.area?.id]);

  const area = resolved.area && resolved.area.oblast === oblast ? resolved.area : undefined;
  const areas = oblast ? pointAreasOf(oblast) : [];
  const hints = oblast ? pointPlaceSuggestions(oblast, area, lang) : [];

  const pickOblast = (id: string) => {
    setOblast(id);
    if (resolved.area?.oblast === id) return;
    // A one-city oblast (Бишкек) is already a full answer; otherwise wait for step 2.
    const only = pointAreasOf(id);
    if (id === "bishkek" && only[0]) onPlace(pointPlaceForArea(only[0]));
    else onPlace({ city: "all", district: undefined, lat: undefined, lng: undefined });
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
    const hit = pointAreaForFix(fix.lat, fix.lng);
    if (!hit) {
      setGeoError("outside");
      return;
    }
    setOblast(hit.oblast);
    onPlace({ ...pointPlaceForArea(hit), lat: fix.lat, lng: fix.lng });
  };

  const addHint = (label: string, lat: number, lng: number) => {
    const parts = landmark
      .split("·")
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.includes(label)) onLandmark([label, ...parts].slice(0, 3).join(" · "));
    onPlace({ ...place, lat, lng });
  };

  return (
    <div data-testid="place-cascade">
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

      <div className="mt-4 text-[14px] font-semibold text-ink">1. {t.placeOblast}</div>
      <div data-testid="place-oblasts" className="mt-2 flex flex-wrap gap-2">
        {pointOblasts().map((id) => (
          <Chip key={id} testId={`place-oblast-${id}`} active={oblast === id} onClick={() => pickOblast(id)}>
            {t.oblasts[id] ?? id}
          </Chip>
        ))}
      </div>

      {oblast ? (
        <>
          <div className="mt-4 text-[14px] font-semibold text-ink">2. {t.placeArea}</div>
          <div data-testid="place-areas" className="mt-2 flex flex-wrap gap-2">
            {areas.map((row) => (
              <Chip key={row.id} testId={`place-area-${row.id}`} active={area?.id === row.id} onClick={() => onPlace(pointPlaceForArea(row))}>
                {pointAreaLabel(row, lang)}
              </Chip>
            ))}
          </div>
        </>
      ) : null}

      {area ? (
        <label className="mt-4 block">
          <span className="block text-[14px] font-semibold text-ink">3. {t.placeStreet}</span>
          <input
            data-testid="point-landmark"
            value={landmark}
            maxLength={120}
            enterKeyHint="next"
            placeholder={t.pointQuickStreetHint}
            onChange={(event) => onLandmark(event.target.value)}
            className={`mt-2 ${bigInput}`}
          />
          {hints.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {hints.map((hint) => (
                <Chip key={hint.id} size="sm" onClick={() => addHint(hint.label, hint.lat, hint.lng)}>
                  {hint.label}
                </Chip>
              ))}
            </div>
          ) : null}
        </label>
      ) : null}
    </div>
  );
}
