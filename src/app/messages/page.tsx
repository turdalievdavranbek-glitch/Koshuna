"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ownerById } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { threadSide } from "@/lib/listing-owner";
import { useApp } from "@/lib/store";
import type { AppSide } from "@/lib/types";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Photo, RoundBtn } from "@/components/ui";

export default function MessagesPage() {
  const { t, lang, user, threads, setPendingPath, allListings, extraListings, side } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"all" | AppSide>(side);

  useEffect(() => {
    setTab(side);
  }, [side]);

  if (!user) {
    return (
      <PhoneShell>
        <div className="px-5 pt-2">
          <RoundBtn onClick={() => router.back()}>
            <IconBack size={16} color="#17140F" />
          </RoundBtn>
          <h1 className="mt-4 font-display text-[28px] font-extrabold text-ink">{t.inbox}</h1>
          <p className="mt-3 text-[15px] text-muted">{t.emptyInboxHint}</p>
          <button
            type="button"
            onClick={() => {
              setPendingPath("/messages");
              router.push("/login");
            }}
            className="shadow-btn mt-6 h-[54px] w-full rounded-2xl bg-accent font-semibold text-accent-on"
          >
            {t.loginCta}
          </button>
        </div>
      </PhoneShell>
    );
  }

  const withSide = threads.map((th) => ({ th, side: threadSide(th, extraListings, user) }));
  const visible = tab === "all" ? withSide : withSide.filter((row) => row.side === tab);
  const buyN = withSide.filter((row) => row.side === "buy").length;
  const sellN = withSide.filter((row) => row.side === "sell").length;

  return (
    <PhoneShell>
      <div className="flex items-center gap-3 px-5 pt-1">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="font-display text-[22px] font-bold text-ink">{t.inbox}</h1>
      </div>
      <div className="mt-3.5 flex gap-1 px-5">
        <div className="flex flex-1 rounded-[14px] bg-chip p-1">
          {(
            [
              ["all", t.inboxAll, threads.length],
              ["buy", t.inboxBuy, buyN],
              ["sell", t.inboxSell, sellN],
            ] as const
          ).map(([id, label, n]) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="flex-1 rounded-[11px] py-2 text-center text-[13px] font-semibold"
                style={{
                  background: on ? "#FFFFFF" : "transparent",
                  color: on ? "#17140F" : "#6E6558",
                  boxShadow: on ? "0 1px 3px rgba(23,20,15,.08)" : "none",
                }}
              >
                {label}
                {n ? ` · ${n}` : ""}
              </button>
            );
          })}
        </div>
      </div>
      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {visible.length === 0 ? (
          <p className="mt-8 text-center text-[15px] leading-[1.5] text-muted">
            {tab === "sell" ? t.emptyInboxSell : tab === "buy" ? t.emptyInboxBuy : t.emptyInbox}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map(({ th, side: rowSide }) => {
              const listing = allListings.find((item) => item.id === th.listingId);
              const owner = ownerById(th.ownerId);
              if (!listing) return null;
              const peer = rowSide === "sell" ? t.peerBuyer : owner?.name ?? listing.sellerName ?? "";
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => router.push(`/chat/${th.id}`)}
                  className="flex w-full items-center gap-3 rounded-[18px] border border-line bg-white p-3 text-left"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-[10px]">
                    <Photo src={listing.photos[0]} alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink">{listingTitle(listing, lang)}</span>
                      <span className="shrink-0 text-xs text-muted-2">{th.time}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          background: rowSide === "sell" ? "#F3E0D9" : "#E4EFE9",
                          color: rowSide === "sell" ? "#8E3423" : "#2A6B57",
                        }}
                      >
                        {rowSide === "sell" ? t.threadAsSell : t.threadAsBuy}
                      </span>
                      {peer ? <span className="truncate text-[12px] text-muted">{peer}</span> : null}
                    </div>
                    <div className="truncate text-[13px] text-muted">{th.preview || listingTitle(listing, lang)}</div>
                  </div>
                  {th.unread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" /> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
