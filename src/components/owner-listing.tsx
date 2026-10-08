"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatSom } from "@/lib/data";
import { stageOf } from "@/lib/listing-owner";
import { offerWhen } from "@/lib/meet";
import { parseDraftPrice } from "@/lib/market";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { DeleteCardDialog } from "./card-delete";
import { CategoryChips } from "./category-chips";
import { Chip, Field, Input } from "./ui";
import type { DraftListing } from "@/lib/types";

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

function listingAsDraft(listing: Listing): DraftListing {
  return {
    section: listing.section,
    kind: listing.section === "rent" || listing.section === "stays" ? "rent" : "goods",
    title: listing.title,
    city: listing.city,
    price: listing.price ? String(listing.price) : "",
    rooms: "",
    area: "",
    name: "",
    phone: "",
    description: listing.description || "",
    promote: listing.status === "promoted",
    category: listing.category,
    goodsKind: listing.goodsKind,
    animalGroup: listing.animalGroup,
    animalKind: listing.animalKind,
    carMake: listing.carMake,
    techBrand: listing.techBrand,
    categoryLocked: true,
  };
}

export function OwnerListingTools({ listing }: { listing: Listing }) {
  const { t, updateListing, clearMeetDeal, deleteListing } = useApp();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description || "");
  const [price, setPrice] = useState(listing.price ? String(listing.price) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const withdrawn = listing.status === "withdrawn";

  useEffect(() => {
    setTitle(listing.title);
    setDescription(listing.description || "");
    setPrice(listing.price ? String(listing.price) : "");
  }, [listing.id, listing.title, listing.description, listing.price]);

  const saveEdit = () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError(t.postNeedTitle);
      setNote("");
      return;
    }
    const next = parseDraftPrice(price);
    if (!next) {
      setError(t.priceNeed);
      setNote("");
      return;
    }
    setError("");
    const patch: Partial<Listing> = {
      title: nextTitle,
      titleKy: nextTitle,
      titleEn: nextTitle,
      description: description.trim(),
      descriptionKy: description.trim(),
      descriptionEn: description.trim(),
      price: next,
    };
    if (next < listing.price) patch.previousPrice = listing.price;
    if (next >= listing.price) patch.previousPrice = listing.previousPrice && listing.previousPrice > next ? listing.previousPrice : undefined;
    updateListing(listing.id, patch);
    setNote(t.priceSaved);
  };

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
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip active={editing} accent={editing} onClick={() => setEditing((value) => !value)}>
          {t.ownerEdit}
        </Chip>
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
      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
          <CategoryChips
            draft={listingAsDraft(listing)}
            personal={!listing.shopId}
            autoApply={false}
            onPatch={(patch) =>
              updateListing(listing.id, {
                section: patch.section ?? listing.section,
                category: patch.category,
                goodsKind: patch.goodsKind,
                animalGroup: patch.animalGroup,
                animalKind: patch.animalKind,
                carMake: patch.carMake,
                techBrand: patch.techBrand,
              })
            }
          />
          <Field label={t.editTitle}>
            <Input value={title} onChange={setTitle} />
          </Field>
          <Field label={t.description}>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-[14px] border border-line bg-white px-3.5 py-3 text-[15px] text-ink outline-none"
            />
          </Field>
          <Field label={t.priceEdit}>
            <div className="flex gap-2">
              <Input value={price} onChange={setPrice} placeholder={formatSom(listing.price)} />
              <button
                type="button"
                onClick={saveEdit}
                className="h-[50px] shrink-0 rounded-[14px] bg-ink px-3.5 text-[13px] font-semibold text-screen"
              >
                {t.priceSave}
              </button>
            </div>
          </Field>
        </div>
      ) : null}
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
