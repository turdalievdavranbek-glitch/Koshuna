"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { hasRole } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Chip, Field, Input } from "@/components/ui";

export default function DealerCabinetPage() {
  const {
    t,
    lang,
    user,
    dealerProfiles,
    allListings,
    partnerLeads,
    telegramOutbox,
    setDealerTelegram,
    patchDealerProfile,
    updateListing,
    duplicateListingToDraft,
    setLeadStatus,
    setPendingPath,
  } = useApp();
  const router = useRouter();
  const profile = dealerProfiles.find((row) => row.userPhone === user?.phone);
  const cars = allListings.filter((row) => row.dealerId === profile?.id);
  const leads = partnerLeads.filter((row) => row.dealerId === profile?.id);
  const lastTg = telegramOutbox.find((row) => row.chatId === profile?.telegramChatId);
  const [chatId, setChatId] = useState(profile?.telegramChatId ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [hours, setHours] = useState(profile?.hours ?? "");

  if (!user) {
    setPendingPath("/dealer");
    router.push("/login");
    return null;
  }
  if (!hasRole(user, "dealer") || !profile) {
    return (
      <PhoneShell>
        <div className="p-5">
          <p className="text-muted">{t.applyDealer}</p>
          <button type="button" onClick={() => router.push("/partner?kind=dealer")} className="mt-4 text-[15px] font-semibold text-accent">
            {t.partnerApplyTitle}
          </button>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/selling")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="font-display text-[17px] font-bold text-ink">{t.dealerCabinet}</h1>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="rounded-[16px] border border-line bg-white p-3.5">
          <div className="text-[15px] font-semibold text-ink">{profile.companyName}</div>
          <div className="mt-2">
            <Field label={t.shopAddress}>
              <Input value={address} onChange={setAddress} />
            </Field>
          </div>
          <div className="mt-2">
            <Field label={t.dealerHours}>
              <Input value={hours} onChange={setHours} />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => patchDealerProfile({ address, hours })}
            className="mt-2 text-[13px] font-semibold text-accent"
          >
            {t.save}
          </button>
          <div className="mt-3">
            <Field label={t.telegramChatId}>
              <Input value={chatId} onChange={setChatId} />
            </Field>
          </div>
          <p className="mt-1 text-[12px] text-muted">{t.telegramHint}</p>
          <button type="button" onClick={() => setDealerTelegram(chatId)} className="mt-2 text-[13px] font-semibold text-accent">
            {t.save}
          </button>
          {lastTg ? (
            <p className="mt-2 text-[12px] text-muted">
              {t.lastTelegram}: {lastTg.text}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => router.push("/post")}
          className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent font-semibold text-accent-on"
        >
          {t.sellPostCta}
        </button>

        <div className="mt-6 font-display text-[19px] font-bold">{t.stockTitle}</div>
        {cars.map((row) => (
          <div key={row.id} className="mt-2 rounded-[14px] border border-line bg-white px-3.5 py-3">
            <button type="button" onClick={() => router.push(`/listing/${row.id}`)} className="w-full text-left">
              <div className="font-semibold text-ink">{listingTitle(row, lang)}</div>
              <div className="text-[12px] text-muted">
                {formatSom(row.price)} · {row.views} {t.views}
                {row.leadCount ? ` · ${t.leadsTitle} ${row.leadCount}` : ""}
              </div>
            </button>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["active", "reserved", "closed", "withdrawn"] as const).map((id) => (
                <Chip
                  key={id}
                  active={row.status === id || (id === "active" && row.status === "promoted")}
                  onClick={() =>
                    updateListing(row.id, {
                      status: id,
                      closedKind: id === "closed" ? "sold" : undefined,
                    })
                  }
                >
                  {id === "closed" ? t.closedSold : t.status[id]}
                </Chip>
              ))}
              <button
                type="button"
                onClick={() => {
                  duplicateListingToDraft(row);
                  router.push("/post");
                }}
                className="rounded-full border border-line px-3 py-1.5 text-[12px] font-bold"
              >
                {t.duplicateListing}
              </button>
            </div>
          </div>
        ))}

        <div className="mt-6 font-display text-[19px] font-bold">{t.leadsTitle}</div>
        {leads.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setLeadStatus(row.id, row.status === "new" ? "contacted" : "closed")}
            className="mt-2 w-full rounded-[14px] border border-line bg-white px-3.5 py-3 text-left"
          >
            <div className="font-semibold text-ink">
              {row.name} · {row.phone}
            </div>
            <div className="text-[12px] text-muted">
              {row.status} · {row.message}
            </div>
          </button>
        ))}
      </div>
    </PhoneShell>
  );
}
