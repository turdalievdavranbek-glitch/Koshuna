"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { meetupSpotsFor } from "@/lib/deal";
import { defaultBuyerOrigin, formatKm, lerp, MEET_TIMES, meetPoint, offerWhen, remainingToMeet } from "@/lib/meet";
import { haversineKm } from "@/lib/geo";
import { useApp } from "@/lib/store";
import type { Listing, MeetOffer, MeetupSpot } from "@/lib/types";
import { GisMap } from "./gis-map";
import { MeetDayCalendar } from "./meet-calendar";
import { Chip, Eyebrow } from "./ui";

const PHONE_LAYER = "konshu-phone";

function usePhoneLayer() {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setNode(document.getElementById(PHONE_LAYER));
  }, []);
  return node;
}

function Sheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const layer = usePhoneLayer();
  if (!layer) return null;
  return createPortal(
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-[rgba(23,20,15,.38)]">
      <button type="button" className="h-full w-full" aria-label="close" onClick={onClose} />
      <div className="max-h-[82%] overflow-y-auto rounded-t-[22px] bg-white px-4 pb-6 pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        {children}
      </div>
    </div>,
    layer,
  );
}

export function MeetDealBlock({ listing, mine }: { listing: Listing; mine: boolean }) {
  const {
    t,
    lang,
    meetDeals,
    ensureMeetDeal,
    setMeetViewAs,
    confirmMeetReserve,
    proposeMeet,
    acceptMeet,
    declineMeet,
    enableMeetGeo,
    patchMeetDeal,
    ensureThread,
    addMessage,
    user,
    setPendingPath,
  } = useApp();
  const router = useRouter();
  const reservedBy = listing.reservedBy;
  const deal = meetDeals[listing.id];
  const [sheet, setSheet] = useState<"when" | "where" | null>(null);
  const [date, setDate] = useState<string | null>(deal?.offer?.date ?? null);
  const [time, setTime] = useState<string | null>(deal?.offer?.time ?? null);
  const [spot, setSpot] = useState<MeetupSpot | null>(deal?.offer?.spot ?? listing.meetupSpot ?? null);
  const [error, setError] = useState("");
  const [geoNote, setGeoNote] = useState("");
  const geoReq = useRef(0);
  const spots = meetupSpotsFor(listing.city);
  const viewAs = mine ? (deal?.viewAs ?? "seller") : "buyer";
  const party = viewAs;

  useEffect(() => {
    if (listing.status === "reserved" && reservedBy) ensureMeetDeal(listing.id, reservedBy.id);
  }, [ensureMeetDeal, listing.id, listing.status, reservedBy]);

  useEffect(() => {
    if (!deal?.geoOn || deal.arrived || !deal.offer || deal.originLat == null || deal.originLng == null) return;
    const tick = window.setInterval(() => {
      patchMeetDeal(listing.id, (cur) => {
        if (!cur.geoOn || cur.arrived || !cur.offer || cur.originLat == null || cur.originLng == null) return cur;
        const destNow = meetPoint(listing, cur.offer.spot);
        const nextT = Math.min(1, cur.trackT + 0.035);
        return {
          ...cur,
          trackT: nextT,
          buyerLat: lerp(cur.originLat, destNow.lat, nextT),
          buyerLng: lerp(cur.originLng, destNow.lng, nextT),
          arrived: nextT >= 1,
        };
      });
    }, 1100);
    return () => window.clearInterval(tick);
  }, [deal?.arrived, deal?.geoOn, deal?.offer, deal?.originLat, deal?.originLng, listing.id, listing.lat, listing.lng, listing.city, patchMeetDeal]);

  if (listing.status !== "reserved" || !reservedBy) return null;
  if (!deal) return null;

  const needUser = () => {
    if (user) return true;
    setPendingPath(`/listing/${listing.id}`);
    router.push("/login");
    return false;
  };

  const note = (text: string) => {
    const tid = ensureThread(listing.id);
    addMessage(tid, text, "system");
  };

  const openSheet = () => {
    setDate(deal.offer?.date ?? null);
    setTime(deal.offer?.time ?? null);
    setSpot(deal.offer?.spot ?? listing.meetupSpot ?? null);
    setError("");
    setSheet("when");
  };

  const sendOffer = () => {
    if (!needUser()) return;
    if (!date) {
      setError(t.meetNeedDate);
      return;
    }
    if (!time) {
      setError(t.meetNeedTime);
      setSheet("when");
      return;
    }
    if (!spot) {
      setError(t.meetNeedPlace);
      return;
    }
    const offer: MeetOffer = { date, time, spot, from: party };
    proposeMeet(listing.id, offer);
    note(
      t.meetMsgOffer(
        party === "seller" ? t.meetRoleSeller : reservedBy.name,
        offerWhen(offer, lang),
        t.meetupSpots[spot],
      ),
    );
    setSheet(null);
    setError("");
  };

  const onConfirmReserve = () => {
    if (!needUser()) return;
    confirmMeetReserve(listing.id);
    note(t.meetMsgConfirm(reservedBy.name));
  };

  const onAccept = () => {
    if (!needUser() || !deal.offer) return;
    acceptMeet(listing.id);
    note(t.meetMsgAccept(offerWhen(deal.offer, lang), t.meetupSpots[deal.offer.spot]));
  };

  const onDecline = () => {
    if (!needUser()) return;
    declineMeet(listing.id);
    note(t.meetMsgDecline);
  };

  const onGeo = () => {
    if (!needUser()) return;
    const fallback = defaultBuyerOrigin(listing);
    const req = ++geoReq.current;
    const apply = (lat: number, lng: number, note: string) => {
      if (req !== geoReq.current) return;
      enableMeetGeo(listing.id, lat, lng);
      setGeoNote(note);
    };
    if (!navigator.geolocation) {
      apply(fallback.lat, fallback.lng, t.meetGeoDenied);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dest = deal.offer ? meetPoint(listing, deal.offer.spot) : fallback;
        const km = haversineKm(pos.coords.latitude, pos.coords.longitude, dest.lat, dest.lng);
        if (km > 60) {
          apply(fallback.lat, fallback.lng, t.meetGeoOn);
          return;
        }
        apply(pos.coords.latitude, pos.coords.longitude, t.meetGeoOn);
      },
      (err) =>
        apply(
          fallback.lat,
          fallback.lng,
          err.code === 1 ? t.meetGeoDenied : t.meetGeoOn,
        ),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const waitingFor = deal.phase === "wait-reply" && deal.offer ? (deal.offer.from === "seller" ? "buyer" : "seller") : null;
  const canReply = deal.phase === "wait-reply" && waitingFor === party;
  const sellerStarts = party === "seller" && (deal.phase === "wait-meet" || deal.phase === "declined");

  const pos =
    deal.buyerLat != null && deal.buyerLng != null
      ? { lat: deal.buyerLat, lng: deal.buyerLng }
      : deal.originLat != null && deal.originLng != null
        ? { lat: deal.originLat, lng: deal.originLng }
        : null;
  const travel =
    deal.phase === "agreed" && deal.offer && pos ? remainingToMeet(listing, deal.offer, pos.lat, pos.lng) : null;
  const dest = deal.offer ? meetPoint(listing, deal.offer.spot) : null;

  return (
    <div id="meet-deal" className="mt-4 rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.meetTitle}</div>
      {mine ? (
        <>
          <p className="mt-1.5 text-[12px] leading-[1.4] text-muted">{t.meetRole}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={viewAs === "seller"} accent={viewAs === "seller"} onClick={() => setMeetViewAs(listing.id, "seller")}>
              {t.meetRoleSeller}
            </Chip>
            <Chip active={viewAs === "buyer"} accent={viewAs === "buyer"} onClick={() => setMeetViewAs(listing.id, "buyer")}>
              {reservedBy.name}
            </Chip>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-ink">
            {viewAs === "seller" ? t.meetYouSeller : t.meetYouBuyer(reservedBy.name)}
          </p>
        </>
      ) : null}

      {deal.phase === "wait-buyer" ? (
        <p className="mt-3 text-[13px] leading-[1.45] text-muted">{t.meetWaitBuyer(reservedBy.name)}</p>
      ) : null}
      {deal.phase === "wait-meet" ? (
        <p className="mt-3 text-[13px] leading-[1.45] text-muted">{t.meetConfirmed}</p>
      ) : null}
      {deal.offer && deal.phase !== "wait-buyer" ? (
        <div
          className="mt-3 rounded-[14px] px-3.5 py-3"
          style={{ background: deal.phase === "agreed" ? "#E4EFE9" : deal.phase === "declined" ? "#EFE8DB" : "#F3E0D9" }}
        >
          <div
            className="text-[13px] font-bold leading-[1.4]"
            style={{ color: deal.phase === "agreed" ? "#245046" : deal.phase === "declined" ? "#6E6558" : "#8E3423" }}
          >
            {deal.phase === "agreed"
              ? t.meetAgreed(offerWhen(deal.offer, lang), t.meetupSpots[deal.offer.spot])
              : deal.phase === "declined"
                ? t.meetDeclined
                : deal.offer.from === "seller"
                  ? t.meetOfferFromSeller(offerWhen(deal.offer, lang), t.meetupSpots[deal.offer.spot])
                  : t.meetOfferFromBuyer(offerWhen(deal.offer, lang), t.meetupSpots[deal.offer.spot])}
          </div>
        </div>
      ) : null}
      {deal.phase === "wait-reply" && !canReply ? (
        <p className="mt-2 text-[13px] leading-[1.45] text-muted">{t.meetWaitReply}</p>
      ) : null}

      {party === "buyer" && deal.phase === "wait-buyer" ? (
        <button
          type="button"
          onClick={onConfirmReserve}
          className="shadow-btn mt-3.5 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
        >
          {t.meetConfirmCta}
        </button>
      ) : null}

      {sellerStarts ? (
        <button
          type="button"
          onClick={openSheet}
          className="shadow-btn mt-3.5 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
        >
          {t.meetProposeCta}
        </button>
      ) : null}

      {canReply ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="h-12 rounded-2xl bg-success text-[13px] font-semibold text-white"
          >
            {t.meetAccept}
          </button>
          <button
            type="button"
            onClick={openSheet}
            className="h-12 rounded-2xl border border-line bg-white text-[13px] font-semibold text-ink"
          >
            {t.meetCounter}
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="col-span-2 h-11 rounded-2xl text-[13px] font-semibold text-accent"
          >
            {t.meetDecline}
          </button>
        </div>
      ) : null}

      {deal.phase === "agreed" && deal.offer ? (
        <div className="mt-3">
          {travel ? (
            <p className="text-[13px] leading-[1.45] text-ink">
              {deal.arrived
                ? t.meetArrived
                : t.meetEta(formatKm(travel.km, lang), travel.driveMin, travel.walkMin)}
            </p>
          ) : (
            <p className="text-[13px] leading-[1.45] text-muted">{t.meetGeoAsk}</p>
          )}
          {party === "buyer" && !deal.geoOn ? (
            <button
              type="button"
              onClick={onGeo}
              className="shadow-btn mt-3 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
            >
              {t.meetGeoCta}
            </button>
          ) : null}
          {party === "buyer" && deal.geoOn && deal.arrived ? (
            <button type="button" onClick={onGeo} className="mt-2 text-[13px] font-semibold text-accent">
              {t.meetGeoCta}
            </button>
          ) : null}
          {geoNote ? <p className="mt-2 text-[12px] leading-[1.4] text-muted">{geoNote}</p> : null}
          {deal.geoOn && dest ? (
            <>
              <div className="mt-2 text-[12px] font-semibold text-ink">
                {deal.arrived ? t.meetArrived : t.meetTrackSeller}
              </div>
              <div className="mt-2 h-[180px] overflow-hidden rounded-[16px] border border-line">
                <GisMap
                  center={dest}
                  zoom={13}
                  interactive={false}
                  pick={pos}
                  markers={[
                    { id: "meet", lat: dest.lat, lng: dest.lng, label: t.meetupSpots[deal.offer.spot], active: true },
                  ]}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {sheet ? (
        <Sheet onClose={() => setSheet(null)}>
          <Eyebrow>{sheet === "when" ? t.meetSheetWhen : t.meetSheetWhere}</Eyebrow>
          <div className="mt-1 text-[12px] text-muted">{t.meetStep(sheet === "when" ? 1 : 2, 2)}</div>
          {sheet === "when" ? (
            <>
              <div className="mt-3">
                <MeetDayCalendar value={date} onChange={setDate} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {MEET_TIMES.map((id) => (
                  <Chip key={id} active={time === id} accent={time === id} onClick={() => setTime(id)}>
                    {id}
                  </Chip>
                ))}
              </div>
              {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
              <button
                type="button"
                onClick={() => {
                  if (!date) {
                    setError(t.meetNeedDate);
                    return;
                  }
                  if (!time) {
                    setError(t.meetNeedTime);
                    return;
                  }
                  setError("");
                  setSheet("where");
                }}
                className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
              >
                {t.meetNext}
              </button>
            </>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {spots.map((id) => (
                  <Chip key={id} active={spot === id} accent={spot === id} onClick={() => setSpot(id)}>
                    {t.meetupSpots[id]}
                  </Chip>
                ))}
              </div>
              {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
              <button
                type="button"
                onClick={sendOffer}
                className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
              >
                {party === "seller" ? t.meetSend : t.meetSendBack}
              </button>
            </>
          )}
        </Sheet>
      ) : null}
    </div>
  );
}
