"use client";

import { MasterBadge, MasterToggle } from "@/components/master-badge";
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
import { RoundBtn } from "@/components/ui";
import { ListingGrid } from "@/components/listing-grid";
import { UserFollow } from "@/components/user-follow";

const VISIBLE = new Set(["active", "promoted", "reserved"]);

type PublicProfile = {
  id: string;
  name: string;
  joinedYear: number;
  activeListings: number;
  phone?: string;
  email?: string;
};

function OwnerContacts({ phone, email }: { phone: string; email: string }) {
  const { t } = useApp();
  const [copied, setCopied] = useState(false);
  const phoneShown = phone.trim();
  const emailShown = email.trim();
  const copyEmail = async () => {
    if (!emailShown) return;
    try {
      await navigator.clipboard.writeText(emailShown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="mt-3 rounded-[14px] border border-line bg-white px-3 py-2.5" data-testid="owner-only-contacts">
      <div className="text-[11px] font-semibold text-muted">{t.ownerOnlyContacts}</div>
      {phoneShown ? (
        <a
          data-testid="owner-only-phone"
          href={`tel:${phoneShown.replace(/[^\d+]/g, "")}`}
          className="mt-1.5 block text-[14px] font-semibold text-ink"
        >
          <span className="font-normal text-muted">{t.phone}: </span>
          {phoneShown}
        </a>
      ) : (
        <div data-testid="owner-only-phone" className="mt-1.5 text-[14px] text-muted">
          {t.phone}: {t.ownerContactEmpty}
        </div>
      )}
      {emailShown ? (
        <button
          type="button"
          data-testid="owner-only-email"
          onClick={() => void copyEmail()}
          className="mt-1 block w-full text-left text-[14px] font-semibold text-ink"
        >
          <span className="font-normal text-muted">{t.email}: </span>
          {copied ? t.ownerContactCopied : emailShown}
        </button>
      ) : (
        <div data-testid="owner-only-email" className="mt-1 text-[14px] text-muted">
          {t.email}: {t.ownerContactEmpty}
        </div>
      )}
    </div>
  );
}

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
        ...(typeof res.data.phone === "string" && typeof res.data.email === "string"
          ? { phone: res.data.phone, email: res.data.email }
          : {}),
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
            <IconBack size={16} color="#18181B" />
          </RoundBtn>
          <div className="mt-5 flex items-center gap-3.5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full font-display text-[26px] font-bold text-screen"
              style={{ background: demo.color === "ink" ? "#18181B" : "#B0141A" }}
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
        <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <ListingGrid listings={listings} columns="browse" />
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
          <IconBack size={16} color="#18181B" />
        </RoundBtn>
        <div className="mt-5 flex items-center gap-3.5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-[26px] font-bold text-screen">
            {(profile.name || "?").slice(0, 1)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-[22px] font-bold text-ink">{profile.name}</span>
              <MasterBadge userId={id} />
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {t.onKonshu} {profile.joinedYear}
            </div>
          </div>
        </div>
        {typeof profile.phone === "string" && typeof profile.email === "string" ? (
          <OwnerContacts phone={profile.phone} email={profile.email} />
        ) : null}
        <UserFollow userId={id} mine={mine} locked={blocked} returnPath={`/owner/${id}`} />
        {blocked ? <BlockedAuthorNotice userId={id} /> : null}
        {mine ? null : <MasterToggle userId={id} />}
        {mine || blocked ? null : (
          <>
            <BlockAuthorButton userId={id} returnPath={`/owner/${id}`} />
            <ReportAuthorButton userId={id} returnPath={`/owner/${id}`} />
          </>
        )}
        {blocked ? null : <h2 className="mt-6 font-display text-[19px] font-bold text-ink">{t.ownerPublic}</h2>}
      </div>
      {blocked ? null : (
        <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <ListingGrid listings={listings} columns="browse" />
        </div>
      )}
    </PhoneShell>
  );
}
