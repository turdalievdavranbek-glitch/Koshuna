"use client";

import { useRouter } from "next/navigation";
import { mineListings } from "@/lib/listing-owner";
import { shopsOf } from "@/lib/shops";
import { useState } from "react";
import { hasRole, isAdminUser } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { MyListings } from "@/components/my-listings";
import { PhoneShell } from "@/components/shell";
import { SideSwitch } from "@/components/side-switch";
import { Field, Input } from "@/components/ui";

export default function SellingPage() {
  const { t, user, extraListings, allListings, shops, setPendingPath, setSide, realtorProfiles, dealerProfiles, partnerLeads, setRealtorTelegram, setDealerTelegram } =
    useApp();
  const router = useRouter();
  const mine = mineListings(allListings, extraListings, user, shops);
  const shopCount = shopsOf(shops, user).length;
  const realtor = realtorProfiles.find((row) => row.userPhone === user?.phone);
  const dealer = dealerProfiles.find((row) => row.userPhone === user?.phone);
  const [chatId, setChatId] = useState(realtor?.telegramChatId ?? "");
  const [dealerChat, setDealerChat] = useState(dealer?.telegramChatId ?? "");
  const listingLeads = partnerLeads.filter((row) => row.source === "listing" && row.realtorPhone === user?.phone);
  const dealerLeads = partnerLeads.filter((row) => row.dealerId === dealer?.id);

  if (!user) {
    return (
      <PhoneShell tab>
        <div className="flex flex-1 flex-col px-5 pt-4">
          <h1 className="font-display text-[28px] font-extrabold text-ink">{t.myListings}</h1>
          <p className="mt-2 text-[15px] leading-[1.5] text-muted">{t.guestSideHint}</p>
          <button
            type="button"
            onClick={() => {
              setPendingPath("/selling");
              router.push("/login");
            }}
            className="shadow-btn mt-6 h-[54px] rounded-2xl bg-accent text-base font-semibold text-accent-on"
          >
            {t.loginCta}
          </button>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tab>
      <div className="px-5 pt-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.myListings}</h1>
          <span className="text-[13px] font-semibold text-muted">{t.nListings(mine.length)}</span>
        </div>
        <div className="mt-3.5">
          <SideSwitch compact />
        </div>
      </div>
      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <button
          type="button"
          onClick={() => {
            setSide("sell");
            router.push("/post");
          }}
          className="shadow-btn h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
        >
          {t.sellPostCta}
        </button>
        <button
          type="button"
          onClick={() => router.push("/shops")}
          className="mt-2.5 flex h-12 w-full items-center justify-between rounded-2xl border border-line bg-white px-4 text-left"
        >
          <span className="text-[15px] font-semibold text-ink">{t.shopMine}</span>
          <span className="text-[13px] font-semibold text-accent">{t.allN(shopCount)}</span>
        </button>
        <button
          type="button"
          onClick={() => router.push("/partner?kind=realtor")}
          className="mt-2.5 flex h-12 w-full items-center rounded-2xl border border-line bg-white px-4 text-left text-[15px] font-semibold text-ink"
        >
          {t.applyRealtor}
        </button>
        <button
          type="button"
          onClick={() => router.push("/partner?kind=developer")}
          className="mt-2.5 flex h-12 w-full items-center rounded-2xl border border-line bg-white px-4 text-left text-[15px] font-semibold text-ink"
        >
          {t.applyDeveloper}
        </button>
        <button
          type="button"
          onClick={() => router.push("/partner?kind=dealer")}
          className="mt-2.5 flex h-12 w-full items-center rounded-2xl border border-line bg-white px-4 text-left text-[15px] font-semibold text-ink"
        >
          {t.applyDealer}
        </button>
        {user && hasRole(user, "developer") ? (
          <button
            type="button"
            onClick={() => router.push("/developer")}
            className="mt-2.5 flex h-12 w-full items-center rounded-2xl border border-line bg-white px-4 text-left text-[15px] font-semibold text-ink"
          >
            {t.developerCabinet}
          </button>
        ) : null}
        {user && hasRole(user, "dealer") ? (
          <button
            type="button"
            onClick={() => router.push("/dealer")}
            className="mt-2.5 flex h-12 w-full items-center rounded-2xl border border-line bg-white px-4 text-left text-[15px] font-semibold text-ink"
          >
            {t.dealerCabinet}
          </button>
        ) : null}
        {user && isAdminUser(user) ? (
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mt-2.5 flex h-12 w-full items-center rounded-2xl border border-line bg-white px-4 text-left text-[15px] font-semibold text-ink"
          >
            {t.adminTitle}
          </button>
        ) : null}
        {user && hasRole(user, "realtor") ? (
          <div className="mt-2.5 rounded-[16px] border border-line bg-white p-3.5">
            <div className="text-[13px] font-bold text-accent-dark">{t.realtorBadge}</div>
            <div className="mt-2">
              <Field label={t.telegramChatId}>
                <Input value={chatId} onChange={setChatId} />
              </Field>
            </div>
            <p className="mt-1 text-[12px] text-muted">{t.telegramHint}</p>
            <button
              type="button"
              onClick={() => setRealtorTelegram(chatId)}
              className="mt-2 text-[13px] font-semibold text-accent"
            >
              {t.save}
            </button>
            {listingLeads.length ? (
              <div className="mt-3">
                <div className="text-[13px] font-semibold text-ink">{t.leadsTitle}</div>
                {listingLeads.slice(0, 6).map((row) => (
                  <div key={row.id} className="mt-1.5 text-[13px] text-muted">
                    {row.name} · {row.phone}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {user && hasRole(user, "dealer") ? (
          <div className="mt-2.5 rounded-[16px] border border-line bg-white p-3.5">
            <div className="text-[13px] font-bold text-accent-dark">{t.dealerBadge}</div>
            <div className="mt-2">
              <Field label={t.telegramChatId}>
                <Input value={dealerChat} onChange={setDealerChat} />
              </Field>
            </div>
            <p className="mt-1 text-[12px] text-muted">{t.telegramHint}</p>
            <button
              type="button"
              onClick={() => setDealerTelegram(dealerChat)}
              className="mt-2 text-[13px] font-semibold text-accent"
            >
              {t.save}
            </button>
            {dealerLeads.length ? (
              <div className="mt-3">
                <div className="text-[13px] font-semibold text-ink">{t.leadsTitle}</div>
                {dealerLeads.slice(0, 6).map((row) => (
                  <div key={row.id} className="mt-1.5 text-[13px] text-muted">
                    {row.name} · {row.phone}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4">
          <MyListings />
        </div>
      </div>
    </PhoneShell>
  );
}
