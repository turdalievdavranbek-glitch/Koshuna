"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { stageOf } from "@/lib/listing-owner";
import { offerWhen } from "@/lib/meet";
import { listingEditHref } from "@/lib/listing-edit";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { DeleteCardDialog } from "./card-delete";
import { Chip } from "./ui";

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
        background: stage === "reserved" ? "#FDE8E8" : stage === "closed" ? "#E4EFE9" : "#F1F1F4",
      }}
    >
      <div
        className="text-[13px] font-bold leading-[1.4]"
        style={{ color: stage === "closed" ? "#245046" : stage === "reserved" ? "#B0141A" : "#61616B" }}
      >
        {text}
      </div>
    </div>
  );
}

export function OwnerListingTools({ listing }: { listing: Listing }) {
  const { t, updateListing, clearMeetDeal, deleteListing, editListingToDraft } = useApp();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const withdrawn = listing.status === "withdrawn";

  const markClosed = (kind: "sold" | "rented") => {
    setError("");
    setNote("");
    updateListing(listing.id, { status: "closed", closedKind: kind, reservedBy: undefined });
    clearMeetDeal(listing.id);
  };

  const withdraw = () => {
    setError("");
    setNote("");
    updateListing(listing.id, { status: "withdrawn", closedKind: undefined, reservedBy: undefined });
    clearMeetDeal(listing.id);
  };

  const restore = () => {
    setError("");
    setNote("");
    updateListing(listing.id, { status: "active", closedKind: undefined });
  };

  return (
    <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.ownerTools}</div>
      <button
        type="button"
        data-testid="listing-edit-full"
        onClick={() => {
          if (!listing.shopId) editListingToDraft(listing);
          router.push(listingEditHref(listing));
        }}
        className="mt-3 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
      >
        {t.edit}
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {listing.section === "rent" ? (
          <>
            <Chip active={listing.closedKind === "sold"} accent={listing.closedKind === "sold"} onClick={() => markClosed("sold")}>
              {t.closedSold}
            </Chip>
            <Chip active={listing.closedKind === "rented"} accent={listing.closedKind === "rented"} onClick={() => markClosed("rented")}>
              {t.closedRented}
            </Chip>
          </>
        ) : (
          <Chip active={listing.status === "closed" && listing.closedKind === "sold"} accent={listing.closedKind === "sold"} onClick={() => markClosed("sold")}>
            {t.closedSold}
          </Chip>
        )}
        {withdrawn ? (
          <Chip onClick={restore}>{t.ownerRestore}</Chip>
        ) : (
          <Chip onClick={withdraw}>{t.ownerWithdraw}</Chip>
        )}
      </div>
      {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
      {note ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{note}</p> : null}
      <button
        type="button"
        data-testid="listing-delete"
        onClick={() => setConfirmDelete(true)}
        className="mt-4 h-11 w-full text-[15px] font-semibold text-accent"
      >
        {t.cardDelete}
      </button>
      <DeleteCardDialog
        open={confirmDelete}
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setDeleting(true);
          void deleteListing(listing.id).then((result) => {
            setDeleting(false);
            if (result.error) {
              setError(t.cardDeleteError);
              setConfirmDelete(false);
              return;
            }
            router.push("/profile");
          });
        }}
      />
    </div>
  );
}
