"use client";

import { useEffect, useState } from "react";
import { RESERVE_ACCOUNTS, formatSom } from "@/lib/data";
import { DEAL_STAGES, stageOf, statusForStage } from "@/lib/listing-owner";
import { offerWhen } from "@/lib/meet";
import { parseDraftPrice } from "@/lib/market";
import { useApp } from "@/lib/store";
import type { DealStage, Listing, ReserveAccount } from "@/lib/types";
import { Chip, Eyebrow, Field, Input } from "./ui";

export function ListingStageBanner({ listing }: { listing: Listing }) {
  const { t, lang, meetDeals } = useApp();
  const stage = stageOf(listing);
  if (stage === "active") return null;
  const reserved = listing.reservedBy;
  const deal = meetDeals[listing.id];
  const text =
    stage === "reserved" && reserved && deal?.phase === "agreed" && deal.offer
      ? t.meetAgreed(offerWhen(deal.offer, lang), t.meetupSpots[deal.offer.spot])
      : stage === "reserved" && reserved && !deal?.buyerConfirmed
        ? t.reservedWaitBuyer(reserved.name, reserved.phone)
        : stage === "reserved" && reserved
          ? t.reservedBanner(reserved.name, reserved.phone)
          : stage === "reserved"
            ? t.status.reserved
            : stage === "closed"
              ? listing.closedKind === "sold"
                ? t.closedSold
                : listing.closedKind === "rented"
                  ? t.closedRented
                  : t.closedBanner
              : t.withdrawnBanner;
  return (
    <div
      className="mt-3 rounded-[16px] px-3.5 py-3"
      style={{
        background: stage === "reserved" ? "#F3E0D9" : stage === "closed" ? "#E4EFE9" : "#EFE8DB",
      }}
    >
      <div
        className="text-[13px] font-bold leading-[1.4]"
        style={{ color: stage === "closed" ? "#245046" : stage === "reserved" ? "#8E3423" : "#6E6558" }}
      >
        {text}
      </div>
    </div>
  );
}

export function OwnerListingTools({ listing }: { listing: Listing }) {
  const { t, updateListing, ensureMeetDeal, clearMeetDeal } = useApp();
  const [price, setPrice] = useState(String(listing.price));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const stage = stageOf(listing);

  useEffect(() => {
    setPrice(String(listing.price));
  }, [listing.price]);

  const savePrice = () => {
    const next = parseDraftPrice(price);
    if (!next) {
      setError(t.priceNeed);
      setNote("");
      return;
    }
    setError("");
    const patch: Partial<Listing> = { price: next };
    if (next < listing.price) patch.previousPrice = listing.price;
    if (next >= listing.price) patch.previousPrice = listing.previousPrice && listing.previousPrice > next ? listing.previousPrice : undefined;
    updateListing(listing.id, patch);
    setNote(t.priceSaved);
  };

  const setStage = (next: DealStage) => {
    if (next === "reserved" && !listing.reservedBy) {
      setError(t.stageNeedAccount);
      setNote("");
      return;
    }
    setError("");
    setNote("");
    const patch: Partial<Listing> = { status: statusForStage(listing, next) };
    if (next !== "reserved") {
      patch.reservedBy = undefined;
      clearMeetDeal(listing.id);
    } else if (listing.reservedBy) {
      ensureMeetDeal(listing.id, listing.reservedBy.id);
    }
    if (next !== "closed") patch.closedKind = undefined;
    updateListing(listing.id, patch);
  };

  const setClosedKind = (kind: "sold" | "rented") => {
    setError("");
    setNote("");
    updateListing(listing.id, { status: "closed", closedKind: kind, reservedBy: undefined });
    clearMeetDeal(listing.id);
  };

  const setAccount = (account: ReserveAccount) => {
    setError("");
    setNote("");
    updateListing(listing.id, { reservedBy: account, status: "reserved" });
    ensureMeetDeal(listing.id, account.id);
  };

  return (
    <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.ownerTools}</div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.stageHint}</p>
      <div className="mt-3">
        <Field label={t.priceEdit}>
          <div className="flex gap-2">
            <Input value={price} onChange={setPrice} placeholder={formatSom(listing.price)} />
            <button
              type="button"
              onClick={savePrice}
              className="h-[50px] shrink-0 rounded-[14px] bg-ink px-3.5 text-[13px] font-semibold text-screen"
            >
              {t.priceSave}
            </button>
          </div>
        </Field>
      </div>
      <div className="mt-4">
        <Eyebrow>{t.stageTitle}</Eyebrow>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEAL_STAGES.map((id) => (
            <Chip key={id} active={stage === id && !listing.closedKind} accent={stage === id && !listing.closedKind} onClick={() => setStage(id)}>
              {t.status[id]}
            </Chip>
          ))}
          {listing.section === "rent" ? (
            <>
              <Chip active={listing.closedKind === "sold"} accent={listing.closedKind === "sold"} onClick={() => setClosedKind("sold")}>
                {t.closedSold}
              </Chip>
              <Chip active={listing.closedKind === "rented"} accent={listing.closedKind === "rented"} onClick={() => setClosedKind("rented")}>
                {t.closedRented}
              </Chip>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <Eyebrow>{t.stageReservedBy}</Eyebrow>
        <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.stageReservedHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RESERVE_ACCOUNTS.map((account) => (
            <Chip
              key={account.id}
              active={listing.reservedBy?.id === account.id}
              accent={listing.reservedBy?.id === account.id}
              onClick={() => setAccount(account)}
            >
              {account.name}
            </Chip>
          ))}
        </div>
        {listing.reservedBy ? (
          <p className="mt-2 text-[13px] leading-[1.45] text-ink">
            {listing.reservedBy.name} · {listing.reservedBy.phone}
          </p>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
      {note ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{note}</p> : null}
    </div>
  );
}
