"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mineListings } from "@/lib/listing-owner";
import { shopsOf, userHasShopBadge } from "@/lib/shops";
import { hasRole, isAdminUser } from "@/lib/partners";
import { FEATURES } from "@/lib/features";
import { helpWhatsAppUrl } from "@/lib/help";
import { LANG_LABEL } from "@/lib/i18n";
import { starsForUser } from "@/lib/trust";
import { formatPhoneDisplay } from "@/lib/phone";
import { api } from "@/lib/api/client";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useApp } from "@/lib/store";
import { LANGS, type AuthMethod } from "@/lib/types";
import { BrandGoogle, BrandTelegram } from "@/components/auth-brands";
import { Flag, IconVerified } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { LangSwitch } from "@/components/ui";
import { TrustStars } from "@/components/trust-stars";
import { PointList } from "@/components/point-rows";
import { MyListings } from "@/components/my-listings";
import { HoldInbox } from "@/components/hold-inbox";
import { IncomingBuyRequests, MyBuyRequests } from "@/components/buy-requests";
import { SubscriptionList } from "@/components/subscription-list";

const PHONE_LATER = "konshu.phoneLater";

function MethodIcon({ method }: { method: AuthMethod }) {
  if (method === "google") return <BrandGoogle size={14} />;
  if (method === "telegram") return <BrandTelegram size={14} />;
  return null;
}

