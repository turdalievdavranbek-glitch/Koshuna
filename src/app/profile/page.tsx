"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mineListings } from "@/lib/listing-owner";
import { shopsOf, userHasShopBadge } from "@/lib/shops";
import { hasRole } from "@/lib/partners";
import { FEATURES } from "@/lib/features";
import { LANG_LABEL } from "@/lib/i18n";
import { starsForUser } from "@/lib/trust";
import { formatPhoneDisplay } from "@/lib/phone";
import { useApp } from "@/lib/store";
import { LANGS } from "@/lib/types";
import { Flag, IconVerified } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { LangSwitch } from "@/components/ui";
import { TrustStars } from "@/components/trust-stars";
import { SellerHub } from "@/components/seller-hub";
import { SellerEntryCards } from "@/components/seller-entry-cards";
import { MyListings } from "@/components/my-listings";
import { KonshuBridges } from "@/components/konshu-bridges";

const PHONE_LATER = "konshu.phoneLater";

export default function ProfilePage() {
  const { t, lang, user, logout, extraListings, allListings, setLang, notificationsOn, setNotificationsOn, shops, threads } =
    useApp();
  const router = useRouter();
  const [phoneLater, setPhoneLater] = useState(false);
  useEffect(() => {
    setPhoneLater(localStorage.getItem(PHONE_LATER) === "1");
  }, [user?.phone]);
  const stars = starsForUser(user);
  const mine = mineListings(allListings, extraListings, user, shops);
  const inboxCount = user ? threads.length : 0;

  if (!user) {
    return (
      <PhoneShell tab>
        <div className="flex flex-1 flex-col px-5 pt-4">
          <h1 className="font-display text-[28px] font-extrabold text-ink">{t.profile}</h1>
          <p className="mt-2 text-[15px] leading-[1.5] text-muted">{t.guestSideHint}</p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="shadow-btn mt-6 h-[54px] rounded-2xl bg-accent text-base font-semibold text-accent-on"
          >
            {t.loginCta}
          </button>
          <div className="mt-6 rounded-[18px] border border-line bg-white p-4">
            <KonshuBridges />
          </div>
          <div className="mt-8 rounded-[18px] border border-line bg-white p-4">
            <div className="mb-3 text-[13px] font-semibold text-ink">{t.language}</div>
            <LangSwitch />
          </div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tab>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">
        <div className="mt-3 flex items-center gap-3.5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-[26px] font-bold text-screen">
            {user.name.slice(0, 1)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-ink">{user.name}</span>
              {user.verified ? <IconVerified size={17} /> : null}
              {userHasShopBadge(shops, user) ? (
                <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-screen">{t.shopBadge}</span>
              ) : null}
              {hasRole(user, "realtor") ? (
                <span className="rounded-full bg-[#F3E0D9] px-2 py-0.5 text-[10px] font-bold text-accent-dark">{t.realtorBadge}</span>
              ) : null}
              {FEATURES.developers && hasRole(user, "developer") ? (
                <span className="rounded-full bg-[#E7F3ED] px-2 py-0.5 text-[10px] font-bold text-success">{t.developerBadge}</span>
              ) : null}
              {FEATURES.dealers && hasRole(user, "dealer") ? (
                <span className="rounded-full bg-[#F3E0D9] px-2 py-0.5 text-[10px] font-bold text-accent-dark">{t.dealerBadge}</span>
              ) : null}
            </div>
            {FEATURES.accountStars ? (
              <div className="mt-1">
                <TrustStars n={stars} size={15} />
              </div>
            ) : null}
            <div className="mt-0.5 text-[13px] text-muted">
              {[user.email, user.phone ? formatPhoneDisplay(user.phone) : ""].filter(Boolean).join(" · ")}
              {user.method ? ` · ${t.signedInVia} ${t.authMethods[user.method]}` : null}
            </div>
          </div>
          <button type="button" onClick={() => router.push("/profile/edit")} className="text-[13px] font-semibold text-accent">
            {t.edit}
          </button>
        </div>

        {!user.phone && !phoneLater ? (
          <div className="mt-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
            <p className="text-[14px] leading-[1.4] text-ink">{t.addPhoneCard}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => router.push("/profile/edit")} className="h-10 rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-on">
                {t.addPhone}
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(PHONE_LATER, "1");
                  setPhoneLater(true);
                }}
                className="h-10 rounded-xl border border-line px-4 text-[14px] font-semibold"
              >
                {t.later}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-[18px] rounded-[14px] border border-line bg-white p-3">
          <div className="font-display text-xl font-bold text-ink">{mine.length}</div>
          <div className="mt-0.5 text-[11px] text-muted">{t.listingsCount}</div>
        </div>

        {FEATURES.accountStars ? (
        <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.trustYours}</div>
          <div className="mt-2 flex items-center gap-2">
            <TrustStars n={stars} size={16} />
            <span className="text-[13px] font-semibold text-ink">
              {stars === 0 ? t.trustNone : stars === 1 ? t.trustSocial : stars === 3 ? t.trustPhoneCard : t.trustPhone}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.trustLead}</p>
          {user.method === "sms" && !user.cardLinked ? (
            <button
              type="button"
              onClick={() => router.push("/card")}
              className="shadow-btn mt-3 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
            >
              {t.cardAdd}
            </button>
          ) : null}
          {user.cardLinked ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{t.cardOn}</p> : null}
        </div>
        ) : null}

        <Link
          href="/messages"
          className="mt-3 flex items-center justify-between rounded-[18px] border border-line bg-white px-4 py-[15px] text-[15px] text-ink no-underline"
        >
          <span>
            {t.inbox}
            <span className="mt-0.5 block text-[12px] text-muted">{t.inboxPurchasesSales}</span>
          </span>
          <span className="text-[13px] font-semibold text-accent">{inboxCount}</span>
        </Link>

        <div className="mt-3">
          <SellerHub />
        </div>

        <div className="mt-6 flex items-baseline justify-between">
          <span className="font-display text-[19px] font-bold text-ink">{t.shopMine}</span>
          <button type="button" onClick={() => router.push("/shops")} className="text-[13px] font-semibold text-accent">
            {t.allN(shopsOf(shops, user).length)}
          </button>
        </div>
        <p className="mt-1 text-[13px] leading-[1.4] text-muted">{t.shopMineHint}</p>
        <div className="mt-3">
          <SellerEntryCards />
        </div>
        <button
          type="button"
          onClick={() => router.push("/shops/new")}
          className="mt-3 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
        >
          {t.shopNew}
        </button>

        <div className="mt-6 flex items-baseline justify-between">
          <span className="font-display text-[19px] font-bold text-ink">{t.myListings}</span>
          <button type="button" onClick={() => router.push("/selling")} className="text-[13px] font-semibold text-accent">
            {t.allN(mine.length)}
          </button>
        </div>
        <div className="mt-3">
          <MyListings limit={3} />
        </div>

        <div className="mt-6 rounded-[18px] border border-line bg-white p-4">
          <KonshuBridges />
        </div>

        <div className="mt-6 overflow-hidden rounded-[18px] border border-line bg-white">
          <Row
            label={t.language}
            value={
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as (typeof LANGS)[number])}
                className="bg-transparent text-sm text-muted"
              >
                {LANGS.map((code) => (
                  <option key={code} value={code}>
                    {LANG_LABEL[code].full}
                  </option>
                ))}
              </select>
            }
          />
          <Row label={t.privacyPolicy} value={<a href="/privacy" className="text-sm font-semibold text-accent">›</a>} />
          <Row label={t.termsOfUse} value={<a href="/terms" className="text-sm font-semibold text-accent">›</a>} />
          <Row
            label={t.countryRow}
            value={
              <span className="flex items-center gap-[7px] text-sm text-muted">
                <Flag />
                {t.country} · KGS
              </span>
            }
          />
          <Row
            label={t.notifications}
            value={
              <button type="button" onClick={() => setNotificationsOn(!notificationsOn)} className="text-sm text-muted">
                {notificationsOn ? t.on : "Off"}
              </button>
            }
          />
          <Row label={t.verification} value={<span className="text-[13px] font-bold text-success">{t.done}</span>} />
          <Row
            label={t.agency}
            value={
              <span className="rounded-md bg-accent-tint px-2 py-0.5 text-[11px] font-bold text-accent-dark">
                {t.try.toUpperCase()}
              </span>
            }
          />
          <Link href="/help" className="flex items-center justify-between border-t border-line-2 px-4 py-[15px] text-[15px] text-ink no-underline">
            {t.help}
            <span className="text-xs text-muted-2">›</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="w-full border-t border-line-2 px-4 py-[15px] text-left text-[15px] font-semibold text-accent"
          >
            {t.logout}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-line-2 px-4 py-[15px] text-[15px] text-ink first:border-t-0">
      {label}
      {value}
    </div>
  );
}
