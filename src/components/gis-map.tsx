"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_TILE_2GIS, MAP_TILE_OSM, mapTileConfig } from "@/lib/geo";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}

export type GisMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  active?: boolean;
};

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: GisMarker[];
  pick?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
  interactive?: boolean;
};

export function GisMap({
  center,
  zoom = 13,
  markers = [],
  pick,
  onPick,
  onMarkerClick,
  interactive = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  const onMarkerRef = useRef(onMarkerClick);
  onPickRef.current = onPick;
  onMarkerRef.current = onMarkerClick;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      attributionControl: true,
    });
    const tiles = mapTileConfig();
    L.tileLayer(tiles.url, {
      ...(tiles.subdomains ? { subdomains: tiles.subdomains } : {}),
      attribution: escapeHtml(tiles.attribution),
      maxZoom: tiles.maxZoom,
    }).addTo(map);
    map.attributionControl?.setPrefix(false);
    if (interactive) {
      map.zoomControl.setPosition("bottomright");
    }
    layersRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      onPickRef.current?.(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 80);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const group = layersRef.current;
    if (!group) return;
    group.clearLayers();
    markers.forEach((m) => {
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: m.active ? 10 : 7,
        color: "#FFFFFF",
        fillColor: m.active ? "#B8452F" : "#17140F",
        fillOpacity: 1,
        weight: 2,
      });
      if (m.label) marker.bindTooltip(m.label, { direction: "top", opacity: 0.95 });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onMarkerRef.current?.(m.id);
      });
      marker.addTo(group);
    });
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pickRef.current?.remove();
    pickRef.current = null;
    if (!pick) return;
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#B8452F;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 4px 10px rgba(23,20,15,.28)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 18],
    });
    pickRef.current = L.marker([pick.lat, pick.lng], { icon, interactive: false }).addTo(map);
  }, [pick]);

  return (
    <div
      ref={ref}
      data-tile-2gis={MAP_TILE_2GIS}
      data-tile-osm={MAP_TILE_OSM}
      className={`relative isolate h-full w-full${interactive ? "" : " pointer-events-none"}`}
    />
  );
}
