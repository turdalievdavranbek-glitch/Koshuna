"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MY_LISTING_IDS, formatSom, listingById } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { Flag, IconVerified } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { LangSwitch, Photo } from "@/components/ui";

export default function ProfilePage() {
  const { t, lang, user, logout, extraListings, setLang, notificationsOn, setNotificationsOn } = useApp();
  const router = useRouter();
  const mine = [
    ...extraListings,
    ...MY_LISTING_IDS.map((id) => listingById(id)).filter(Boolean),
  ];

  if (!user) {
    return (
      <PhoneShell tab>
        <div className="flex flex-1 flex-col px-5 pt-4">
          <h1 className="font-display text-[28px] font-extrabold text-ink">{t.profile}</h1>
          <p className="mt-2 text-[15px] text-muted">{t.guestHint}</p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="shadow-btn mt-6 h-[54px] rounded-2xl bg-accent text-base font-semibold text-accent-on"
          >
            {t.loginCta}
          </button>
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
        <div className="flex items-center gap-3.5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-[26px] font-bold text-screen">
            {user.name.slice(0, 1)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-ink">{user.name}</span>
              {user.verified ? <IconVerified size={17} /> : null}
            </div>
            <div className="mt-0.5 text-[13px] text-muted">
              {user.phone} · с {user.joinedYear} года
            </div>
          </div>
          <button type="button" className="text-[13px] font-semibold text-accent">
            {t.edit}
          </button>
        </div>

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

        <div className="mt-6 flex items-baseline justify-between">
          <span className="font-display text-[19px] font-bold text-ink">{t.myListings}</span>
          <span className="text-[13px] font-semibold text-accent">{t.allN(mine.length)}</span>
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {mine.map((item) =>
            item ? (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(`/listing/${item.id}`)}
                className="flex overflow-hidden rounded-[18px] border border-line bg-white text-left"
              >
                <div className="h-24 w-24 shrink-0">
                  <Photo src={item.photos[0]} alt="" />
                </div>
                <div className="flex-1 px-3.5 py-3">
                  <div className="flex gap-1.5">
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background:
                          item.status === "promoted"
                            ? "#F3E0D9"
                            : item.status === "draft"
                              ? "#EFE8DB"
                              : "#E4EFE9",
                        color:
                          item.status === "promoted"
                            ? "#8E3423"
                            : item.status === "draft"
                              ? "#6E6558"
                              : "#2A6B57",
                      }}
                    >
                      {t.status[item.status].toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm leading-[1.3] text-ink">{listingTitle(item, lang)}</div>
                  <div className="mt-1.5 text-xs text-muted-2">
                    {item.status === "draft"
                      ? `${t.cities[item.city]} · ${formatSom(item.price)} KGS`
                      : `${item.views} ${t.views} · ${item.favCount} ${t.fav.toLowerCase()}`}
                  </div>
                </div>
              </button>
            ) : null,
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-[18px] border border-line bg-white">
          <Row
            label={t.language}
            value={
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as "ru" | "ky" | "en")}
                className="bg-transparent text-sm text-muted"
              >
                <option value="ru">{t.langName.ru}</option>
                <option value="ky">{t.langName.ky}</option>
                <option value="en">{t.langName.en}</option>
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
          <Link href="/messages" className="flex items-center justify-between border-t border-line-2 px-4 py-[15px] text-[15px] text-ink no-underline">
            {t.inbox}
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
