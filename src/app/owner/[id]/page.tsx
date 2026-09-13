"use client";

import { useParams, useRouter } from "next/navigation";
import { ownerById } from "@/lib/data";
import { useApp } from "@/lib/store";
import { IconBack, IconVerified } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { ListingRow, RoundBtn } from "@/components/ui";

export default function OwnerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, allListings } = useApp();
  const owner = ownerById(id);
  const listings = allListings.filter((l) => l.ownerId === id && l.status !== "draft");

  if (!owner) {
    return (
      <PhoneShell>
        <div className="p-6">{t.empty}</div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="px-5 pt-1">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <div className="mt-5 flex items-center gap-3.5">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full font-display text-[26px] font-bold text-screen"
            style={{ background: owner.color === "ink" ? "#17140F" : "#8E3423" }}
          >
            {owner.initial}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[22px] font-bold text-ink">{owner.name}</span>
              {owner.verified ? <IconVerified size={17} /> : null}
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {t.onKoshuna} {owner.since}
              {owner.rating ? ` · ${t.rating} ${owner.rating}` : ""}
            </div>
          </div>
        </div>
        <h2 className="mt-6 font-display text-[19px] font-bold text-ink">{t.ownerPublic}</h2>
      </div>
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-3">
        {listings.map((item) => (
          <ListingRow key={item.id} listing={item} />
        ))}
      </div>
    </PhoneShell>
  );
}
