"use client";

import type { DraftListing } from "@/lib/types";
import { useApp } from "@/lib/store";
import { PlaceCascade } from "./place-cascade";

/**
 * «Ввести адрес вручную» next to the geolocation button: Область → Город / район (shared region data)
 * + street / ориентир. Writes the same draft fields as geolocation (city, district, lat/lng of the area),
 * so region filters match and «Рядом» falls back to the district.
 */
export function ManualAddress({
  draft,
  onPatch,
  open,
  onOpen,
}: {
  draft: Pick<DraftListing, "city" | "district" | "lat" | "lng" | "address">;
  onPatch: (patch: Partial<DraftListing>) => void;
  open: boolean;
  onOpen: (open: boolean) => void;
}) {
  const { t } = useApp();
  return (
    <div className="mt-2">
      <button
        type="button"
        data-testid="manual-address"
        onClick={() => onOpen(!open)}
        className="h-11 w-full rounded-[14px] border border-line bg-white text-[13px] font-semibold text-ink"
      >
        ✎ {t.manualAddress}
      </button>
      {open ? (
        <div className="mt-3 rounded-[14px] border border-line bg-white p-3">
          <PlaceCascade
            hideGeo
            place={{ city: draft.city, district: draft.district, lat: draft.lat, lng: draft.lng }}
            onPlace={(next) => onPatch({ city: next.city, district: next.district, lat: next.lat, lng: next.lng })}
            landmark={draft.address ?? ""}
            onLandmark={(text) => onPatch({ address: text })}
          />
        </div>
      ) : null}
    </div>
  );
}
