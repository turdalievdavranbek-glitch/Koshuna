import { GIS_CITIES } from "./data";
import { formatStayDay, parseKey } from "./dates";
import { haversineKm } from "./geo";
import type { Lang, Listing, MeetupSpot, MeetOffer } from "./types";

export const MEET_TIMES = ["10:00", "11:00", "12:00", "14:00", "16:00", "17:00", "18:00", "19:00"];

export const MEETUP_COORDS: Record<MeetupSpot, { lat: number; lng: number }> = {
  tsum: { lat: 42.8756, lng: 74.6182 },
  philharmonic: { lat: 42.8778, lng: 74.6035 },
  dordoi: { lat: 42.9345, lng: 74.6208 },
  "ala-too": { lat: 42.8764, lng: 74.6039 },
  globus: { lat: 42.8558, lng: 74.5862 },
  "osh-bazaar": { lat: 40.5298, lng: 72.7952 },
  navoi: { lat: 40.5312, lng: 72.8034 },
  market: { lat: 42.8746, lng: 74.5698 },
  home: { lat: 42.8726, lng: 74.5898 },
};

export function meetPoint(listing: Listing, spot: MeetupSpot): { lat: number; lng: number } {
  if (spot === "home" && listing.lat != null && listing.lng != null) {
    return { lat: listing.lat, lng: listing.lng };
  }
  const fallback = MEETUP_COORDS[spot];
  if (fallback) return fallback;
  return {
    lat: listing.lat ?? GIS_CITIES[listing.city]?.lat ?? GIS_CITIES.bishkek.lat,
    lng: listing.lng ?? GIS_CITIES[listing.city]?.lng ?? GIS_CITIES.bishkek.lng,
  };
}

export function defaultBuyerOrigin(listing: Listing): { lat: number; lng: number } {
  if (listing.city === "bishkek") return { lat: 42.825, lng: 74.575 };
  if (listing.city === "osh") return { lat: 40.54, lng: 72.81 };
  const city = GIS_CITIES[listing.city] ?? GIS_CITIES.bishkek;
  return { lat: city.lat - 0.03, lng: city.lng - 0.02 };
}

export function travelEta(km: number): { driveMin: number; walkMin: number } {
  return {
    driveMin: Math.max(4, Math.round((km / 22) * 60)),
    walkMin: Math.max(8, Math.round((km / 4.5) * 60)),
  };
}

export function formatKm(km: number, lang: Lang): string {
  const n = km < 10 ? km.toFixed(1) : String(Math.round(km));
  const local = lang === "en" ? n : n.replace(".", ",");
  return lang === "en" ? `${local} km` : `${local} км`;
}

export function offerWhen(offer: MeetOffer, lang: Lang): string {
  return `${formatStayDay(offer.date, lang)}, ${offer.time}`;
}

export function remainingToMeet(listing: Listing, offer: MeetOffer, lat: number, lng: number) {
  const dest = meetPoint(listing, offer.spot);
  const km = haversineKm(lat, lng, dest.lat, dest.lng);
  return { km, dest, ...travelEta(km) };
}

export function estimateTravel(listing: Listing, offer: MeetOffer) {
  const origin = defaultBuyerOrigin(listing);
  return remainingToMeet(listing, offer, origin.lat, origin.lng);
}

function icsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function meetEventTimes(offer: MeetOffer): { start: Date; end: Date } {
  const [h, m] = offer.time.split(":").map(Number);
  const start = parseKey(offer.date);
  start.setHours(h ?? 18, m ?? 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

export function meetIcs(input: { title: string; place: string; details: string; start: Date; end: Date }): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Koshuna//Meet//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:koshuna-meet-${Date.now()}@koshuna.kg`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(input.start)}`,
    `DTEND:${icsUtc(input.end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `LOCATION:${escapeIcs(input.place)}`,
    `DESCRIPTION:${escapeIcs(input.details)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalUrl(input: { title: string; place: string; details: string; start: Date; end: Date }): string {
  const dates = `${icsUtc(input.start)}/${icsUtc(input.end)}`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates,
    location: input.place,
    details: input.details,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function downloadMeetIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
