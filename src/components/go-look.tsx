"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { goLookKind, meetupSpotsFor, payAfterMethods, VIEW_SLOTS } from "@/lib/deal";
import type { Listing, MeetupSpot, ViewSlot } from "@/lib/types";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "./ui";

export function GoLookCard({ listing }: { listing: Listing }) {
  const kind = goLookKind(listing);
  const { t, user, setPendingPath, ensureThread, addMessage } = useApp();
  const router = useRouter();
  const [slot, setSlot] = useState<ViewSlot | null>(null);
  const [spot, setSpot] = useState<MeetupSpot | null>(listing.meetupSpot ?? null);
  const [error, setError] = useState("");
  const spots = meetupSpotsFor(listing.city);

  if (kind === "none") return null;

  const send = () => {
    if (!slot) {
      setError(t.goLookNeedSlot);
      return;
    }
    if (kind === "meet" && !spot) {
      setError(t.goLookNeedSpot);
      return;
    }
    if (!user) {
      setPendingPath(`/listing/${listing.id}`);
      router.push("/login");
      return;
    }
    const tid = ensureThread(listing.id);
    addMessage(
      tid,
      t.goLookMsg(t.viewSlots[slot], kind === "meet" && spot ? t.meetupSpots[spot] : undefined),
    );
    router.push(`/chat/${tid}`);
  };

  return (
    <div id="go-look" className="mt-5 rounded-[18px] border border-line bg-white p-4">
      <Eyebrow>{kind === "meet" ? t.goMeet : t.goLook}</Eyebrow>
      <div className="mt-1 font-display text-[17px] font-bold leading-[1.25] text-ink">
        {kind === "meet" ? t.goMeetTitle : t.goLookTitle}
      </div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{kind === "meet" ? t.goMeetHint : t.goLookHint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {VIEW_SLOTS.map((id) => (
          <Chip key={id} active={slot === id} onClick={() => setSlot(id)}>
            {t.viewSlots[id]}
          </Chip>
        ))}
      </div>
      {kind === "meet" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {spots.map((id) => (
            <Chip key={id} active={spot === id} accent={spot === id} onClick={() => setSpot(id)}>
              {t.meetupSpots[id]}
            </Chip>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
      <button
        type="button"
        onClick={send}
        className="shadow-btn mt-3.5 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
      >
        {t.goLookSend}
      </button>
    </div>
  );
}

export function PayAfterNote({ listing }: { listing: Listing }) {
  const { t } = useApp();
  const methods = payAfterMethods(listing);
  if (!methods.length) return null;
  return (
    <div className="mt-3 rounded-[14px] bg-success-tint px-3.5 py-3">
      <div className="text-[13px] font-bold text-success-ink">{t.payAfterTitle}</div>
      <p className="mt-1 text-[12px] leading-[1.4] text-success-ink">{t.payAfterHint}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {methods.map((id) => (
          <span key={id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-success-ink">
            {t.payMethods[id]}
          </span>
        ))}
      </div>
    </div>
  );
}
