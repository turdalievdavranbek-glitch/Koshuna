"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";

const GisMap = dynamic(() => import("@/components/gis-map").then((m) => m.GisMap), { ssr: false });

type Track = {
  closed: boolean;
  courier: { lat: number; lng: number } | null;
  shop: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  eta: string;
};

export function OrderLiveMap({ orderId }: { orderId: string }) {
  const { t } = useApp();
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    let cancel = false;
    const pull = () => {
      void api<Track>(`/api/orders/${encodeURIComponent(orderId)}/location`).then((res) => {
        if (cancel) return;
        if (res.ok && res.data && !res.data.closed) setTrack(res.data);
        else setTrack(null);
      });
    };
    pull();
    const timer = window.setInterval(pull, 10_000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [orderId]);

  if (!track) return null;
  const markers = [
    track.shop ? { id: "shop", ...track.shop, label: t.deliveryTrackShop, color: "#18181B" } : null,
    track.dropoff ? { id: "drop", ...track.dropoff, label: t.deliveryTrackDrop, color: "#1D4ED8" } : null,
    track.courier ? { id: "courier", ...track.courier, label: t.deliveryTrackCourier, color: "#E31E24" } : null,
  ].filter((item): item is { id: string; lat: number; lng: number; label: string; color: string } => Boolean(item));
  const center = markers[markers.length - 1] ?? markers[0];

  return (
    <div className="mt-3">
      <p className="text-[14px] font-semibold text-ink">{t.deliveryEta(track.eta)}</p>
      {track.courier ? null : <p className="mt-1 text-[13px] text-muted">{t.deliveryTrackMissing}</p>}
      {center ? (
        <div className="mt-2 h-[220px] overflow-hidden rounded-[18px] border border-line [&_.leaflet-control-attribution]:max-w-[70%] [&_.leaflet-control-attribution]:truncate">
          <GisMap center={{ lat: center.lat, lng: center.lng }} zoom={14} markers={markers} interactive />
        </div>
      ) : null}
    </div>
  );
}