export default function ProfilePage() {
  const { t, lang, user, logout, extraListings, allListings, setLang, notificationsOn, setNotificationsOn, shops } = useApp();
  const router = useRouter();
  const [phoneLater, setPhoneLater] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    setPhoneLater(localStorage.getItem(PHONE_LATER) === "1");
  }, [user?.phone]);
  useEffect(() => {
    if (!user?.id) {
      setChatUnread(0);
      return;
    }
    let cancel = false;
    const pull = () => {
      void api<{ unread?: number }>("/api/me/threads").then((res) => {
        if (!cancel && res.ok) setChatUnread(res.data?.unread ?? 0);
      });
    };
    pull();
    const timer = window.setInterval(pull, 8000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [user?.id]);
  const stars = starsForUser(user);
  const mine = mineListings(allListings, extraListings, user, shops);
  const points = shopsOf(shops, user);

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
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-[22px] font-bold tracking-[-0.01em] text-ink">{user.name}</span>
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
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] text-muted">
              <span className="min-w-0 break-all">{[user.email, user.phone ? formatPhoneDisplay(user.phone) : ""].filter(Boolean).join(" · ")}</span>
              {user.method ? (
                <span className="inline-flex items-center gap-1">
                  <MethodIcon method={user.method} />
                  {t.signedInVia} {t.authMethods[user.method]}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/profile/edit")}
            className="shrink-0 self-start whitespace-nowrap rounded-xl border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-accent"
          >
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

        <button
          type="button"
          data-testid="cabinet-messages"
          onClick={() => router.push("/messages")}
          className="mt-4 flex w-full items-center justify-between rounded-[18px] border border-line bg-white px-4 py-3.5 text-left"
        >
          <span className="text-[15px] font-semibold text-ink">{t.inbox}</span>
          <span className="flex items-center gap-2">
            {chatUnread > 0 ? (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E0242B] px-1.5 text-[12px] font-bold text-white">
                {chatUnread > 9 ? "9+" : chatUnread}
              </span>
            ) : null}
            <span className="text-[18px] text-muted-2">›</span>
          </span>
        </button>

        {isAdminUser(user) ? (
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mt-2.5 flex w-full items-center justify-between rounded-[18px] border border-line bg-white px-4 py-3.5 text-left"
          >
            <span className="text-[15px] font-semibold text-ink">{t.adminTitle}</span>
            <span className="text-[18px] text-muted-2">›</span>
          </button>
        ) : null}

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

        <div className="mt-6 flex items-baseline justify-between">
          <span className="font-display text-[19px] font-bold text-ink">{t.myPoints}</span>
          <span className="text-[13px] font-semibold text-muted">{points.length}</span>
        </div>
        <p className="mt-1 text-[13px] leading-[1.4] text-muted">{t.shopMineHint}</p>
        {points.length ? (
          <div className="mt-3">
            <PointList shops={points} actions open="point" />
          </div>
        ) : (
          <p className="mt-3 text-[14px] leading-[1.45] text-muted">{t.shopEmptyMine}</p>
        )}
        <button
          type="button"
          onClick={() => router.push("/shops/new")}
          className="mt-3 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
        >
          {t.shopNew}
        </button>

        <div className="mt-6">
          <MyBuyRequests />
        </div>

        {points.length ? (
          <div className="mt-6">
            <IncomingBuyRequests />
          </div>
        ) : null}

        <div className="mt-6">
          <HoldInbox />
        </div>

        <div className="mt-6 flex items-baseline justify-between">
          <span className="font-display text-[19px] font-bold text-ink">{t.myListings}</span>
          <span className="text-[13px] font-semibold text-muted">{mine.length}</span>
        </div>
        <div className="mt-3" data-testid="cabinet-listings">
          <MyListings />
        </div>

        <div className="mt-6">
          <span className="font-display text-[19px] font-bold text-ink">{t.mySubscriptions}</span>
        </div>
        <div className="mt-3">
          <SubscriptionList />
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
          <a
            href={helpWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="help-whatsapp"
            className="flex items-center justify-between border-t border-line-2 px-4 py-[15px] text-[15px] text-ink no-underline"
          >
            {t.helpRow}
            <span className="text-xs text-muted-2">›</span>
          </a>
          <button
            type="button"
            data-testid="delete-account"
            onClick={() => {
              setDeleteError("");
              setDeleteOpen(true);
            }}
            className="w-full border-t border-line-2 px-4 py-[15px] text-left text-[15px] font-semibold text-accent"
          >
            {t.deleteAccount}
          </button>
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
      <AccountDeleteDialog
        open={deleteOpen}
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          if (deleteBusy) return;
          setDeleteOpen(false);
        }}
        onConfirm={() => {
          setDeleteBusy(true);
          setDeleteError("");
          void api("/api/me/delete", { method: "POST", json: { source: "app" } }).then((res) => {
            setDeleteBusy(false);
            if (!res.ok) {
              setDeleteError(t.deleteAccountError);
              return;
            }
            setDeleteOpen(false);
            logout();
            router.push("/");
          });
        }}
      />
    </PhoneShell>
  );
}

function AccountDeleteDialog({
  open,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useApp();
  useEffect(() => {
    if (!open) return;
    pushOverlay("account-delete", onCancel);
    return () => removeOverlay("account-delete");
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[rgba(23,20,15,.45)] desk:items-center desk:justify-center desk:p-4" onClick={onCancel} data-testid="delete-account-dialog">
      <div className="w-full rounded-t-[24px] bg-white px-5 pb-8 pt-5 desk:max-w-[430px] desk:rounded-[24px]" onClick={(event) => event.stopPropagation()}>
        <div className="font-display text-[20px] font-bold text-ink">{t.deleteAccountAsk}</div>
        <p className="mt-2 text-[14px] leading-[1.45] text-muted">{t.deleteAccountText}</p>
        {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
        <button
          type="button"
          data-testid="delete-account-confirm"
          disabled={busy}
          onClick={onConfirm}
          className="shadow-btn mt-4 h-[52px] w-full rounded-2xl bg-accent text-[16px] font-semibold text-accent-on disabled:opacity-60"
        >
          {t.deleteAccountDo}
        </button>
        <button type="button" data-testid="delete-account-cancel" onClick={onCancel} className="mt-2 h-[48px] w-full text-[15px] font-semibold text-muted">
          {t.deleteAccountCancel}
        </button>
      </div>
    </div>
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
