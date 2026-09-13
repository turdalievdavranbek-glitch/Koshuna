"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { mineListings, threadSide } from "@/lib/listing-owner";
import { shopsOf, userHasShopBadge } from "@/lib/shops";
import { hasRole } from "@/lib/partners";
import { starsForUser } from "@/lib/trust";
import { useApp } from "@/lib/store";
import { LANGS } from "@/lib/types";
import { Flag, IconVerified } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { LangSwitch } from "@/components/ui";
import { TrustStars } from "@/components/trust-stars";
import { SellerHub } from "@/components/seller-hub";
import { SellerEntryCards } from "@/components/seller-entry-cards";
import { SideSwitch } from "@/components/side-switch";
import { MyListings } from "@/components/my-listings";
import { KonshuBridges } from "@/components/konshu-bridges";

export default function ProfilePage() {
  const { t, lang, user, logout, extraListings, allListings, setLang, notificationsOn, setNotificationsOn, shops, side, threads } =
    useApp();
  const router = useRouter();
  const stars = starsForUser(user);
  const selling = side === "sell";
  const mine = mineListings(allListings, extraListings, user, shops);
  const inboxCount = user
    ? threads.filter((th) => (selling ? threadSide(th, extraListings, user) === "sell" : threadSide(th, extraListings, user) === "buy")).length
    : 0;

  if (!user) {
    return (
      <PhoneShell tab>
        <div className="flex flex-1 flex-col px-5 pt-4">
          <h1 className="font-display text-[28px] font-extrabold text-ink">{t.profile}</h1>
          <p className="mt-2 text-[15px] leading-[1.5] text-muted">{t.guestSideHint}</p>
          <div className="mt-5">
            <SideSwitch />
          </div>
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
        <SideSwitch />

        <div className="mt-5 flex items-center gap-3.5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-[26px] font-bold text-screen">
            {user.name.slice(0, 1)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-ink">{user.name}</span>
              {user.verified ? <IconVerified size={17} /> : null}
              {selling && userHasShopBadge(shops, user) ? (
                <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-screen">{t.shopBadge}</span>
              ) : null}
              {hasRole(user, "realtor") ? (
                <span className="rounded-full bg-[#F3E0D9] px-2 py-0.5 text-[10px] font-bold text-accent-dark">{t.realtorBadge}</span>
              ) : null}
              {hasRole(user, "developer") ? (
                <span className="rounded-full bg-[#E7F3ED] px-2 py-0.5 text-[10px] font-bold text-success">{t.developerBadge}</span>
              ) : null}
              {hasRole(user, "dealer") ? (
                <span className="rounded-full bg-[#F3E0D9] px-2 py-0.5 text-[10px] font-bold text-accent-dark">{t.dealerBadge}</span>
              ) : null}
            </div>
            <div className="mt-1">
              <TrustStars n={stars} size={15} />
            </div>
            <div className="mt-0.5 text-[13px] text-muted">
              {user.email || user.phone}
              {user.method ? ` · ${t.signedInVia} ${t.authMethods[user.method]}` : null}
            </div>
          </div>
          <button type="button" className="text-[13px] font-semibold text-accent">
            {t.edit}
          </button>
        </div>

        {selling ? (
          <div className="mt-[18px] grid grid-cols-3 gap-2">
            {[
              [String(mine.length), t.listingsCount],
              ["1 284", t.views],
              ["4,9", t.rating],
            ].map(([v, l]) => (
              <div key={l} className="rounded-[14px] border border-line bg-white p-3">
                <div className="font-display text-xl font-bold text-ink">{v}</div>
                <div className="mt-0.5 text-[11px] text-muted">{l}</div>
              </div>
            ))}
          </div>
        ) : null}

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

        <Link
          href="/messages"
          className="mt-3 flex items-center justify-between rounded-[18px] border border-line bg-white px-4 py-[15px] text-[15px] text-ink no-underline"
        >
          <span>
            {t.inbox}
            <span className="mt-0.5 block text-[12px] text-muted">{selling ? t.inboxSell : t.inboxBuy}</span>
          </span>
          <span className="text-[13px] font-semibold text-accent">{inboxCount}</span>
        </Link>

        {selling ? (
          <>
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
              onClick={() => router.push("/shops/quick")}
              className="mt-3 h-12 w-full rounded-2xl border border-line bg-white text-[15px] font-semibold"
            >
              {t.shopQuickCta}
            </button>
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
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/favorites")}
            className="mt-3 flex h-[54px] w-full items-center justify-between rounded-[18px] border border-line bg-white px-4 text-left"
          >
            <span className="text-[15px] font-semibold text-ink">{t.fav}</span>
            <span className="text-[13px] font-semibold text-accent">›</span>
          </button>
        )}

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
                    {t.langName[code]}
                  </option>
                ))}
              </select>
            }
          />
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
