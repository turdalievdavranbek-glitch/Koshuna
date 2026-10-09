"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { ownerById } from "@/lib/data";
import { isDbUserId } from "@/lib/phone";
import { useApp } from "@/lib/store";
import { ScreenBack } from "@/components/back-button";
import { BlockAuthorButton, BlockedAuthorNotice, ReportAuthorButton } from "@/components/block-author";
import { IconBack, IconVerified } from "@/components/icons";
import { goBack } from "@/lib/go-back";
import { PhoneShell } from "@/components/shell";
import { ListingRow, RoundBtn } from "@/components/ui";

const VISIBLE = new Set(["active", "promoted", "reserved"]);

type PublicProfile = { id: string; name: string; joinedYear: number; activeListings: number };

export default function OwnerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, allListings, user, isBlocked } = useApp();
  const demo = ownerById(id);
  const db = isDbUserId(id);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!db) return;
    let cancel = false;
    void api<PublicProfile>(`/api/users/${encodeURIComponent(id)}`).then((res) => {
      if (cancel) return;
      if (!res.ok || !res.data?.id) {
        setMissing(true);
        setProfile(null);
        return;
      }
      setProfile({
        id: res.data.id,
        name: res.data.name,
        joinedYear: res.data.joinedYear,
        activeListings: res.data.activeListings,
      });
    });
    return () => {
      cancel = true;
    };
  }, [db, id]);

  if (demo) {
    const listings = allListings.filter((item) => item.ownerId === id && item.status !== "draft");
    return (
      <PhoneShell>
        <div className="px-5 pt-1">
          <RoundBtn label={t.backLeave} onClick={() => goBack(router, "/")}>
            <IconBack size={16} color="#17140F" />
          </RoundBtn>
          <div className="mt-5 flex items-center gap-3.5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full font-display text-[26px] font-bold text-screen"
              style={{ background: demo.color === "ink" ? "#17140F" : "#8E3423" }}
            >
              {demo.initial}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[22px] font-bold text-ink">{demo.name}</span>
                {demo.verified ? <IconVerified size={17} /> : null}
              </div>
              <div className="mt-1 text-[13px] text-muted">
                {t.onKoshuna} {demo.since}
                {demo.rating ? ` · ${t.rating} ${demo.rating}` : ""}
              </div>
            </div>
          </div>
          <h2 className="mt-6 font-display text-[19px] font-bold text-ink">{t.ownerPublic}</h2>
        </div>
        <div className="sc mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
          {listings.map((item) => (
            <ListingRow key={item.id} listing={item} />
          ))}
        </div>
      </PhoneShell>
    );
  }

  if (!db || missing) {
    return (
      <PhoneShell>
        <div className="p-6">
          <ScreenBack fallback="/" />
          <p className="mt-4">{t.empty}</p>
        </div>
      </PhoneShell>
    );
  }

  if (!profile) return null;

  const listings = allListings.filter((item) => item.ownerId === id && !item.underReview && VISIBLE.has(item.status));
  const mine = user?.id === id;
  const blocked = isBlocked(id);

  return (
    <PhoneShell>
      <div className="px-5 pt-1">
        <RoundBtn label={t.backLeave} onClick={() => goBack(router, "/")}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <div className="mt-5 flex items-center gap-3.5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-[26px] font-bold text-screen">
            {(profile.name || "?").slice(0, 1)}
          </div>
          <div>
            <div className="font-display text-[22px] font-bold text-ink">{profile.name}</div>
            <div className="mt-1 text-[13px] text-muted">
              {t.onKonshu} {profile.joinedYear}
            </div>
          </div>
        </div>
        {blocked ? <BlockedAuthorNotice userId={id} /> : null}
        {mine || blocked ? null : (
          <>
            <BlockAuthorButton userId={id} returnPath={`/owner/${id}`} />
            <ReportAuthorButton userId={id} returnPath={`/owner/${id}`} />
          </>
        )}
        {blocked ? null : <h2 className="mt-6 font-display text-[19px] font-bold text-ink">{t.ownerPublic}</h2>}
      </div>
      {blocked ? null : (
        <div className="sc mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
          {listings.map((item) => (
            <ListingRow key={item.id} listing={item} />
          ))}
        </div>
      )}
    </PhoneShell>
  );
}
